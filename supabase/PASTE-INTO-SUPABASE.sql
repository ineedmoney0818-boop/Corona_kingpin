-- Paste ALL of this into Supabase > SQL Editor > New query, then click Run.
-- It adds the rest of the app's database (part 2 and 3).

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

-- Ideas chat (F04): chat-only answers, quoted and charged like everything else, without a render.

alter table quotes drop constraint quotes_kind_check;
alter table quotes add constraint quotes_kind_check check (kind in ('new-reel','new-carousel','re-render','ideas'));

-- Structured reply content (idea cards) and per-message idempotency.
alter table messages add column ideas jsonb;
alter table messages add column idempotency_key text;
create unique index one_message_per_idempotency_key on messages (user_id, idempotency_key) where idempotency_key is not null;

-- Ledger rows can belong to a message (ideas) instead of a render.
alter table credit_ledger add column message_id uuid references messages(id) on delete set null;
create index on credit_ledger (message_id);
create unique index one_spend_per_message on credit_ledger (message_id) where kind = 'spend' and message_id is not null;

-- One transaction: replay check, quote check, chat (new or owned), both messages, charge.
-- Called after the ideas were produced, so a failed AI call never charges.
create or replace function create_ideas_reply(
  p_user uuid, p_chat uuid, p_title text, p_prompt text, p_reply text, p_ideas jsonb, p_quote uuid, p_key text
) returns table (chat_id uuid, message_id uuid, replayed boolean)
language plpgsql security definer set search_path = public as $$
declare q quotes; prior messages; c uuid; um uuid; am uuid; a credit_accounts; from_plan int; from_topup int;
begin
  select * into prior from messages where user_id = p_user and idempotency_key = p_key;
  if prior.id is not null then
    return query select prior.chat_id, (select m.id from messages m where m.chat_id = prior.chat_id and m.role = 'assistant' and m.created_at >= prior.created_at order by m.created_at limit 1), true;
    return;
  end if;
  select * into q from quotes where id = p_quote and user_id = p_user and kind = 'ideas';
  if q.id is null or q.expires_at < now() then raise exception 'quote_expired' using errcode = 'P0001'; end if;
  if p_chat is null then
    insert into chats (user_id, title) values (p_user, left(coalesce(nullif(p_title, ''), 'Ideas'), 80)) returning id into c;
  else
    select ch.id into c from chats ch where ch.id = p_chat and ch.user_id = p_user;
    if c is null then raise exception 'chat_not_found' using errcode = 'P0002'; end if;
  end if;
  begin
    insert into messages (chat_id, user_id, role, content, idempotency_key)
    values (c, p_user, 'user', p_prompt, p_key) returning id into um;
  exception when unique_violation then
    if p_chat is null then delete from chats where id = c; end if;
    select * into prior from messages where user_id = p_user and idempotency_key = p_key;
    return query select prior.chat_id, (select m.id from messages m where m.chat_id = prior.chat_id and m.role = 'assistant' and m.created_at >= prior.created_at order by m.created_at limit 1), true;
    return;
  end;
  insert into messages (chat_id, user_id, role, content, ideas)
  values (c, p_user, 'assistant', p_reply, p_ideas) returning id into am;
  update chats ch set updated_at = now() where ch.id = c;
  -- charge (same bucket order and overdraft rule as spend_credits)
  select * into a from credit_accounts where user_id = p_user for update;
  if a.plan_credits + a.topup_credits < q.credits then raise exception 'insufficient_credits' using errcode = 'P0001'; end if;
  from_plan := least(a.plan_credits, q.credits);
  from_topup := q.credits - from_plan;
  update credit_accounts set plan_credits = plan_credits - from_plan, topup_credits = topup_credits - from_topup, updated_at = now()
   where user_id = p_user;
  if q.credits > 0 then
    insert into credit_ledger (user_id, kind, plan_delta, topup_delta, message_id, note)
    values (p_user, 'spend', -from_plan, -from_topup, am, 'ideas');
  end if;
  return query select c, am, false;
end $$;

do $$ begin
  revoke all on function create_ideas_reply(uuid,uuid,text,text,text,jsonb,uuid,text) from public;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function create_ideas_reply(uuid,uuid,text,text,text,jsonb,uuid,text) from anon, authenticated;
    grant execute on function create_ideas_reply(uuid,uuid,text,text,text,jsonb,uuid,text) to service_role;
  end if;
end $$;

-- let the server key use the new tables
grant all on all tables in schema public to service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
