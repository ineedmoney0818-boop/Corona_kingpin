-- Reelplain backend additions: quotes, storage, atomic generation/charge, worker queue,
-- reaper, rate limits, dead-letter log, and columns the app needs.

-- ---------------------------------------------------------------- columns
alter table profiles add column stripe_customer_id text unique;
alter table assets add column file_name text not null default '' check (length(file_name) <= 200);
alter table renders add column progress real not null default 0 check (progress between 0 and 1);
alter table messages add column generation_id uuid references generations(id) on delete set null;
create index on messages (generation_id);
alter table subscriptions add column reminder_sent_for timestamptz;   -- period end the reminder was sent for

-- ---------------------------------------------------------------- quotes
-- The UI only shows a cost that came from a quote; the charge uses the quote's number.
create table quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind text not null check (kind in ('new-reel','new-carousel','re-render')),
  credits integer not null check (credits >= 0),
  watermark boolean not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index on quotes (user_id, created_at desc);
alter table quotes enable row level security;
create policy own_read on quotes for select using (user_id = auth.uid());

-- ---------------------------------------------------------------- storage: private bucket, owner-only folders
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', false, 524288000,
        array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm'])
on conflict (id) do nothing;

create policy "media: owner reads own folder" on storage.objects for select to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media: owner uploads to own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media: owner deletes own files" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------- atomic generation + render + charge
-- One transaction: replay check, quote check, insert generation and render, spend credits.
-- If anything raises (insufficient credits included), nothing is written.
create or replace function create_generation_and_render(
  p_user uuid, p_chat uuid, p_message uuid, p_kind text, p_plan jsonb, p_quote uuid, p_key text
) returns table (generation_id uuid, render_id uuid, replayed boolean)
language plpgsql security definer set search_path = public as $$
declare q quotes; prior renders; g uuid; r uuid; want text;
begin
  select * into prior from renders where user_id = p_user and idempotency_key = p_key;
  if prior.id is not null then
    return query select prior.generation_id, prior.id, true; return;
  end if;
  select * into q from quotes where id = p_quote and user_id = p_user;
  if q.id is null then raise exception 'quote_not_found' using errcode = 'P0002'; end if;
  if q.expires_at < now() then raise exception 'quote_expired' using errcode = 'P0001'; end if;
  if p_kind = 'reel' then want := 'new-reel'; else want := 'new-carousel'; end if;
  if q.kind <> want then raise exception 'quote_expired' using errcode = 'P0001'; end if;
  if p_chat is not null and not exists (select 1 from chats where id = p_chat and user_id = p_user) then
    raise exception 'chat_not_found' using errcode = 'P0002';
  end if;
  insert into generations (user_id, chat_id, message_id, kind, aspect, plan, caption)
  values (p_user, p_chat, p_message, p_kind, p_plan->>'aspect', p_plan, coalesce(p_plan->>'caption', ''))
  returning id into g;
  begin
    insert into renders (generation_id, user_id, plan_version, credits_quoted, watermark, idempotency_key)
    values (g, p_user, 1, q.credits, q.watermark, p_key)
    returning id into r;
  exception when unique_violation then
    -- A simultaneous request with the same key won the race: undo our generation, return theirs.
    delete from generations where id = g;
    select * into prior from renders where user_id = p_user and idempotency_key = p_key;
    return query select prior.generation_id, prior.id, true; return;
  end;
  perform spend_credits(r);
  return query select g, r, false;
end $$;

create or replace function create_rerender(p_user uuid, p_generation uuid, p_quote uuid, p_key text)
returns table (render_id uuid, replayed boolean)
language plpgsql security definer set search_path = public as $$
declare q quotes; prior renders; gen generations; r uuid;
begin
  select * into prior from renders where user_id = p_user and idempotency_key = p_key;
  if prior.id is not null then return query select prior.id, true; return; end if;
  select * into gen from generations where id = p_generation and user_id = p_user;
  if gen.id is null then raise exception 'generation_not_found' using errcode = 'P0002'; end if;
  select * into q from quotes where id = p_quote and user_id = p_user and kind = 're-render';
  if q.id is null or q.expires_at < now() then raise exception 'quote_expired' using errcode = 'P0001'; end if;
  begin
    insert into renders (generation_id, user_id, plan_version, credits_quoted, watermark, idempotency_key)
    values (gen.id, p_user, gen.plan_version, q.credits, q.watermark, p_key) returning id into r;
  exception when unique_violation then
    select * into prior from renders where user_id = p_user and idempotency_key = p_key;
    return query select prior.id, true; return;
  end;
  perform spend_credits(r);
  return query select r, false;
end $$;

-- ---------------------------------------------------------------- worker queue
-- Claims the oldest queued render. SKIP LOCKED: two workers never take the same job.
create or replace function claim_next_render() returns setof renders
language plpgsql security definer set search_path = public as $$
begin
  return query
  update renders set status = 'rendering', started_at = now(), attempts = attempts + 1, progress = 0
   where id = (select id from renders where status = 'queued' order by created_at
               for update skip locked limit 1)
  returning *;
end $$;

-- Ends a render as failed and refunds it, in one transaction. Idempotent.
create or replace function fail_render(p_render uuid, p_code text, p_detail text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update renders set status = 'failed', error_code = p_code, error_detail = left(p_detail, 500), finished_at = now()
   where id = p_render and status in ('queued', 'rendering');
  perform refund_render(p_render, 'refund: ' || p_code);
end $$;

-- Renders stuck longer than the limit (worker died, deploy restarted) fail and refund.
create or replace function reap_stuck_renders(p_older_than interval) returns integer
language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  for r in select id from renders
            where (status = 'rendering' and started_at < now() - p_older_than)
               or (status = 'queued' and created_at < now() - p_older_than * 3)
            for update skip locked loop
    perform fail_render(r.id, 'abandoned', 'Stopped without finishing.');
    n := n + 1;
  end loop;
  return n;
end $$;

-- ---------------------------------------------------------------- rate limits
create table rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);
alter table rate_limits enable row level security;   -- no policies: server only

-- Returns true when the call is allowed. Fixed window per key.
create or replace function hit_rate_limit(p_key text, p_window_seconds int, p_max int) returns boolean
language plpgsql security definer set search_path = public as $$
declare w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds); n int;
begin
  insert into rate_limits (key, window_start, hits) values (p_key, w, 1)
  on conflict (key, window_start) do update set hits = rate_limits.hits + 1
  returning hits into n;
  delete from rate_limits where window_start < now() - interval '1 day' and random() < 0.01;
  return n <= p_max;
end $$;

-- ---------------------------------------------------------------- dead-letter log for jobs
create table job_failures (
  id uuid primary key default gen_random_uuid(),
  job text not null,
  ref text,
  error text not null,
  attempts integer not null default 1,
  created_at timestamptz not null default now()
);
create index on job_failures (job, created_at desc);
alter table job_failures enable row level security;   -- no policies: server only

-- ---------------------------------------------------------------- grants: server-only functions
do $$
declare f text;
begin
  foreach f in array array[
    'create_generation_and_render(uuid,uuid,uuid,text,jsonb,uuid,text)', 'create_rerender(uuid,uuid,uuid,text)',
    'claim_next_render()', 'fail_render(uuid,text,text)', 'reap_stuck_renders(interval)', 'hit_rate_limit(text,int,int)'] loop
    execute format('revoke all on function %s from public', f);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke all on function %s from anon, authenticated', f);
      execute format('grant execute on function %s to service_role', f);
    end if;
  end loop;
end $$;
