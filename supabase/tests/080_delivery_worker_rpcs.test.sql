begin;

select plan(37);

insert into public.public_forms (
  id,
  org_id,
  public_id,
  form_version,
  consent_text_version_ar,
  consent_text_version_en
)
values (
  '00000000-0000-4000-8000-000000000081',
  '00000000-0000-4000-8000-000000000001',
  'phase-six-delivery-form',
  1,
  'consent-ar-v1',
  'consent-en-v1'
);

insert into public.webhook_endpoints (
  id,
  org_id,
  name,
  destination_type,
  url,
  signing_secret_ref
)
values (
  '00000000-0000-4000-8000-000000000021',
  '00000000-0000-4000-8000-000000000001',
  'Phase 6 receiver',
  'n8n_google_sheets',
  'http://127.0.0.1:5678/webhook/opshub-phase-six',
  'OPSHUB_PHASE_6_SIGNING_SECRET'
)
on conflict (id) do update set
  name = excluded.name,
  url = excluded.url,
  signing_secret_ref = excluded.signing_secret_ref,
  is_active = true;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '00000000-0000-4000-8000-000000000801', 'authenticated',
    'authenticated', 'phase6-admin@example.test', '', now(), '{}'::jsonb,
    '{}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-4000-8000-000000000802', 'authenticated',
    'authenticated', 'phase6-approver@example.test', '', now(), '{}'::jsonb,
    '{}'::jsonb, now(), now()
  );

insert into public.profiles (user_id, display_name, preferred_locale)
values
  ('00000000-0000-4000-8000-000000000801', 'Phase 6 Admin', 'en'),
  ('00000000-0000-4000-8000-000000000802', 'Phase 6 Approver', 'en');

insert into public.organization_members (org_id, user_id, role, is_active)
values
  (
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000801',
    'admin',
    true
  ),
  (
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000802',
    'approver',
    true
  );

insert into public.requests (
  id,
  org_id,
  public_form_id,
  reference,
  idempotency_key,
  status,
  review_started_at,
  decided_at
)
select
  ('00000000-0000-4000-8000-' || lpad((810 + value)::text, 12, '0'))::uuid,
  '00000000-0000-4000-8000-000000000001'::uuid,
  '00000000-0000-4000-8000-000000000081'::uuid,
  '6A0000000' || value::text,
  ('00000000-0000-4000-8000-' || lpad((850 + value)::text, 12, '0'))::uuid,
  'approved',
  statement_timestamp() - interval '2 minutes',
  statement_timestamp() - interval '1 minute'
from generate_series(1, 7) as value;

insert into public.request_submission_snapshots (
  request_id,
  org_id,
  requester_type,
  contact_name,
  email,
  phone_raw,
  phone_e164,
  country_code,
  service_category,
  request_title,
  description,
  preferred_contact_method,
  submitted_locale,
  consent_text_version,
  consent_locale,
  form_version
)
select
  ('00000000-0000-4000-8000-' || lpad((810 + value)::text, 12, '0'))::uuid,
  '00000000-0000-4000-8000-000000000001'::uuid,
  'individual',
  'Synthetic User',
  'synthetic@example.test',
  '+201000000000',
  '+201000000000',
  'EG',
  'consulting',
  'Synthetic request',
  'Synthetic Phase 6 delivery request for database testing.',
  'email',
  'en',
  'consent-en-v1',
  'en',
  1
from generate_series(1, 7) as value;

