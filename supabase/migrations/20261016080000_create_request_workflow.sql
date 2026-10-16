create table public.public_forms (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  public_id text not null,
  form_version integer not null default 1,
  consent_text_version_ar text not null,
  consent_text_version_en text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint public_forms_public_id_key unique (public_id),
  constraint public_forms_id_org_id_key unique (id, org_id),
  constraint public_forms_public_id_format_check check (
    public_id = btrim(public_id)
    and char_length(public_id) between 20 and 120
    and public_id ~ '^[A-Za-z0-9_-]+$'
  ),
  constraint public_forms_form_version_check check (form_version > 0),
  constraint public_forms_consent_ar_check check (
    consent_text_version_ar = btrim(consent_text_version_ar)
    and char_length(consent_text_version_ar) between 1 and 80
  ),
  constraint public_forms_consent_en_check check (
    consent_text_version_en = btrim(consent_text_version_en)
    and char_length(consent_text_version_en) between 1 and 80
  )
);

create index public_forms_org_active_idx
  on public.public_forms (org_id, is_active);

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  public_form_id uuid not null,
  reference text not null,
  idempotency_key uuid not null,
  status text not null default 'submitted',
  submitted_at timestamptz not null default statement_timestamp(),
  review_started_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint requests_reference_key unique (reference),
  constraint requests_public_form_id_idempotency_key_key unique (
    public_form_id,
    idempotency_key
  ),
  constraint requests_id_org_id_key unique (id, org_id),
  constraint requests_public_form_org_fkey foreign key (public_form_id, org_id)
    references public.public_forms (id, org_id),
  constraint requests_reference_format_check check (
    char_length(reference) = 10
    and reference ~ '^[0-9A-HJKMNP-TV-Z]{10}$'
  ),
  constraint requests_status_check check (
    status in ('submitted', 'under_review', 'approved', 'rejected')
  ),
  constraint requests_status_timestamps_check check (
    (status = 'submitted' and review_started_at is null and decided_at is null)
    or (
      status = 'under_review'
      and review_started_at is not null
      and decided_at is null
    )
    or (
      status in ('approved', 'rejected')
      and review_started_at is not null
      and decided_at is not null
    )
  )
);

create index requests_org_status_submitted_idx
  on public.requests (org_id, status, submitted_at desc, id desc);
create index requests_org_submitted_idx
  on public.requests (org_id, submitted_at desc, id desc);
create index requests_public_form_org_idx
  on public.requests (public_form_id, org_id);

create table public.request_submission_snapshots (
  request_id uuid primary key,
  org_id uuid not null references public.organizations (id),
  requester_type text not null,
  contact_name text not null,
  email text not null,
  phone_raw text not null,
  phone_e164 text not null,
  country_code character(2) not null,
  phone_country_mismatch boolean not null default false,
  service_category text not null,
  request_title text not null,
  description text not null,
  desired_start_date date,
  preferred_contact_method text,
  submitted_locale text not null,
  consent_text_version text not null,
  consent_locale text not null,
  consented_at timestamptz not null default statement_timestamp(),
  company_name text,
  job_title text,
  company_website text,
  form_version integer not null,
  created_at timestamptz not null default statement_timestamp(),
  constraint request_snapshots_request_org_fkey foreign key (request_id, org_id)
    references public.requests (id, org_id),
  constraint request_snapshots_requester_type_check check (
    requester_type in ('individual', 'company')
  ),
  constraint request_snapshots_contact_name_check check (
    contact_name = btrim(contact_name)
    and char_length(contact_name) between 1 and 120
  ),
  constraint request_snapshots_email_check check (
    email = lower(btrim(email))
    and char_length(email) between 3 and 254
  ),
  constraint request_snapshots_phone_raw_check check (
    phone_raw = btrim(phone_raw)
    and char_length(phone_raw) between 2 and 64
  ),
  constraint request_snapshots_phone_e164_check check (
    phone_e164 ~ '^\+[1-9][0-9]{1,14}$'
  ),
  constraint request_snapshots_country_code_check check (
    country_code ~ '^[A-Z]{2}$'
  ),
  constraint request_snapshots_service_category_check check (
    service_category in (
      'consulting',
      'it_software',
      'marketing',
      'training',
      'support_maintenance',
      'other'
    )
  ),
  constraint request_snapshots_title_check check (
    request_title = btrim(request_title)
    and char_length(request_title) between 5 and 120
  ),
  constraint request_snapshots_description_check check (
    description = btrim(description)
    and char_length(description) between 20 and 2000
  ),
  constraint request_snapshots_contact_method_check check (
    preferred_contact_method is null
    or preferred_contact_method in ('email', 'phone')
  ),
  constraint request_snapshots_locale_check check (
    submitted_locale in ('ar', 'en')
    and consent_locale = submitted_locale
  ),
  constraint request_snapshots_consent_version_check check (
    consent_text_version = btrim(consent_text_version)
    and char_length(consent_text_version) between 1 and 80
  ),
  constraint request_snapshots_company_branch_check check (
    (
      requester_type = 'individual'
      and company_name is null
      and job_title is null
      and company_website is null
    )
    or (
      requester_type = 'company'
      and company_name = btrim(company_name)
      and char_length(company_name) between 1 and 160
      and (job_title is null or (
        job_title = btrim(job_title)
        and char_length(job_title) between 1 and 120
      ))
      and (company_website is null or (
        char_length(company_website) <= 2048
        and company_website ~ '^https?://'
      ))
    )
  ),
  constraint request_snapshots_form_version_check check (form_version > 0)
);

