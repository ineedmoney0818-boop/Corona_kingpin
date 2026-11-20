-- Security advisor fixes: pin search_path on the trigger helper, and keep the
-- signup trigger function off the public API (it only runs from the auth.users trigger).
-- Also grant table access explicitly: newer Supabase projects don't auto-expose new tables.
alter function public.set_updated_at() set search_path = public;
revoke all on function public.handle_new_user() from public, anon, authenticated;

grant usage on schema public to service_role, authenticated, anon;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
