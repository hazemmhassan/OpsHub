begin;

select plan(7);

insert into public.public_forms (
  id,
  org_id,
  public_id,
  form_version,
  consent_text_version_ar,
  consent_text_version_en
)
values (
  '00000000-0000-4000-8000-000000000091',
  '00000000-0000-4000-8000-000000000001',
  'phase-six-payload-form',
  1,
  'consent-ar-v1',
  'consent-en-v1'
);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values (
  '00000000-0000-4000-8000-000000000901', 'authenticated',
  'authenticated', 'phase6-payload-admin@example.test', '', now(), '{}'::jsonb,
  '{}'::jsonb, now(), now()
);

insert into public.profiles (user_id, display_name, preferred_locale)
values ('00000000-0000-4000-8000-000000000901', 'Payload Admin', 'en');

insert into public.organization_members (org_id, user_id, role, is_active)
values (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000901',
  'admin',
  true
);

create temporary table submitted on commit drop as
select *
from public.submit_request(
  'phase-six-payload-form',
  '00000000-0000-4000-8000-000000000911',
  'individual',
  'Synthetic User',
  'synthetic@example.test',
  '+201000000000',
  '+201000000000',
  'EG',
  false,
  'consulting',
  'Synthetic request',
  'Synthetic Phase 6 delivery request for contract testing.',
  null,
  'email',
  'en',
  'consent-en-v1',
  null,
  null,
  null
);

select *
from public.start_review(
  (select request_id from submitted),
  '00000000-0000-4000-8000-000000000901'
);

create temporary table approved on commit drop as
select *
from public.decide_request(
  (select request_id from submitted),
  '00000000-0000-4000-8000-000000000901',
  'approved',
  null
);

select is(
  (
    select array_agg(key order by key)
    from public.integration_deliveries as delivery,
      lateral jsonb_object_keys(delivery.payload) as key
    where delivery.id = (select delivery_id from approved)
  ),
  array['event_id', 'event_type', 'event_version', 'occurred_at', 'request'],
  'the V1 payload should expose only the approved top-level contract keys'
);
select is(
  (
    select (payload ->> 'event_id')::uuid
    from public.integration_deliveries
    where id = (select delivery_id from approved)
  ),
  (select delivery_id from approved),
  'the payload event ID should equal the stable delivery ID'
);
select is(
  (
    select (payload ->> 'occurred_at')::timestamptz
    from public.integration_deliveries
    where id = (select delivery_id from approved)
  ),
  (
    select decided_at
    from public.requests
    where id = (select request_id from submitted)
  ),
  'the event occurrence time should be the database approval time'
);
select is(
  (
    select (payload #>> '{request,approved_at}')::timestamptz
    from public.integration_deliveries
    where id = (select delivery_id from approved)
  ),
  (
    select decided_at
    from public.requests
    where id = (select request_id from submitted)
  ),
  'the public request contract should use approved_at rather than decided_at'
);
select ok(
  (
    select not (payload -> 'request' ?| array[
      'id', 'decided_at', 'phone_raw', 'consent_text_version', 'consented_at'
    ])
    from public.integration_deliveries
    where id = (select delivery_id from approved)
  ),
  'the external payload should not expose internal IDs, raw phone, or consent data'
);
select ok(
  (
    select (payload -> 'request') ?& array[
      'company_name', 'job_title', 'company_website', 'desired_start_date'
    ]
    from public.integration_deliveries
    where id = (select delivery_id from approved)
  ),
  'optional V1 values should remain explicit JSON nulls instead of disappearing'
);
select is(
  (
    select jsonb_typeof(payload #> '{request,company_name}')
    from public.integration_deliveries
    where id = (select delivery_id from approved)
  ),
  'null',
  'an individual request should serialize company-only values as JSON null'
);

select * from finish();

rollback;