create index request_snapshots_org_idx
  on public.request_submission_snapshots (org_id);

create table public.approval_decisions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  request_id uuid not null,
  decision text not null,
  reason text,
  decided_by uuid not null references public.profiles (user_id),
  actor_role text not null,
  created_at timestamptz not null default statement_timestamp(),
  constraint approval_decisions_request_id_key unique (request_id),
  constraint approval_decisions_request_org_fkey foreign key (request_id, org_id)
    references public.requests (id, org_id),
  constraint approval_decisions_decision_check check (
    decision in ('approved', 'rejected')
  ),
  constraint approval_decisions_reason_check check (
    (decision = 'approved' and reason is null)
    or (
      decision = 'rejected'
      and reason = btrim(reason)
      and char_length(reason) between 5 and 500
    )
  ),
  constraint approval_decisions_actor_role_check check (
    actor_role in ('approver', 'admin')
  )
);

create index approval_decisions_org_created_idx
  on public.approval_decisions (org_id, created_at desc);

create table public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  name text not null,
  destination_type text not null,
  url text not null,
  signing_secret_ref text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint webhook_endpoints_id_org_id_key unique (id, org_id),
  constraint webhook_endpoints_org_destination_key unique (
    org_id,
    destination_type
  ),
  constraint webhook_endpoints_name_check check (
    name = btrim(name) and char_length(name) between 2 and 120
  ),
  constraint webhook_endpoints_destination_check check (
    destination_type = 'n8n_google_sheets'
  ),
  constraint webhook_endpoints_url_check check (
    url = btrim(url) and url ~ '^https?://'
  ),
  constraint webhook_endpoints_secret_ref_check check (
    signing_secret_ref = btrim(signing_secret_ref)
    and char_length(signing_secret_ref) between 1 and 120
  )
);

create index webhook_endpoints_org_active_idx
  on public.webhook_endpoints (org_id, is_active);

create table public.integration_deliveries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  request_id uuid not null,
  webhook_endpoint_id uuid not null,
  event_type text not null default 'request.approved',
  event_version integer not null default 1,
  idempotency_key text not null,
  payload jsonb not null,
  status text not null default 'pending',
  available_at timestamptz not null default statement_timestamp(),
  attempt_count integer not null default 0,
  max_attempts integer not null default 5,
  locked_at timestamptz,
  locked_until timestamptz,
  lock_token uuid,
  locked_by text,
  last_http_status integer,
  last_error_code text,
  last_error_message text,
  last_attempt_at timestamptz,
  succeeded_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint integration_deliveries_request_id_key unique (request_id),
  constraint integration_deliveries_idempotency_key_key unique (idempotency_key),
  constraint integration_deliveries_id_org_id_key unique (id, org_id),
  constraint integration_deliveries_request_org_fkey foreign key (request_id, org_id)
    references public.requests (id, org_id),
  constraint integration_deliveries_endpoint_org_fkey foreign key (
    webhook_endpoint_id,
    org_id
  ) references public.webhook_endpoints (id, org_id),
  constraint integration_deliveries_event_check check (
    event_type = 'request.approved' and event_version = 1
  ),
  constraint integration_deliveries_status_check check (
    status in ('pending', 'processing', 'succeeded', 'failed', 'dead')
  ),
  constraint integration_deliveries_attempts_check check (
    attempt_count >= 0 and max_attempts >= 1 and attempt_count <= max_attempts
  ),
  constraint integration_deliveries_lease_check check (
    (
      status = 'processing'
      and locked_at is not null
      and locked_until is not null
      and lock_token is not null
      and locked_by is not null
    )
    or (
      status <> 'processing'
      and locked_at is null
      and locked_until is null
      and lock_token is null
      and locked_by is null
    )
  ),
  constraint integration_deliveries_success_check check (
    (status = 'succeeded' and succeeded_at is not null)
    or (status <> 'succeeded' and succeeded_at is null)
  ),
  constraint integration_deliveries_payload_check check (
    jsonb_typeof(payload) = 'object'
  )
);

create index integration_deliveries_claim_idx
  on public.integration_deliveries (available_at, created_at, id)
  where status in ('pending', 'failed');
