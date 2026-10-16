insert into public.organizations (
  id,
  name,
  default_locale,
  timezone,
  is_active
)
values (
  '00000000-0000-4000-8000-000000000001',
  'OpsHub Demo',
  'ar',
  'Africa/Cairo',
  true
)
on conflict (id) do update
set
  name = excluded.name,
  default_locale = excluded.default_locale,
  timezone = excluded.timezone,
  is_active = excluded.is_active;
