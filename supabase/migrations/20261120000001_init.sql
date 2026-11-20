-- Reelplain schema (Postgres 15+ on Supabase).
-- Access rules: Postgres row level security. Every user-owned table has an owner
-- column and an owner-only policy. Credit and billing tables are read-only to users;
-- only server code (service role) and the SECURITY DEFINER functions below write them.
-- Money: integer cents + currency. Times: timestamptz (UTC).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- helpers
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------------------------------------------------------------- users
-- One row per auth.users row (Supabase Auth owns identity: Google OAuth + email/password).
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  plan text not null default 'try' check (plan in ('try','creator','studio')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- billing
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text not null unique,
  plan text not null check (plan in ('creator','studio')),
  interval text not null check (interval in ('month','year')),
  status text not null check (status in ('trialing','active','past_due','canceled','incomplete','unpaid')),
  cancel_at_period_end boolean not null default false,
  current_period_end timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on subscriptions (user_id);
create unique index one_live_subscription_per_user on subscriptions (user_id)
  where status in ('trialing','active','past_due');

-- Every Stripe webhook event id is stored once; a duplicate delivery is a no-op.
create table stripe_events (
  id text primary key,                -- Stripe event id (evt_...)
  type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

-- ---------------------------------------------------------------- credits
-- Cached balance per user. Two buckets: plan credits (roll over at most one month's
-- grant) and top-up credits (never expire). Check constraints make overdraft impossible.
create table credit_accounts (
  user_id uuid primary key references profiles(id) on delete cascade,
  plan_credits integer not null default 0 check (plan_credits >= 0),
  topup_credits integer not null default 0 check (topup_credits >= 0),
  monthly_grant integer not null default 10 check (monthly_grant >= 0),
  next_grant_at timestamptz not null default now() + interval '1 month',
  updated_at timestamptz not null default now()
);

-- Append-only ledger: the audit trail behind every balance change. A user can see
-- exactly where each credit went - and every refund.
create table credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind text not null check (kind in ('grant','rollover_trim','topup','spend','refund','adjust')),
  plan_delta integer not null default 0,
  topup_delta integer not null default 0,
  render_id uuid,                     -- set for spend/refund (FK added below)
  stripe_ref text,                    -- invoice / checkout session for grant/topup
  note text,
  created_at timestamptz not null default now()
);
create index on credit_ledger (user_id, created_at desc);
create index on credit_ledger (render_id);
-- At most one spend and one refund per render: retries and duplicate jobs cannot double-charge or double-refund.
create unique index one_spend_per_render on credit_ledger (render_id) where kind = 'spend';
create unique index one_refund_per_render on credit_ledger (render_id) where kind = 'refund';
-- One grant per Stripe invoice, one top-up per checkout session.
create unique index one_credit_per_stripe_ref on credit_ledger (stripe_ref, kind) where stripe_ref is not null;

-- ---------------------------------------------------------------- content
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on projects (user_id, updated_at desc);

create table assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,   -- deleting a project keeps its uploads
  kind text not null check (kind in ('image','video')),
  source text not null check (source in ('upload','url','stock')),
  storage_path text,                  -- Supabase Storage key (uploads)
  external_url text,                  -- stock / url imports
  stock_provider text check (stock_provider in ('pexels','pixabay')),
  stock_attribution text,
  mime_type text not null,
  bytes bigint check (bytes >= 0),
  width integer, height integer,
  duration_ms integer check (duration_ms >= 0),
  status text not null default 'pending' check (status in ('pending','ready','failed')),
  description text,                   -- AI-written description used by the planner
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint asset_has_location check (storage_path is not null or external_url is not null)
);
create index on assets (user_id, created_at desc);
create index on assets (project_id);

create table chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on chats (user_id, updated_at desc);

create table messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references chats(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null default '',
  attachment_ids uuid[] not null default '{}',
  feedback text check (feedback in ('up','down')),
  created_at timestamptz not null default now()
);
create index on messages (chat_id, created_at);

