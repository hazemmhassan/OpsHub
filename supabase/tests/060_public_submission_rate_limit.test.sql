begin;

select plan(9);

insert into public.public_forms (
  id,
  org_id,
  public_id,
  form_version,
  consent_text_version_ar,
  consent_text_version_en
)
values (
  '00000000-0000-4000-8000-000000000061',
  '00000000-0000-4000-8000-000000000001',
  'rate-limit-request-form',
  1,
  'consent-ar-v1',
  'consent-en-v1'
);

select has_table(
  'private',
  'public_submission_rate_limits',
  'the operational rate-limit table should exist outside the public schema'
);

select has_function(
  'public',
  'consume_public_submission_rate_limit',
  array['uuid', 'bytea'],
  'the trusted rate-limit RPC should exist'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.consume_public_submission_rate_limit(uuid,bytea)',
    'execute'
  )
  and not has_function_privilege(
    'authenticated',
    'public.consume_public_submission_rate_limit(uuid,bytea)',
    'execute'
  )
  and has_function_privilege(
    'service_role',
    'public.consume_public_submission_rate_limit(uuid,bytea)',
    'execute'
  ),
  'only the trusted server role should consume the submission budget'
);

select ok(
  has_schema_privilege('service_role', 'private', 'usage'),
  'the trusted server role should access the private rate-limit table'
);

select ok(
  (select allowed from public.consume_public_submission_rate_limit(
    '00000000-0000-4000-8000-000000000061',
    decode(repeat('ab', 32), 'hex')
  )),
  'the first submission should be allowed'
);

select ok(
  (select allowed from public.consume_public_submission_rate_limit(
    '00000000-0000-4000-8000-000000000061',
    decode(repeat('ab', 32), 'hex')
  )),
  'the second submission should be allowed'
);

select ok(
  (select allowed from public.consume_public_submission_rate_limit(
    '00000000-0000-4000-8000-000000000061',
    decode(repeat('ab', 32), 'hex')
  )),
  'the third submission should be allowed'
);

select ok(
  (select allowed from public.consume_public_submission_rate_limit(
    '00000000-0000-4000-8000-000000000061',
    decode(repeat('ab', 32), 'hex')
  )),
  'the fourth submission should be allowed'
);

select ok(
  (select allowed from public.consume_public_submission_rate_limit(
    '00000000-0000-4000-8000-000000000061',
    decode(repeat('ab', 32), 'hex')
  ))
  and not (select allowed from public.consume_public_submission_rate_limit(
    '00000000-0000-4000-8000-000000000061',
    decode(repeat('ab', 32), 'hex')
  )),
  'the fifth submission should pass and the sixth should be rejected'
);

select * from finish();

rollback;