insert into public.integration_deliveries (
  id,
  org_id,
  request_id,
  webhook_endpoint_id,
  idempotency_key,
  payload,
  status,
  available_at,
  attempt_count,
  max_attempts,
  locked_at,
  locked_until,
  lock_token,
  locked_by,
  last_error_code,
  last_error_message,
  last_attempt_at
)
values
  (
    '00000000-0000-4000-8000-000000000821',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000811',
    '00000000-0000-4000-8000-000000000021',
    'phase6:pending-due',
    '{"event_id":"00000000-0000-4000-8000-000000000821","request":{"reference":"6A00000001"}}',
    'pending', now() - interval '1 minute', 0, 5,
    null, null, null, null, null, null, null
  ),
  (
    '00000000-0000-4000-8000-000000000822',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000812',
    '00000000-0000-4000-8000-000000000021',
    'phase6:failed-due',
    '{"event_id":"00000000-0000-4000-8000-000000000822","request":{"reference":"6A00000002"}}',
    'failed', now() - interval '30 seconds', 1, 5,
    null, null, null, null, 'network_timeout', 'The receiver timed out.', now() - interval '1 minute'
  ),
  (
    '00000000-0000-4000-8000-000000000823',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000813',
    '00000000-0000-4000-8000-000000000021',
    'phase6:future',
    '{"event_id":"00000000-0000-4000-8000-000000000823","request":{"reference":"6A00000003"}}',
    'pending', now() + interval '1 hour', 0, 5,
    null, null, null, null, null, null, null
  ),
  (
    '00000000-0000-4000-8000-000000000824',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000814',
    '00000000-0000-4000-8000-000000000021',
    'phase6:expired-reclaimable',
    '{"event_id":"00000000-0000-4000-8000-000000000824","request":{"reference":"6A00000004"}}',
    'processing', now() - interval '2 minutes', 1, 5,
    now() - interval '2 minutes', now() - interval '1 minute',
    '00000000-0000-4000-8000-000000009994', 'crashed-worker', null, null,
    now() - interval '2 minutes'
  ),
  (
    '00000000-0000-4000-8000-000000000825',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000815',
    '00000000-0000-4000-8000-000000000021',
    'phase6:expired-exhausted',
    '{"event_id":"00000000-0000-4000-8000-000000000825","request":{"reference":"6A00000005"}}',
    'processing', now() - interval '2 minutes', 5, 5,
    now() - interval '2 minutes', now() - interval '1 minute',
    '00000000-0000-4000-8000-000000009995', 'crashed-worker', null, null,
    now() - interval '2 minutes'
  ),
  (
    '00000000-0000-4000-8000-000000000826',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000816',
    '00000000-0000-4000-8000-000000000021',
    'phase6:manual-retry',
    '{"event_id":"00000000-0000-4000-8000-000000000826","request":{"reference":"6A00000006"}}',
    'dead', now() - interval '1 minute', 5, 5,
    null, null, null, null, 'invalid_response', 'Receiver response did not match.',
    now() - interval '1 minute'
  );

select throws_ok(
  $$
    update public.integration_deliveries
    set payload = '{"changed":true}'::jsonb
    where id = '00000000-0000-4000-8000-000000000821'
  $$,
  'P0001',
  'immutable_delivery_contract',
  'the approved delivery payload must remain immutable across every retry'
);
select throws_ok(
  $$
    update public.integration_deliveries
    set idempotency_key = 'phase6:rewritten'
    where id = '00000000-0000-4000-8000-000000000821'
  $$,
  'P0001',
  'immutable_delivery_contract',
  'the stable idempotency key must not be rewritten after approval'
);
select throws_ok(
  $$
    update public.integration_deliveries
    set request_id = '00000000-0000-4000-8000-000000000817'
    where id = '00000000-0000-4000-8000-000000000821'
  $$,
  'P0001',
  'immutable_delivery_contract',
  'a delivery must never be reassigned to a different request'
);
select lives_ok(
  $$
    update public.integration_deliveries
    set available_at = available_at + interval '1 second'
    where id = '00000000-0000-4000-8000-000000000823'
  $$,
  'operational queue fields should remain writable by trusted queue functions'
);
select throws_ok(
  $$
    update public.integration_deliveries
    set last_http_status = 99
    where id = '00000000-0000-4000-8000-000000000826'
  $$,
  '23514',
  null,
  'invalid HTTP metadata must fail even when application validation is bypassed'
);
select throws_ok(
  $$
    update public.integration_deliveries
    set last_error_message = repeat('x', 301)
    where id = '00000000-0000-4000-8000-000000000826'
  $$,
  '23514',
  null,
  'oversized error details must not enter the admin-visible database record'
);

select has_function(
  'public',
  'claim_integration_deliveries',
  array['integer', 'text', 'integer'],
  'the worker claim RPC should exist'
);
select has_function(
  'public',
  'record_delivery_success',
  array['uuid', 'uuid', 'integer', 'uuid', 'text', 'text'],
  'the fenced success RPC should exist'
);
select has_function(
  'public',
  'record_delivery_failure',
  array['uuid', 'uuid', 'boolean', 'integer', 'text', 'text', 'integer'],
  'the fenced failure RPC should exist'
);
select has_function(
  'public',
  'manual_retry',
  array['uuid', 'uuid'],
  'the admin manual-retry RPC should exist'
);

