create or replace function private.is_active_org_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members as member
    where member.org_id = p_org_id
      and member.user_id = (select auth.uid())
      and member.is_active
  );
$$;

create or replace function private.has_org_role(
  p_org_id uuid,
  p_allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members as member
    where member.org_id = p_org_id
      and member.user_id = (select auth.uid())
      and member.is_active
      and member.role = any (p_allowed_roles)
  );
$$;

revoke all on function private.is_active_org_member(uuid)
  from public, anon, authenticated;
revoke all on function private.has_org_role(uuid, text[])
  from public, anon, authenticated;

grant execute on function private.is_active_org_member(uuid) to authenticated;
grant execute on function private.has_org_role(uuid, text[]) to authenticated;

grant select on table public.organizations to authenticated;
grant select on table public.profiles to authenticated;
grant select on table public.organization_members to authenticated;

create policy organizations_select_active_members
on public.organizations
for select
to authenticated
using (
  is_active
  and (select private.is_active_org_member(id))
);

create policy profiles_select_self
on public.profiles
for select
to authenticated
using (user_id = (select auth.uid()));

create policy organization_members_select_authorized
on public.organization_members
for select
to authenticated
using (
  is_active
  and (
    user_id = (select auth.uid())
    or (
      select private.has_org_role(
        org_id,
        array['admin']::text[]
      )
    )
  )
);
