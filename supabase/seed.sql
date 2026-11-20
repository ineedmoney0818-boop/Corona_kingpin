-- Local seed: one demo account with a project and a chat. Fake people only.
-- Sign in at http://localhost:3000 with demo@reelplain.test / demo-pass-123
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
values ('11111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'demo@reelplain.test', crypt('demo-pass-123', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{"full_name":"Demo Creator"}', now(), now(), '', '', '', '');
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(), '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111',
  '{"sub":"11111111-1111-4111-8111-111111111111","email":"demo@reelplain.test","email_verified":true}', 'email', now(), now(), now());
-- profile + 10 free credits come from the on_auth_user_created trigger
insert into projects (user_id, name) values ('11111111-1111-4111-8111-111111111111', 'Morning routine series');
insert into chats (user_id, title) values ('11111111-1111-4111-8111-111111111111', 'Ideas for this week');
