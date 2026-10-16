begin;

select plan(10);

insert into public.organizations (id, name, default_locale, timezone)
values (
  '00000000-0000-4000-8000-000000000072',
  'Workflow Tenant B',
  'en',
  'UTC'
);

insert into public.public_forms (
  id, org_id, public_id, form_version,
  consent_text_version_ar, consent_text_version_en
)
values
  (
    '00000000-0000-4000-8000-000000000071',
    '00000000-0000-4000-8000-000000000001',
    'workflow-tenant-a-form', 1, 'consent-ar-v1', 'consent-en-v1'
  ),
  (
    '00000000-0000-4000-8000-000000000072',
    '00000000-0000-4000-8000-000000000072',
    'workflow-tenant-b-form', 1, 'consent-ar-v1', 'consent-en-v1'
  );

insert into public.webhook_endpoints (
  id, org_id, name, destination_type, url, signing_secret_ref
)
values (
  '00000000-0000-4000-8000-000000000073',
  '00000000-0000-4000-8000-000000000001',
  'Workflow RLS endpoint',
  'n8n_google_sheets',
  'http://n8n:5678/webhook/workflow-rls',
  'WORKFLOW_RLS_SECRET'
)
on conflict (org_id, destination_type) do update set
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
    '00000000-0000-4000-8000-000000000701', 'authenticated',
    'authenticated', 'workflow-approver-a@example.test', '', now(),
    '{}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-4000-8000-000000000702', 'authenticated',
    'authenticated', 'workflow-admin-a@example.test', '', now(),
    '{}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-4000-8000-000000000703', 'authenticated',
    'authenticated', 'workflow-admin-b@example.test', '', now(),
    '{}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-4000-8000-000000000704', 'authenticated',
    'authenticated', 'workflow-outsider@example.test', '', now(),
    '{}'::jsonb, '{}'::jsonb, now(), now()
  );

insert into public.profiles (user_id, display_name, preferred_locale)
values
  ('00000000-0000-4000-8000-000000000701', 'Workflow Approver A', 'en'),
  ('00000000-0000-4000-8000-000000000702', 'Workflow Admin A', 'en'),
  ('00000000-0000-4000-8000-000000000703', 'Workflow Admin B', 'en'),
  ('00000000-0000-4000-8000-000000000704', 'Workflow Outsider', 'en');

insert into public.organization_members (org_id, user_id, role)
values
  (
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000701',
    'approver'
  ),
  (
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000702',
    'admin'
  ),
  (
    '00000000-0000-4000-8000-000000000072',
    '00000000-0000-4000-8000-000000000703',
    'admin'
  );

create temporary table request_a on commit drop as
select * from public.submit_request(
  'workflow-tenant-a-form', '00000000-0000-4000-8000-000000000711',
  'individual', 'Tenant A Contact', 'a@example.test', '+201000000001',
  '+201000000001', 'EG', false, 'consulting', 'Tenant A request',
  'A valid description for the first tenant request.', null, 'email',
  'en', 'consent-en-v1', null, null, null
);

create temporary table request_b on commit drop as
select * from public.submit_request(
  'workflow-tenant-b-form', '00000000-0000-4000-8000-000000000712',
  'individual', 'Tenant B Contact', 'b@example.test', '+971501234567',
  '+971501234567', 'AE', false, 'training', 'Tenant B request',
  'A valid description for the second tenant request.', null, 'phone',
  'en', 'consent-en-v1', null, null, null
);

select * from public.start_review(
  (select request_id from request_a),
  '00000000-0000-4000-8000-000000000701'
);
select * from public.decide_request(
  (select request_id from request_a),
  '00000000-0000-4000-8000-000000000702',
  'approved',
  null
);

select ok(
  not has_table_privilege('anon', 'public.public_forms', 'select')
  and not has_table_privilege('anon', 'public.requests', 'select')
  and not has_table_privilege('anon', 'public.request_submission_snapshots', 'select')
  and not has_table_privilege('anon', 'public.approval_decisions', 'select')
  and not has_table_privilege('anon', 'public.audit_events', 'select')
  and not has_table_privilege('anon', 'public.integration_deliveries', 'select'),
  'anonymous callers should have no workflow-table read grants'
);

select ok(
  not has_table_privilege('authenticated', 'public.requests', 'insert, update, delete')
  and not has_table_privilege('authenticated', 'public.request_submission_snapshots', 'insert, update, delete')
  and not has_table_privilege('authenticated', 'public.approval_decisions', 'insert, update, delete')
  and not has_table_privilege('authenticated', 'public.audit_events', 'insert, update, delete')
  and not has_table_privilege('authenticated', 'public.integration_deliveries', 'insert, update, delete'),
  'authenticated callers should have no direct workflow write grants'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000701","role":"authenticated"}',
  true
);

select is((
  select count(*)::integer from public.requests
  where idempotency_key = '00000000-0000-4000-8000-000000000711'
), 1, 'an approver should see their organization request fixture');
select is((
  select count(*)::integer from public.request_submission_snapshots
  where request_id = (
    select id from public.requests
    where idempotency_key = '00000000-0000-4000-8000-000000000711'
  )
), 1, 'an approver should see their organization snapshot fixture');
select is((
  select count(*)::integer from public.approval_decisions
  where request_id = (
    select id from public.requests
    where idempotency_key = '00000000-0000-4000-8000-000000000711'
  )
), 1, 'an approver should see their organization decision fixture');
select is((
  select count(*)::integer from public.audit_events
  where request_id = (
    select id from public.requests
    where idempotency_key = '00000000-0000-4000-8000-000000000711'
  )
), 4, 'an approver should see the complete fixture request timeline');
select is((select count(*)::integer from public.integration_deliveries), 0,
  'an approver should not see integration delivery internals');

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000702","role":"authenticated"}',
  true
);
select is((
  select count(*)::integer from public.integration_deliveries
  where request_id = (
    select id from public.requests
    where idempotency_key = '00000000-0000-4000-8000-000000000711'
  )
), 1, 'an administrator should see their organization delivery fixture');

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000703","role":"authenticated"}',
  true
);
select is((select count(*)::integer from public.requests), 1,
  'a second-tenant administrator should see only their own request');

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000704","role":"authenticated"}',
  true
);
select is(
  (select count(*)::integer from public.requests)
  + (select count(*)::integer from public.request_submission_snapshots)
  + (select count(*)::integer from public.approval_decisions)
  + (select count(*)::integer from public.audit_events)
  + (select count(*)::integer from public.integration_deliveries),
  0,
  'a user without membership should see no workflow data'
);

select * from finish();

rollback;
