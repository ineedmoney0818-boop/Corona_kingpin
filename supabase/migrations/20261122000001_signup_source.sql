-- Where each account came from (first-touch utm_source / utm_campaign), for the Instagram funnel report.
alter table profiles add column if not exists signup_source text check (char_length(signup_source) <= 40);
alter table profiles add column if not exists signup_campaign text check (char_length(signup_campaign) <= 40);
create index if not exists profiles_signup_source on profiles (signup_source);

-- Email sign-ups pass the source in user metadata; Google sign-ups are attributed in /auth/callback.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name, avatar_url, signup_source, signup_campaign)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url',
          left(nullif(new.raw_user_meta_data->>'signup_source', ''), 40),
          left(nullif(new.raw_user_meta_data->>'signup_campaign', ''), 40));
  insert into credit_accounts (user_id, monthly_grant) values (new.id, 10);
  perform grant_monthly_credits(new.id, 10, 'signup-' || new.id);
  return new;
end $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Security fix: users could update every column of their own profile through the API,
-- including plan (free Studio credits, no watermark) and stripe_customer_id.
-- All of those are written server-side with the service role; users keep only their name and avatar.
revoke update on profiles from authenticated, anon;
grant update (display_name, avatar_url) on profiles to authenticated;
