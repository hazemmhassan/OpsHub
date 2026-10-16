begin;

select plan(22);

select has_table('public', 'public_forms', 'public forms should exist');
select has_table('public', 'requests', 'requests should exist');
select has_table(
  'public',
  'request_submission_snapshots',
  'immutable request snapshots should exist'
);
select has_table(
  'public',
  'approval_decisions',
  'approval decisions should exist'
);
select has_table('public', 'audit_events', 'audit events should exist');
select has_table(
  'public',
  'integration_deliveries',
  'integration deliveries should exist'
);
select has_table(
  'public',
  'webhook_endpoints',
  'webhook endpoints should exist'
);

select col_is_pk('public', 'public_forms', 'id', 'public forms use UUID IDs');
select col_is_pk('public', 'requests', 'id', 'requests use UUID IDs');
select col_is_pk(
  'public',
  'request_submission_snapshots',
  'request_id',
  'each request has one snapshot'
);
select col_is_pk(
  'public',
  'approval_decisions',
  'id',
  'approval decisions use UUID IDs'
);
select col_is_pk(
  'public',
  'integration_deliveries',
  'id',
  'deliveries use UUID IDs'
);

select ok(
  (
    select bool_and(relrowsecurity)
    from pg_catalog.pg_class
    where oid in (
      'public.public_forms'::regclass,
      'public.requests'::regclass,
      'public.request_submission_snapshots'::regclass,
      'public.approval_decisions'::regclass,
      'public.audit_events'::regclass,
      'public.integration_deliveries'::regclass,
      'public.webhook_endpoints'::regclass
    )
  ),
  'every exposed Phase 5 table should have RLS enabled'
);

select has_index(
  'public',
  'requests',
  'requests_public_form_id_idempotency_key_key',
  'submission idempotency should have a unique database guard'
);
select has_index(
  'public',
  'requests',
  'requests_reference_key',
  'request references should be globally unique'
);
select has_index(
  'public',
  'approval_decisions',
  'approval_decisions_request_id_key',
  'each request should have at most one final decision'
);
select has_index(
  'public',
  'integration_deliveries',
  'integration_deliveries_request_id_key',
  'each approved request should have one P0 delivery'
);

select fk_ok(
  'public',
  'requests',
  array['public_form_id', 'org_id'],
  'public',
  'public_forms',
  array['id', 'org_id'],
  'a request and its public form should belong to the same organization'
);
select fk_ok(
  'public',
  'request_submission_snapshots',
  array['request_id', 'org_id'],
  'public',
  'requests',
  array['id', 'org_id'],
  'a snapshot and request should belong to the same organization'
);
select fk_ok(
  'public',
  'approval_decisions',
  array['request_id', 'org_id'],
  'public',
  'requests',
  array['id', 'org_id'],
  'a decision and request should belong to the same organization'
);
select fk_ok(
  'public',
  'integration_deliveries',
  array['request_id', 'org_id'],
  'public',
  'requests',
  array['id', 'org_id'],
  'a delivery and request should belong to the same organization'
);
select fk_ok(
  'public',
  'audit_events',
  'org_id',
  'public',
  'organizations',
  'id',
  'every audit event should retain an enforced organization'
);

select * from finish();

rollback;