-- A generation is one reel or carousel. Its plan (scenes/slides, layers, caption) is
-- versioned JSON validated in the app with a zod schema; the editor writes new versions.
create table generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  chat_id uuid references chats(id) on delete set null,
  message_id uuid references messages(id) on delete set null,
  kind text not null check (kind in ('reel','carousel')),
  aspect text not null default '9:16' check (aspect in ('9:16','1:1','4:5')),
  plan jsonb not null,
  plan_version integer not null default 1 check (plan_version >= 1),
  caption text not null default '',
  original_only boolean not null default true,   -- fix #7: never AI-regenerate user images
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on generations (user_id, created_at desc);
create index on generations (chat_id);
create index on generations (message_id);

-- One row per render attempt of a generation version. This is the unit of billing:
-- quoted before it runs, charged when queued, refunded automatically if it fails.
create table renders (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references generations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  plan_version integer not null,
  status text not null default 'queued'
    check (status in ('queued','rendering','succeeded','failed','canceled')),
  credits_quoted integer not null check (credits_quoted >= 0),
  watermark boolean not null,
  attempts integer not null default 0 check (attempts >= 0),
  output_paths text[] not null default '{}',   -- mp4, or one png per carousel slide
  error_code text,
  error_detail text,
  idempotency_key text not null,               -- client-supplied, so a double tap queues once
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint failed_has_error check (status <> 'failed' or error_code is not null)
);
create index on renders (generation_id, created_at desc);
create index on renders (user_id, created_at desc);
create index on renders (status) where status in ('queued','rendering');
create unique index one_render_per_idempotency_key on renders (user_id, idempotency_key);

alter table credit_ledger
  add constraint credit_ledger_render_fk foreign key (render_id) references renders(id) on delete set null;

-- Fix #6: saved caption styles.
create table caption_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null check (length(name) between 1 and 60),
  style jsonb not null,               -- font, size, colours, position, words_per_block
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on caption_presets (user_id);
create unique index one_default_preset_per_user on caption_presets (user_id) where is_default;