select throws_ok(
  $$select * from public.claim_integration_deliveries(0, 'phase6-worker', 60)$$,
  'P0001',
  'invalid_claim_parameters',
  'a zero-size claim must be rejected before it can create a broken worker loop'
);

create temporary table claimed_deliveries on commit drop as
select *
from public.claim_integration_deliveries(10, 'phase6-worker', 60);

select is(
  (select count(*)::integer from claimed_deliveries),
  3,
  'one worker should claim only due work with retry budget remaining'
);
select is(
  (select count(*)::integer from claimed_deliveries where attempt_count in (1, 2)),
  3,
  'claiming should consume exactly one attempt for each delivery'
);
select ok(
  (
    select bool_and(
      status = 'processing'
      and lock_token is not null
      and locked_until > locked_at
      and locked_by = 'phase6-worker'
    )
    from public.integration_deliveries
    where id in (select delivery_id from claimed_deliveries)
  ),
  'claimed jobs should receive a complete lease and fencing token'
);
select is(
  (select status from public.integration_deliveries where id = '00000000-0000-4000-8000-000000000823'),
  'pending',
  'future work must remain unclaimed'
);
select is(
  (select status from public.integration_deliveries where id = '00000000-0000-4000-8000-000000000825'),
  'dead',
  'an expired lease with no retry budget should become dead'
);
select is(
  (
    select count(*)::integer
    from public.audit_events
    where event_type = 'delivery_attempt_started'
      and delivery_id in (select delivery_id from claimed_deliveries)
  ),
  3,
  'each claim should append an attempt-started audit event'
);
select is(
  (
    select count(*)::integer
    from public.audit_events
    where event_type = 'delivery_dead'
      and delivery_id = '00000000-0000-4000-8000-000000000825'
  ),
  1,
  'automatic dead-lettering should remain visible in the audit trail'
);
select is(
  (
    select count(*)::integer
    from public.claim_integration_deliveries(10, 'competing-worker', 60)
  ),
  0,
  'a competing worker must not receive already leased deliveries'
);
select is(
  (
    select endpoint_url
    from claimed_deliveries
    where delivery_id = '00000000-0000-4000-8000-000000000821'
  ),
  'http://127.0.0.1:5678/webhook/opshub-phase-six',
  'a claim should return the endpoint needed outside the transaction'
);
select is(
  (
    select signing_secret_ref
    from claimed_deliveries
    where delivery_id = '00000000-0000-4000-8000-000000000821'
  ),
  'OPSHUB_PHASE_6_SIGNING_SECRET',
  'a claim should return only the secret reference, never secret material'
);

select throws_ok(
  $$
    select * from public.record_delivery_success(
      '00000000-0000-4000-8000-000000000821',
      '00000000-0000-4000-8000-000000009999',
      200,
      '00000000-0000-4000-8000-000000000821',
      '6A00000001',
      'upserted'
    )
  $$,
  'P0001',
  'delivery_lease_conflict',
  'a stale worker token must not overwrite the active attempt'
);

update public.integration_deliveries
set locked_until = now() - interval '1 millisecond'
where id = '00000000-0000-4000-8000-000000000821';

select is(
  (
    select status
    from public.record_delivery_success(
      '00000000-0000-4000-8000-000000000821',
      (
        select lock_token
        from claimed_deliveries
        where delivery_id = '00000000-0000-4000-8000-000000000821'
      ),
      200,
      '00000000-0000-4000-8000-000000000821',
      '6A00000001',
      'upserted'
    )
  ),
  'succeeded',
  'the current fencing token should accept a valid result even just after lease expiry'
);
select ok(
  (
    select status = 'succeeded'
      and succeeded_at is not null
      and lock_token is null
      and last_http_status = 200
    from public.integration_deliveries
    where id = '00000000-0000-4000-8000-000000000821'
  ),
  'success should store safe metadata and release the lease'
);
select is(
  (
    select count(*)::integer
    from public.audit_events
    where delivery_id = '00000000-0000-4000-8000-000000000821'
      and event_type = 'delivery_succeeded'
  ),
  1,
  'success should append one audit event'
);

