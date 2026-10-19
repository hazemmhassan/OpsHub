begin;

select plan(6);

insert into public.public_forms (
  id,
  org_id,
  public_id,
  form_version,
  consent_text_version_ar,
  consent_text_version_en
)
values (
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000001',
  'ai-rate-limit-request-form',
  1,
  'consent-ar-v1',
  'consent-en-v1'
);

select has_table(
  'private',
  'ai_intake_rate_limits',
  'the AI rate-limit table should be private'
);

select has_function(
  'public',
  'consume_ai_intake_rate_limit',
  array['uuid', 'bytea'],
  'the trusted AI rate-limit RPC should exist'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.consume_ai_intake_rate_limit(uuid,bytea)',
    'execute'
  )
  and not has_function_privilege(
    'authenticated',
    'public.consume_ai_intake_rate_limit(uuid,bytea)',
    'execute'
  )
  and has_function_privilege(
    'service_role',
    'public.consume_ai_intake_rate_limit(uuid,bytea)',
    'execute'
  ),
  'only the trusted server role should consume the AI budget'
);

select ok(
  (
    select bool_and(result.allowed)
    from generate_series(1, 20) as attempt
    cross join lateral public.consume_ai_intake_rate_limit(
      '00000000-0000-4000-8000-000000000101',
      decode(repeat('cd', 31) || lpad(to_hex(205 + attempt * 0), 2, '0'), 'hex')
    ) as result
  ),
  'the first 20 AI turns in the window should be allowed'
);

select ok(
  not (
    select allowed
    from public.consume_ai_intake_rate_limit(
      '00000000-0000-4000-8000-000000000101',
      decode(repeat('cd', 32), 'hex')
    )
  ),
  'the twenty-first AI turn should be rejected'
);

select throws_ok(
  $$
    select * from public.consume_ai_intake_rate_limit(
      '00000000-0000-4000-8000-000000000101',
      decode('abcd', 'hex')
    )
  $$,
  'P0001',
  'invalid_rate_limit_subject',
  'an invalid subject hash should be rejected'
);

select * from finish();

rollback;
