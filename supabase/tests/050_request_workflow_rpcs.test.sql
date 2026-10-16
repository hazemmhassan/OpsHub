begin;

select plan(26);

insert into public.public_forms (
  id,
  org_id,
  public_id,
  form_version,
  consent_text_version_ar,
  consent_text_version_en
)
values (
  '00000000-0000-4000-8000-000000000051',
  '00000000-0000-4000-8000-000000000001',
  'phase-five-request-form',
  1,
  'consent-ar-v1',
  'consent-en-v1'
);

delete from public.webhook_endpoints
where org_id = '00000000-0000-4000-8000-000000000001'
  and destination_type = 'n8n_google_sheets';

insert into public.webhook_endpoints (
  id,
  org_id,
  name,
  destination_type,
  url,
  signing_secret_ref
)
values (
  '00000000-0000-4000-8000-000000000052',
  '00000000-0000-4000-8000-000000000001',
  'Test n8n endpoint',
  'n8n_google_sheets',
  'http://n8n:5678/webhook/opshub-test',
  'OPSHUB_TEST_SIGNING_SECRET'
);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '00000000-0000-4000-8000-000000000501', 'authenticated',
    'authenticated', 'phase5-admin@example.test', '', now(), '{}'::jsonb,
    '{}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-4000-8000-000000000502', 'authenticated',
    'authenticated', 'phase5-approver@example.test', '', now(), '{}'::jsonb,
    '{}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-4000-8000-000000000503', 'authenticated',
    'authenticated', 'phase5-inactive@example.test', '', now(), '{}'::jsonb,
    '{}'::jsonb, now(), now()
  );

insert into public.profiles (user_id, display_name, preferred_locale)
values
  ('00000000-0000-4000-8000-000000000501', 'Phase 5 Admin', 'en'),
  ('00000000-0000-4000-8000-000000000502', 'Phase 5 Approver', 'ar'),
  ('00000000-0000-4000-8000-000000000503', 'Inactive Approver', 'en');

insert into public.organization_members (org_id, user_id, role, is_active)
values
  (
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000501',
    'admin',
    true
  ),
  (
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000502',
    'approver',
    true
  ),
  (
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000503',
    'approver',
    false
  );

select has_function(
  'public',
  'submit_request',
  'the trusted submission RPC should exist'
);
select has_function(
  'public',
  'start_review',
  'the trusted start-review RPC should exist'
);
select has_function(
  'public',
  'decide_request',
  'the trusted final-decision RPC should exist'
);

create temporary table first_submission on commit drop as
select *
from public.submit_request(
  'phase-five-request-form',
  '00000000-0000-4000-8000-000000000511',
  'individual',
  'Hazem Hassan',
  'hazem@example.test',
  '٠١٠١٢٣٤٥٦٧٨',
  '+201012345678',
  'EG',
  false,
  'consulting',
  'Operations support request',
  'We need help organizing our incoming service requests.',
  current_date + 1,
  'email',
  'en',
  'consent-en-v1',
  'Injected Company',
  'Injected Role',
  'https://injected.example.test'
);

select is(
  (select status from first_submission),
  'submitted',
  'a valid public submission should enter submitted state'
);
select matches(
  (select reference from first_submission),
  '^[0-9A-HJKMNP-TV-Z]{10}$',
  'a submission should receive a 10-character Crockford reference'
);
select is(
  (
    select count(*)::integer
    from public.request_submission_snapshots
    where request_id = (select request_id from first_submission)
      and company_name is null
      and job_title is null
      and company_website is null
  ),
  1,
  'the server should discard company-only values for an individual'
);
select is(
  (
    select count(*)::integer
    from public.audit_events
    where request_id = (select request_id from first_submission)
      and event_type = 'request_submitted'
  ),
  1,
  'submission should create one audit event'
);

create temporary table replayed_submission on commit drop as
select *
from public.submit_request(
  'phase-five-request-form',
  '00000000-0000-4000-8000-000000000511',
  'individual',
  'Changed Name',
  'changed@example.test',
  '+201000000000',
  '+201000000000',
  'EG',
  false,
  'other',
  'A different request title',
  'This changed content must not replace the first submission.',
  null,
  null,
  'en',
  'consent-en-v1',
  null,
  null,
  null
);

select ok(
  (select replayed from replayed_submission),
  'the same form and idempotency key should return a replay result'
);
select is(
  (select request_id from replayed_submission),
  (select request_id from first_submission),
  'an idempotent replay should return the original request'
);
select is(
  (
    select count(*)::integer
    from public.requests
    where public_form_id = '00000000-0000-4000-8000-000000000051'
      and idempotency_key = '00000000-0000-4000-8000-000000000511'
  ),
  1,
  'an idempotent replay should not insert a duplicate request'
);