select throws_ok(
  format(
    $sql$
      select * from public.record_delivery_success(
        %L, %L, 200, %L, %L, 'upserted'
      )
    $sql$,
    '00000000-0000-4000-8000-000000000822',
    (
      select lock_token
      from claimed_deliveries
      where delivery_id = '00000000-0000-4000-8000-000000000822'
    ),
    '00000000-0000-4000-8000-000000000822',
    'WRONGREF01'
  ),
  'P0001',
  'invalid_delivery_result',
  'a mismatched receiver reference must not be accepted as success'
);

select throws_ok(
  format(
    $sql$
      select * from public.record_delivery_failure(
        %L, %L, true, 503, 'receiver_unavailable', %L, 15
      )
    $sql$,
    '00000000-0000-4000-8000-000000000822',
    (
      select lock_token
      from claimed_deliveries
      where delivery_id = '00000000-0000-4000-8000-000000000822'
    ),
    repeat('x', 301)
  ),
  'P0001',
  'invalid_delivery_failure',
  'the failure RPC must reject details larger than the approved safe limit'
);

select is(
  (
    select status
    from public.record_delivery_failure(
      '00000000-0000-4000-8000-000000000822',
      (
        select lock_token
        from claimed_deliveries
        where delivery_id = '00000000-0000-4000-8000-000000000822'
      ),
      true,
      503,
      'receiver_unavailable',
      'The receiver is temporarily unavailable.',
      15
    )
  ),
  'failed',
  'a retryable failure with budget should return to failed state'
);
select ok(
  (
    select status = 'failed'
      and available_at between now() + interval '14 seconds' and now() + interval '16 seconds'
      and lock_token is null
      and last_http_status = 503
      and last_error_code = 'receiver_unavailable'
    from public.integration_deliveries
    where id = '00000000-0000-4000-8000-000000000822'
  ),
  'retry scheduling should persist the safe failure and deterministic test delay'
);
select is(
  (
    select count(*)::integer
    from public.audit_events
    where delivery_id = '00000000-0000-4000-8000-000000000822'
      and event_type = 'delivery_failed'
  ),
  1,
  'a retryable failure should append a delivery-failed audit event'
);

select is(
  (
    select status
    from public.record_delivery_failure(
      '00000000-0000-4000-8000-000000000824',
      (
        select lock_token
        from claimed_deliveries
        where delivery_id = '00000000-0000-4000-8000-000000000824'
      ),
      false,
      422,
      'invalid_receiver_contract',
      'The receiver response did not match the event.',
      null
    )
  ),
  'dead',
  'a non-retryable contract failure should move directly to dead state'
);
select is(
  (
    select count(*)::integer
    from public.audit_events
    where delivery_id = '00000000-0000-4000-8000-000000000824'
      and event_type = 'delivery_dead'
  ),
  1,
  'a permanent failure should append a dead-letter audit event'
);

select throws_ok(
  $$
    select * from public.manual_retry(
      '00000000-0000-4000-8000-000000000826',
      '00000000-0000-4000-8000-000000000802'
    )
  $$,
  'P0001',
  'access_denied',
  'an approver must not grant an additional delivery attempt'
);
select is(
  (
    select status
    from public.manual_retry(
      '00000000-0000-4000-8000-000000000826',
      '00000000-0000-4000-8000-000000000801'
    )
  ),
  'pending',
  'an active administrator should be able to schedule a dead delivery'
);
select ok(
  (
    select status = 'pending'
      and attempt_count = 5
      and max_attempts = 6
      and last_error_code is null
      and last_error_message is null
    from public.integration_deliveries
    where id = '00000000-0000-4000-8000-000000000826'
  ),
  'manual retry should preserve attempt history and add exactly one attempt'
);
select is(
  (
    select count(*)::integer
    from public.audit_events
    where delivery_id = '00000000-0000-4000-8000-000000000826'
      and event_type = 'manual_retry'
      and actor_user_id = '00000000-0000-4000-8000-000000000801'
      and actor_role = 'admin'
  ),
  1,
  'manual retry should preserve the administrator in the audit trail'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.claim_integration_deliveries(integer,text,integer)',
    'execute'
  )
  and not has_function_privilege(
    'authenticated',
    'public.claim_integration_deliveries(integer,text,integer)',
    'execute'
  )
  and not has_function_privilege(
    'anon',
    'public.manual_retry(uuid,uuid)',
    'execute'
  )
  and not has_function_privilege(
    'authenticated',
    'public.manual_retry(uuid,uuid)',
    'execute'
  ),
  'delivery mutations should remain behind the trusted service-role boundary'
);

select * from finish();

rollback;
