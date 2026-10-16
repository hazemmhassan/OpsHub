create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = statement_timestamp();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  default_locale text not null,
  timezone text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint organizations_name_format_check check (
    name = btrim(name)
    and char_length(name) between 2 and 120
  ),
  constraint organizations_default_locale_check check (
    default_locale in ('ar', 'en')
  ),
  constraint organizations_timezone_length_check check (
    char_length(timezone) between 1 and 255
  )
);

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  preferred_locale text not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint profiles_display_name_format_check check (
    display_name = btrim(display_name)
    and char_length(display_name) between 2 and 120
  ),
  constraint profiles_preferred_locale_check check (
    preferred_locale in ('ar', 'en')
  )
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  role text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint organization_members_role_check check (
    role in ('approver', 'admin')
  ),
  constraint organization_members_org_id_user_id_key unique (org_id, user_id)
);

create index organization_members_user_active_org_idx
  on public.organization_members (user_id, is_active, org_id);

create index organization_members_org_role_active_idx
  on public.organization_members (org_id, role, is_active);

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function private.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger organization_members_set_updated_at
before update on public.organization_members
for each row execute function private.set_updated_at();

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;

revoke all on table public.organizations from anon, authenticated;
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.organization_members from anon, authenticated;

grant select, insert, update, delete on table public.organizations to service_role;
grant select, insert, update, delete on table public.profiles to service_role;
grant select, insert, update, delete on table public.organization_members to service_role;
