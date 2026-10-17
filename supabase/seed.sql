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

insert into public.public_forms (
  id,
  org_id,
  public_id,
  form_version,
  consent_text_version_ar,
  consent_text_version_en,
  is_active
)
values (
  '00000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-000000000001',
  'opshub-demo-request-form',
  1,
  'consent-ar-v1',
  'consent-en-v1',
  true
)
on conflict (id) do update
set
  public_id = excluded.public_id,
  form_version = excluded.form_version,
  consent_text_version_ar = excluded.consent_text_version_ar,
  consent_text_version_en = excluded.consent_text_version_en,
  is_active = excluded.is_active;

insert into public.webhook_endpoints (
  id,
  org_id,
  name,
  destination_type,
  url,
  signing_secret_ref,
  is_active
)
values (
  '00000000-0000-4000-8000-000000000021',
  '00000000-0000-4000-8000-000000000001',
  'Local n8n Google Sheets',
  'n8n_google_sheets',
  'http://127.0.0.1:5678/webhook/opshub-approved-request',
  'OPSHUB_WEBHOOK_SIGNING_SECRET',
  true
)
on conflict (id) do update
set
  name = excluded.name,
  url = excluded.url,
  signing_secret_ref = excluded.signing_secret_ref,
  is_active = excluded.is_active;
