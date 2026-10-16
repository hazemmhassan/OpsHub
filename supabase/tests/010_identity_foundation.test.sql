begin;

select plan(25);

select has_table(
  'public',
  'organizations',
  'organizations should exist'
);

select has_table(
  'public',
  'profiles',
  'profiles should exist'
);

select has_table(
  'public',
  'organization_members',
  'organization_members should exist'
);

select col_is_pk(
  'public',
  'organizations',
  'id',
  'organizations.id should be the primary key'
);

select col_is_pk(
  'public',
  'profiles',
  'user_id',
  'profiles.user_id should be the primary key'
);

select col_is_pk(
  'public',
  'organization_members',
  'id',
  'organization_members.id should be the primary key'
);

select fk_ok(
  'public',
  'profiles',
  'user_id',
  'auth',
  'users',
  'id',
  'profiles should reference Supabase Auth users'
);

select fk_ok(
  'public',
  'organization_members',
  'org_id',
  'public',
  'organizations',
  'id',
  'memberships should reference organizations'
);

select fk_ok(
  'public',
  'organization_members',
  'user_id',
  'public',
  'profiles',
  'user_id',
  'memberships should reference profiles'
);

select ok(
  (
    select relrowsecurity
    from pg_catalog.pg_class
    where oid = 'public.organizations'::regclass
  ),
  'organizations should have row level security enabled'
);

select ok(
  (
    select relrowsecurity
    from pg_catalog.pg_class
    where oid = 'public.profiles'::regclass
  ),
  'profiles should have row level security enabled'
);

select ok(
  (
    select relrowsecurity
    from pg_catalog.pg_class
    where oid = 'public.organization_members'::regclass
  ),
  'organization_members should have row level security enabled'
);

select ok(
  exists (
    select 1
    from public.organizations
    where id = '00000000-0000-4000-8000-000000000001'
      and name = 'OpsHub Demo'
      and default_locale = 'ar'
      and timezone = 'Africa/Cairo'
      and is_active
  ),
  'the synthetic demo organization should be seeded'
);

select throws_ok(
  $$
    insert into public.organizations (name, default_locale, timezone)
    values (' A valid name', 'ar', 'Africa/Cairo')
  $$,
  '23514',
  null,
  'organization names should be stored already trimmed'
);

select throws_ok(
  $$
    insert into public.organizations (name, default_locale, timezone)
    values ('Valid organization', 'fr', 'Africa/Cairo')
  $$,
  '23514',
  null,
  'organization locale should be Arabic or English'
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
values (
  '00000000-0000-4000-8000-000000000101',
  'authenticated',
  'authenticated',
  'phase4a@example.test',
  '',
  now(),
  '{}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
);

select throws_ok(
  $$
    insert into public.profiles (user_id, display_name, preferred_locale)
    values (
      '00000000-0000-4000-8000-000000000101',
      ' A valid name',
      'ar'
    )
  $$,
  '23514',
  null,
  'profile display names should be stored already trimmed'
);

select throws_ok(
  $$
    insert into public.profiles (user_id, display_name, preferred_locale)
    values (
      '00000000-0000-4000-8000-000000000101',
      'Demo User',
      'fr'
    )
  $$,
  '23514',
  null,
  'profile locale should be Arabic or English'
);

insert into public.profiles (user_id, display_name, preferred_locale)
values (
  '00000000-0000-4000-8000-000000000101',
  'Demo User',
  'ar'
);

select throws_ok(
  $$
    insert into public.organization_members (org_id, user_id, role)
    values (
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000101',
      'owner'
    )
  $$,
  '23514',
  null,
  'membership role should be approver or admin'
);

insert into public.organization_members (org_id, user_id, role)
values (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000101',
  'admin'
);

select throws_ok(
  $$
    insert into public.organization_members (org_id, user_id, role)
    values (
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000101',
      'approver'
    )
  $$,
  '23505',
  null,
  'a user should have one membership per organization'
);

select is(
  (
    select is_active
    from public.organization_members
    where user_id = '00000000-0000-4000-8000-000000000101'
  ),
  true,
  'memberships should be active by default'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_indexes
    where schemaname = 'public'
      and tablename = 'organization_members'
      and indexdef like '%(user_id, is_active, org_id)%'
  ),
  'membership checks should have a user-first composite index'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_indexes
    where schemaname = 'public'
      and tablename = 'organization_members'
      and indexdef like '%(org_id, role, is_active)%'
  ),
  'role checks should have an organization-first composite index'
);

update public.organizations
set updated_at = '2000-01-01 00:00:00+00'
where id = '00000000-0000-4000-8000-000000000001';

select ok(
  (
    select updated_at > '2000-01-01 00:00:00+00'::timestamptz
    from public.organizations
    where id = '00000000-0000-4000-8000-000000000001'
  ),
  'organization updates should maintain updated_at in the database'
);

update public.profiles
set updated_at = '2000-01-01 00:00:00+00'
where user_id = '00000000-0000-4000-8000-000000000101';

select ok(
  (
    select updated_at > '2000-01-01 00:00:00+00'::timestamptz
    from public.profiles
    where user_id = '00000000-0000-4000-8000-000000000101'
  ),
  'profile updates should maintain updated_at in the database'
);

update public.organization_members
set updated_at = '2000-01-01 00:00:00+00'
where user_id = '00000000-0000-4000-8000-000000000101';

select ok(
  (
    select updated_at > '2000-01-01 00:00:00+00'::timestamptz
    from public.organization_members
    where user_id = '00000000-0000-4000-8000-000000000101'
  ),
  'membership updates should maintain updated_at in the database'
);

select * from finish();

rollback;
