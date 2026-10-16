begin;

select plan(10);

insert into public.organizations (id, name, default_locale, timezone)
values (
  '00000000-0000-4000-8000-000000000002',
  'Other Organization',
  'en',
  'UTC'
);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '00000000-0000-4000-8000-000000000201', 'authenticated',
    'authenticated', 'admin@example.test', '', now(), '{}'::jsonb,
    '{}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-4000-8000-000000000202', 'authenticated',
    'authenticated', 'approver@example.test', '', now(), '{}'::jsonb,
    '{}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-4000-8000-000000000203', 'authenticated',
    'authenticated', 'inactive@example.test', '', now(), '{}'::jsonb,
    '{}'::jsonb, now(), now()
  );

insert into public.profiles (user_id, display_name, preferred_locale)
values
  ('00000000-0000-4000-8000-000000000201', 'Admin User', 'en'),
  ('00000000-0000-4000-8000-000000000202', 'Approver User', 'ar'),
  ('00000000-0000-4000-8000-000000000203', 'Inactive User', 'en');

insert into public.organization_members (org_id, user_id, role, is_active)
values
  (
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000201',
    'admin',
    true
  ),
  (
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000202',
    'approver',
    true
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000203',
    'approver',
    false
  );

select has_function(
  'private',
  'is_active_org_member',
  array['uuid'],
  'an active membership helper should exist'
);

select has_function(
  'private',
  'has_org_role',
  array['uuid', 'text[]'],
  'a role helper should exist'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000201","role":"authenticated"}',
  true
);

select results_eq(
  $$ select id from public.organizations order by id $$,
  $$ values ('00000000-0000-4000-8000-000000000001'::uuid) $$,
  'an admin should read only an active organization they belong to'
);

select is(
  (
    select count(*)::integer
    from public.organization_members
    where user_id in (
      '00000000-0000-4000-8000-000000000201',
      '00000000-0000-4000-8000-000000000202',
      '00000000-0000-4000-8000-000000000203'
    )
  ),
  2,
  'an admin should read the active fixture memberships in their organization'
);

select results_eq(
  $$ select user_id from public.profiles order by user_id $$,
  $$ values ('00000000-0000-4000-8000-000000000201'::uuid) $$,
  'an admin should read only their own profile'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000202","role":"authenticated"}',
  true
);

select is(
  (select count(*)::integer from public.organization_members),
  1,
  'an approver should read only their own active membership'
);

select is(
  (select count(*)::integer from public.organizations),
  1,
  'an approver should read their active organization'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000203","role":"authenticated"}',
  true
);

select is(
  (select count(*)::integer from public.organization_members),
  0,
  'an inactive member should read no memberships'
);

select is(
  (select count(*)::integer from public.organizations),
  0,
  'an inactive member should read no organizations'
);

select is(
  (select count(*)::integer from public.profiles),
  1,
  'an authenticated user may still read their own profile'
);

select * from finish();

rollback;