-- ---------------------------------------------------------------- updated_at triggers
do $$ declare t text; begin
  foreach t in array array['profiles','subscriptions','projects','assets','chats',
                           'generations','renders','caption_presets'] loop
    execute format('create trigger %I_updated_at before update on %I
                    for each row execute function set_updated_at()', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------- credit functions
-- All balance changes go through these. They lock the account row, so two renders
-- started at the same moment cannot both spend the last credits.

-- Charge a render. Spends plan credits first, then top-ups. Raises if not enough.
create or replace function spend_credits(p_render_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r renders; a credit_accounts; from_plan int; from_topup int;
begin
  select * into r from renders where id = p_render_id;
  if r.id is null then raise exception 'render % not found', p_render_id; end if;
  select * into a from credit_accounts where user_id = r.user_id for update;
  if a.plan_credits + a.topup_credits < r.credits_quoted then
    raise exception 'insufficient_credits' using errcode = 'P0001';
  end if;
  from_plan := least(a.plan_credits, r.credits_quoted);
  from_topup := r.credits_quoted - from_plan;
  update credit_accounts set plan_credits = plan_credits - from_plan,
         topup_credits = topup_credits - from_topup, updated_at = now()
   where user_id = r.user_id;
  insert into credit_ledger (user_id, kind, plan_delta, topup_delta, render_id)
  values (r.user_id, 'spend', -from_plan, -from_topup, r.id);
end $$;

-- Refund a failed render: returns exactly what was spent, to the bucket it came from.
-- Idempotent: a second call finds the refund row already there and does nothing.
create or replace function refund_render(p_render_id uuid, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare s credit_ledger;
begin
  select * into s from credit_ledger where render_id = p_render_id and kind = 'spend';
  if s.id is null then return; end if;     -- nothing was charged
  insert into credit_ledger (user_id, kind, plan_delta, topup_delta, render_id, note)
  values (s.user_id, 'refund', -s.plan_delta, -s.topup_delta, p_render_id, p_note)
  on conflict do nothing;
  if found then
    update credit_accounts set plan_credits = plan_credits - s.plan_delta,
           topup_credits = topup_credits - s.topup_delta, updated_at = now()
     where user_id = s.user_id;
  end if;
end $$;

-- Monthly grant with capped rollover: new plan balance = min(left over, one grant) + grant.
-- Idempotent per Stripe invoice (or per 'free-YYYY-MM' ref for the Try plan).
create or replace function grant_monthly_credits(p_user_id uuid, p_grant int, p_ref text) returns void
language plpgsql security definer set search_path = public as $$
declare a credit_accounts; trimmed int;
begin
  select * into a from credit_accounts where user_id = p_user_id for update;
  if exists (select 1 from credit_ledger where stripe_ref = p_ref and kind = 'grant') then return; end if;
  trimmed := greatest(a.plan_credits - a.monthly_grant, 0);
  if trimmed > 0 then
    insert into credit_ledger (user_id, kind, plan_delta, stripe_ref)
    values (p_user_id, 'rollover_trim', -trimmed, p_ref);
  end if;
  insert into credit_ledger (user_id, kind, plan_delta, stripe_ref) values (p_user_id, 'grant', p_grant, p_ref);
  update credit_accounts set plan_credits = a.plan_credits - trimmed + p_grant,
         monthly_grant = p_grant, next_grant_at = now() + interval '1 month', updated_at = now()
   where user_id = p_user_id;
end $$;

create or replace function add_topup(p_user_id uuid, p_amount int, p_ref text) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into credit_ledger (user_id, kind, topup_delta, stripe_ref) values (p_user_id, 'topup', p_amount, p_ref)
  on conflict do nothing;
  if found then
    update credit_accounts set topup_credits = topup_credits + p_amount, updated_at = now()
     where user_id = p_user_id;
  end if;
end $$;

-- These run from server code only (service role), never from the browser.
revoke all on function spend_credits(uuid), refund_render(uuid, text),
  grant_monthly_credits(uuid, int, text), add_topup(uuid, int, text) from public;
-- Supabase also grants EXECUTE to its API roles by default; take that away explicitly.
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function spend_credits(uuid), refund_render(uuid, text),
      grant_monthly_credits(uuid, int, text), add_topup(uuid, int, text) from anon, authenticated;
  end if;
end $$;

-- New user: profile + credit account with the Try plan's first grant.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  insert into credit_accounts (user_id, monthly_grant) values (new.id, 10);
  perform grant_monthly_credits(new.id, 10, 'signup-' || new.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------- row level security
alter table profiles        enable row level security;
alter table subscriptions   enable row level security;
alter table stripe_events   enable row level security;
alter table credit_accounts enable row level security;
alter table credit_ledger   enable row level security;
alter table projects        enable row level security;
alter table assets          enable row level security;
alter table chats           enable row level security;
alter table messages        enable row level security;
alter table generations     enable row level security;
alter table renders         enable row level security;
alter table caption_presets enable row level security;

-- Read-only to their owner (all writes happen server-side with the service role):
create policy own_read on profiles        for select using (id = auth.uid());
create policy own_update on profiles      for update using (id = auth.uid())
  with check (id = auth.uid());
create policy own_read on subscriptions   for select using (user_id = auth.uid());
create policy own_read on credit_accounts for select using (user_id = auth.uid());
create policy own_read on credit_ledger   for select using (user_id = auth.uid());
create policy own_read on renders         for select using (user_id = auth.uid());
-- stripe_events: no policies, so no user access at all.

-- Full access to their own content:
create policy own_all on projects        for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_all on caption_presets for all using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Foreign keys bypass RLS, so writes that point at another row must also prove that
-- row is the user's own - otherwise a user could file a message under someone else's chat.
create policy own_all on assets for all using (user_id = auth.uid()) with check (
  user_id = auth.uid()
  and (project_id is null or exists (select 1 from projects p where p.id = project_id and p.user_id = auth.uid())));
create policy own_all on chats for all using (user_id = auth.uid()) with check (
  user_id = auth.uid()
  and (project_id is null or exists (select 1 from projects p where p.id = project_id and p.user_id = auth.uid())));
create policy own_all on messages for all using (user_id = auth.uid()) with check (
  user_id = auth.uid()
  and exists (select 1 from chats c where c.id = chat_id and c.user_id = auth.uid()));
create policy own_all on generations for all using (user_id = auth.uid()) with check (
  user_id = auth.uid()
  and (chat_id is null or exists (select 1 from chats c where c.id = chat_id and c.user_id = auth.uid()))
  and (message_id is null or exists (select 1 from messages m where m.id = message_id and m.user_id = auth.uid())));
