begin;

select plan(28);

insert into public.organizations (
  id,
  name,
  default_locale,
  timezone,
  is_active
)
values
  (
    '00000000-0000-4000-8000-000000000002',
    'Second Organization',
    'en',
    'UTC',
    true
  ),
  (
    '00000000-0000-4000-8000-000000000003',
    'Inactive Organization',
    'ar',
    'Africa/Cairo',
    false
  );

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-4000-8000-000000000301',
    'authenticated',
    'authenticated',
    'admin-a@example.test',
    '',
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000302',
    'authenticated',
    'authenticated',
    'approver-a@example.test',
    '',
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000303',
    'authenticated',
    'authenticated',
    'admin-b@example.test',
    '',
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000304',
    'authenticated',
    'authenticated',
    'no-membership@example.test',
    '',
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000305',
    'authenticated',
    'authenticated',
    'inactive-member@example.test',
    '',
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into public.profiles (user_id, display_name, preferred_locale)
values
  ('00000000-0000-4000-8000-000000000301', 'Admin A', 'en'),
  ('00000000-0000-4000-8000-000000000302', 'Approver A', 'ar'),
  ('00000000-0000-4000-8000-000000000303', 'Admin B', 'en'),
  ('00000000-0000-4000-8000-000000000304', 'No Membership', 'en'),
  ('00000000-0000-4000-8000-000000000305', 'Inactive Member', 'ar');

insert into public.organization_members (org_id, user_id, role, is_active)
values
  (
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000301',
    'admin',
    true
  ),
  (
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000302',
    'approver',
    true
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000303',
    'admin',
    true
  ),
  (
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000305',
    'approver',
    false
  );

select ok(
  not has_table_privilege('anon', 'public.organizations', 'select')
  and not has_table_privilege('anon', 'public.profiles', 'select')
  and not has_table_privilege('anon', 'public.organization_members', 'select'),
  'anonymous callers should have no read grants on identity tables'
);

select ok(
  not has_table_privilege('anon', 'public.organizations', 'insert, update, delete')
  and not has_table_privilege('anon', 'public.profiles', 'insert, update, delete')
  and not has_table_privilege(
    'anon',
    'public.organization_members',
    'insert, update, delete'
  ),
  'anonymous callers should have no write grants on identity tables'
);

select ok(
  has_table_privilege('authenticated', 'public.organizations', 'select')
  and has_table_privilege('authenticated', 'public.profiles', 'select')
  and has_table_privilege(
    'authenticated',
    'public.organization_members',
    'select'
  ),
  'authenticated callers should receive only the reads used by staff screens'
);

select ok(
  not has_table_privilege(
    'authenticated',
    'public.organizations',
    'insert, update, delete'
  )
  and not has_table_privilege(
    'authenticated',
    'public.profiles',
    'insert, update, delete'
  )
  and not has_table_privilege(
    'authenticated',
    'public.organization_members',
    'insert, update, delete'
  ),
  'authenticated callers should have no direct write grants'
);

select ok(
  has_function_privilege(
    'authenticated',
    'private.is_active_org_member(uuid)',
    'execute'
  )
  and has_function_privilege(
    'authenticated',
    'private.has_org_role(uuid,text[])',
    'execute'
  )
  and not has_function_privilege(
    'anon',
    'private.is_active_org_member(uuid)',
    'execute'
  )
  and not has_function_privilege(
    'anon',
    'private.has_org_role(uuid,text[])',
    'execute'
  ),
  'only authenticated callers should receive the helper execution grants'
);

select ok(
  (
    select bool_and(prosecdef and provolatile = 's')
    from pg_catalog.pg_proc
    where oid in (
      'private.is_active_org_member(uuid)'::regprocedure,
      'private.has_org_role(uuid,text[])'::regprocedure
    )
  ),
  'membership helpers should be stable security-definer functions'
);

select ok(
  (
    select bool_and('search_path=""' = any (proconfig))
    from pg_catalog.pg_proc
    where oid in (
      'private.is_active_org_member(uuid)'::regprocedure,
      'private.has_org_role(uuid,text[])'::regprocedure
    )
  ),
  'membership helpers should pin an empty search path'
);

set local role anon;