create temporary table first_review on commit drop as
select *
from public.start_review(
  (select request_id from first_submission),
  '00000000-0000-4000-8000-000000000502'
);

select ok(
  (select transitioned from first_review),
  'the first Start Review action should transition the request'
);
select is(
  (select status from first_review),
  'under_review',
  'Start Review should move a submitted request to under review'
);

create temporary table repeated_review on commit drop as
select *
from public.start_review(
  (select request_id from first_submission),
  '00000000-0000-4000-8000-000000000501'
);

select ok(
  not (select transitioned from repeated_review),
  'repeated Start Review should be idempotent across the approver pool'
);
select is(
  (
    select count(*)::integer
    from public.audit_events
    where request_id = (select request_id from first_submission)
      and event_type = 'review_started'
  ),
  1,
  'repeated Start Review should not duplicate its audit event'
);

create temporary table approval_result on commit drop as
select *
from public.decide_request(
  (select request_id from first_submission),
  '00000000-0000-4000-8000-000000000501',
  'approved',
  null
);

select is(
  (select status from approval_result),
  'approved',
  'an administrator should be able to approve an under-review request'
);
select is(
  (
    select count(*)::integer
    from public.approval_decisions
    where request_id = (select request_id from first_submission)
      and decided_by = '00000000-0000-4000-8000-000000000501'
      and actor_role = 'admin'
  ),
  1,
  'approval should preserve the actual actor and effective role'
);
select is(
  (
    select count(*)::integer
    from public.integration_deliveries
    where request_id = (select request_id from first_submission)
      and status = 'pending'
  ),
  1,
  'approval should atomically create one pending delivery'
);
select is(
  (
    select count(*)::integer
    from public.audit_events
    where request_id = (select request_id from first_submission)
      and event_type in ('request_approved', 'job_created')
  ),
  2,
  'approval should record both the decision and delivery creation'
);
select throws_ok(
  format(
    'select * from public.decide_request(%L, %L, %L, null)',
    (select request_id from first_submission),
    '00000000-0000-4000-8000-000000000502',
    'approved'
  ),
  'P0001',
  'request_conflict',
  'the first final decision should win'
);

create temporary table rejected_submission on commit drop as
select *
from public.submit_request(
  'phase-five-request-form',
  '00000000-0000-4000-8000-000000000512',
  'company',
  'Mona Ali',
  'mona@example.test',
  '+966501234567',
  '+966501234567',
  'SA',
  false,
  'training',
  'Team training request',
  'We need a practical training program for our operations team.',
  null,
  'phone',
  'ar',
  'consent-ar-v1',
  'Mona Company',
  'Operations Manager',
  'https://example.test'
);

select throws_ok(
  format(
    'select * from public.decide_request(%L, %L, %L, null)',
    (select request_id from rejected_submission),
    '00000000-0000-4000-8000-000000000502',
    'rejected'
  ),
  'P0001',
  'request_conflict',
  'a request cannot be decided before Start Review'
);

create temporary table rejection_review on commit drop as
select *
from public.start_review(
  (select request_id from rejected_submission),
  '00000000-0000-4000-8000-000000000502'
);

select throws_ok(
  format(
    'select * from public.decide_request(%L, %L, %L, %L)',
    (select request_id from rejected_submission),
    '00000000-0000-4000-8000-000000000502',
    'rejected',
    'no'
  ),
  'P0001',
  'invalid_decision',
  'a rejection reason should be meaningful and bounded'
);

create temporary table rejection_result on commit drop as
select *
from public.decide_request(
  (select request_id from rejected_submission),
  '00000000-0000-4000-8000-000000000502',
  'rejected',
  'The requested timing is not currently available.'
);

select is(
  (select status from rejection_result),
  'rejected',
  'an approver should be able to reject with a valid reason'
);
select is(
  (
    select reason
    from public.approval_decisions
    where request_id = (select request_id from rejected_submission)
  ),
  'The requested timing is not currently available.',
  'rejection should store its required reason'
);
select is(
  (
    select count(*)::integer
    from public.integration_deliveries
    where request_id = (select request_id from rejected_submission)
  ),
  0,
  'rejection should not create a delivery'
);
select throws_ok(
  format(
    'select * from public.start_review(%L, %L)',
    (select request_id from rejected_submission),
    '00000000-0000-4000-8000-000000000503'
  ),
  'P0001',
  'access_denied',
  'an inactive actor should lose mutation access immediately'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.submit_request(text,uuid,text,text,text,text,text,text,boolean,text,text,text,date,text,text,text,text,text,text)',
    'execute'
  )
  and not has_function_privilege(
    'authenticated',
    'public.submit_request(text,uuid,text,text,text,text,text,text,boolean,text,text,text,date,text,text,text,text,text,text)',
    'execute'
  ),
  'public submission should remain behind the trusted server boundary'
);

select * from finish();

rollback;