create index integration_deliveries_expired_lease_idx
  on public.integration_deliveries (locked_until, id)
  where status = 'processing';
create index integration_deliveries_org_status_idx
  on public.integration_deliveries (org_id, status, updated_at desc);
create index integration_deliveries_endpoint_org_idx
  on public.integration_deliveries (webhook_endpoint_id, org_id);

create table public.audit_events (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.organizations (id),
  request_id uuid,
  delivery_id uuid,
  event_type text not null,
  actor_type text not null,
  actor_user_id uuid references public.profiles (user_id),
  actor_role text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default statement_timestamp(),
  constraint audit_events_request_org_fkey foreign key (request_id, org_id)
    references public.requests (id, org_id),
  constraint audit_events_delivery_org_fkey foreign key (delivery_id, org_id)
    references public.integration_deliveries (id, org_id),
  constraint audit_events_event_type_check check (
    event_type in (
      'request_submitted',
      'review_started',
      'request_approved',
      'request_rejected',
      'job_created',
      'delivery_attempt_started',
      'delivery_succeeded',
      'delivery_failed',
      'delivery_dead',
      'manual_retry'
    )
  ),
  constraint audit_events_actor_type_check check (
    actor_type in ('public_requester', 'staff_user', 'worker', 'system')
  ),
  constraint audit_events_actor_shape_check check (
    (
      actor_type = 'staff_user'
      and actor_user_id is not null
      and actor_role in ('approver', 'admin')
    )
    or (
      actor_type <> 'staff_user'
      and actor_user_id is null
      and actor_role is null
    )
  ),
  constraint audit_events_parent_check check (
    request_id is not null or delivery_id is not null
  ),
  constraint audit_events_metadata_check check (
    jsonb_typeof(metadata) = 'object'
  )
);

create index audit_events_request_timeline_idx
  on public.audit_events (org_id, request_id, created_at, id);
create index audit_events_delivery_timeline_idx
  on public.audit_events (org_id, delivery_id, created_at, id);
create index audit_events_actor_user_idx
  on public.audit_events (actor_user_id)
  where actor_user_id is not null;

create trigger public_forms_set_updated_at
before update on public.public_forms
for each row execute function private.set_updated_at();

create trigger requests_set_updated_at
before update on public.requests
for each row execute function private.set_updated_at();

create trigger webhook_endpoints_set_updated_at
before update on public.webhook_endpoints
for each row execute function private.set_updated_at();

create trigger integration_deliveries_set_updated_at
before update on public.integration_deliveries
for each row execute function private.set_updated_at();

alter table public.public_forms enable row level security;
alter table public.requests enable row level security;
alter table public.request_submission_snapshots enable row level security;
alter table public.approval_decisions enable row level security;
alter table public.audit_events enable row level security;
alter table public.integration_deliveries enable row level security;
alter table public.webhook_endpoints enable row level security;

revoke all on table public.public_forms from anon, authenticated;
revoke all on table public.requests from anon, authenticated;
revoke all on table public.request_submission_snapshots from anon, authenticated;
revoke all on table public.approval_decisions from anon, authenticated;
revoke all on table public.audit_events from anon, authenticated;
revoke all on table public.integration_deliveries from anon, authenticated;
revoke all on table public.webhook_endpoints from anon, authenticated;

grant select on table public.public_forms to authenticated;
grant select on table public.requests to authenticated;
grant select on table public.request_submission_snapshots to authenticated;
grant select on table public.approval_decisions to authenticated;
grant select on table public.audit_events to authenticated;
grant select on table public.integration_deliveries to authenticated;

grant select, insert, update, delete on table public.public_forms to service_role;
grant select, insert, update, delete on table public.requests to service_role;
grant select, insert, update, delete on table public.request_submission_snapshots to service_role;
grant select, insert, update, delete on table public.approval_decisions to service_role;
grant select, insert, update, delete on table public.audit_events to service_role;
grant select, insert, update, delete on table public.integration_deliveries to service_role;
grant select, insert, update, delete on table public.webhook_endpoints to service_role;
grant usage, select on sequence public.audit_events_id_seq to service_role;

create policy public_forms_select_members
on public.public_forms for select to authenticated
using ((select private.is_active_org_member(org_id)));

create policy requests_select_members
on public.requests for select to authenticated
using ((select private.is_active_org_member(org_id)));

create policy request_snapshots_select_members
on public.request_submission_snapshots for select to authenticated
using ((select private.is_active_org_member(org_id)));

create policy approval_decisions_select_members
on public.approval_decisions for select to authenticated
using ((select private.is_active_org_member(org_id)));

create policy audit_events_select_members
on public.audit_events for select to authenticated
using (
  request_id is not null
  and (select private.is_active_org_member(org_id))
);

create policy integration_deliveries_select_admins
on public.integration_deliveries for select to authenticated
using (
  (select private.has_org_role(org_id, array['admin']::text[]))
);