select throws_ok(
  $$ select * from public.organizations $$,
  '42501',
  null,
  'anonymous callers should be rejected before a tenant query can run'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000304","role":"authenticated"}',
  true
);

select is(
  (select count(*)::integer from public.organizations),
  0,
  'a user without a membership should read no organizations'
);

select is(
  (select count(*)::integer from public.organization_members),
  0,
  'a user without a membership should read no memberships'
);

select results_eq(
  $$ select user_id from public.profiles $$,
  $$ values ('00000000-0000-4000-8000-000000000304'::uuid) $$,
  'a user without a membership should still read only their own profile'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000305","role":"authenticated"}',
  true
);

select is(
  (select count(*)::integer from public.organizations),
  0,
  'an inactive member should read no organizations'
);

select is(
  (select count(*)::integer from public.organization_members),
  0,
  'an inactive member should read no memberships'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000301","role":"authenticated"}',
  true
);

select results_eq(
  $$ select id from public.organizations order by id $$,
  $$ values ('00000000-0000-4000-8000-000000000001'::uuid) $$,
  'an admin should read only their active organization'
);

select results_eq(
  $$ select user_id from public.organization_members order by user_id $$,
  $$
    values
      ('00000000-0000-4000-8000-000000000301'::uuid),
      ('00000000-0000-4000-8000-000000000302'::uuid)
  $$,
  'an admin should read active memberships only inside their organization'
);

select results_eq(
  $$ select user_id from public.profiles $$,
  $$ values ('00000000-0000-4000-8000-000000000301'::uuid) $$,
  'an admin should not gain access to other user profiles'
);

select is(
  (
    select count(*)::integer
    from public.organizations
    where id = '00000000-0000-4000-8000-000000000002'
  ),
  0,
  'an admin should not discover another organization by a guessed ID'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000302","role":"authenticated"}',
  true
);

select results_eq(
  $$ select id from public.organizations $$,
  $$ values ('00000000-0000-4000-8000-000000000001'::uuid) $$,
  'an approver should read their active organization'
);

select results_eq(
  $$ select user_id from public.organization_members $$,
  $$ values ('00000000-0000-4000-8000-000000000302'::uuid) $$,
  'an approver should read only their own active membership'
);

select is(
  (
    select count(*)::integer
    from public.profiles
    where user_id = '00000000-0000-4000-8000-000000000301'
  ),
  0,
  'an approver should not read another staff profile by a guessed user ID'
);

select is(
  (
    select count(*)::integer
    from public.organizations
    where id = '00000000-0000-4000-8000-000000000002'
  ),
  0,
  'an approver should not discover another organization by a guessed ID'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000303","role":"authenticated"}',
  true
);

select results_eq(
  $$ select id from public.organizations $$,
  $$ values ('00000000-0000-4000-8000-000000000002'::uuid) $$,
  'a second organization admin should read only the second organization'
);

select results_eq(
  $$ select user_id from public.organization_members $$,
  $$ values ('00000000-0000-4000-8000-000000000303'::uuid) $$,
  'a second organization admin should read only their tenant membership rows'
);

select throws_ok(
  $$
    insert into public.organizations (name, default_locale, timezone)
    values ('Unauthorized Organization', 'en', 'UTC')
  $$,
  '42501',
  null,
  'an authenticated user should not insert an organization directly'
);

select throws_ok(
  $$
    update public.profiles
    set display_name = 'Unauthorized Change'
    where user_id = '00000000-0000-4000-8000-000000000303'
  $$,
  '42501',
  null,
  'an authenticated user should not update a profile directly in P0'
);

select throws_ok(
  $$
    delete from public.organization_members
    where user_id = '00000000-0000-4000-8000-000000000303'
  $$,
  '42501',
  null,
  'an authenticated user should not delete a membership directly'
);

reset role;

update public.organization_members
set is_active = false
where org_id = '00000000-0000-4000-8000-000000000001'
  and user_id = '00000000-0000-4000-8000-000000000301';

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000301","role":"authenticated"}',
  true
);

select is(
  (select count(*)::integer from public.organizations),
  0,
  'deactivating a membership should remove organization access immediately'
);

select is(
  (select count(*)::integer from public.organization_members),
  0,
  'deactivating a membership should remove membership access immediately'
);

select * from finish();

rollback;
