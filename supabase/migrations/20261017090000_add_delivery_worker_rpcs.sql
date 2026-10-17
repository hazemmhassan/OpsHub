alter table public.integration_deliveries
  add constraint integration_deliveries_http_status_check check (
    last_http_status is null or last_http_status between 100 and 599
  ),
  add constraint integration_deliveries_error_code_check check (
    last_error_code is null
    or (
      last_error_code = btrim(last_error_code)
      and last_error_code ~ '^[a-z0-9_]{1,80}$'
    )
  ),
  add constraint integration_deliveries_error_message_check check (
    last_error_message is null
    or (
      last_error_message = btrim(last_error_message)
      and char_length(last_error_message) between 1 and 300
    )
  ),
  add constraint integration_deliveries_locked_by_check check (
    locked_by is null
    or (
      locked_by = btrim(locked_by)
      and char_length(locked_by) between 1 and 120
    )
  );

create or replace function private.reject_delivery_contract_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (
    new.org_id,
    new.request_id,
    new.webhook_endpoint_id,
    new.event_type,
    new.event_version,
    new.idempotency_key,
    new.payload
  ) is distinct from (
    old.org_id,
    old.request_id,
    old.webhook_endpoint_id,
    old.event_type,
    old.event_version,
    old.idempotency_key,
    old.payload
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'immutable_delivery_contract';
  end if;

  return new;
end;
$$;

create trigger integration_deliveries_reject_contract_update
before update on public.integration_deliveries
for each row execute function private.reject_delivery_contract_update();

create or replace function public.claim_integration_deliveries(
  p_batch_size integer,
  p_worker_id text,
  p_lease_seconds integer
)
returns table (
  delivery_id uuid,
  org_id uuid,
  request_id uuid,
  event_type text,
  event_version integer,
  idempotency_key text,
  payload jsonb,
  attempt_count integer,
  lock_token uuid,
  locked_until timestamptz,
  endpoint_url text,
  signing_secret_ref text
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_delivery public.integration_deliveries%rowtype;
  v_lock_token uuid;
  v_now timestamptz := statement_timestamp();
  v_worker_id text := btrim(p_worker_id);
begin
  if p_batch_size is null
    or p_batch_size not between 1 and 20
    or p_worker_id is null
    or v_worker_id = ''
    or char_length(v_worker_id) > 120
    or p_lease_seconds is null
    or p_lease_seconds not between 16 and 300
  then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_claim_parameters';
  end if;

  for v_delivery in
    select delivery.*
    from public.integration_deliveries as delivery
    where delivery.status = 'processing'
      and delivery.locked_until < v_now
      and delivery.attempt_count >= delivery.max_attempts
    order by delivery.locked_until, delivery.id
    limit p_batch_size
    for update skip locked
  loop
    update public.integration_deliveries as delivery
    set
      status = 'dead',
      locked_at = null,
      locked_until = null,
      lock_token = null,
      locked_by = null,
      last_error_code = 'lease_expired_attempts_exhausted',
      last_error_message = 'The delivery lease expired after the final automatic attempt.'
    where delivery.id = v_delivery.id;

    insert into public.audit_events (
      org_id,
      request_id,
      delivery_id,
      event_type,
      actor_type,
      metadata
    )
    values (
      v_delivery.org_id,
      v_delivery.request_id,
      v_delivery.id,
      'delivery_dead',
      'system',
      pg_catalog.jsonb_build_object(
        'attempt_count', v_delivery.attempt_count,
        'error_code', 'lease_expired_attempts_exhausted'
      )
    );
  end loop;

  for v_delivery in
    select delivery.*
    from public.integration_deliveries as delivery
    where delivery.attempt_count < delivery.max_attempts
      and (
        (
          delivery.status in ('pending', 'failed')
          and delivery.available_at <= v_now
        )
        or (
          delivery.status = 'processing'
          and delivery.locked_until < v_now
        )
      )
    order by delivery.available_at, delivery.created_at, delivery.id
    limit p_batch_size
    for update skip locked
  loop
    v_lock_token := extensions.gen_random_uuid();

    update public.integration_deliveries as delivery
    set
      status = 'processing',
      attempt_count = delivery.attempt_count + 1,
      locked_at = v_now,
      locked_until = v_now + pg_catalog.make_interval(secs => p_lease_seconds),
      lock_token = v_lock_token,
      locked_by = v_worker_id,
      last_http_status = null,
      last_error_code = null,
      last_error_message = null,
      last_attempt_at = v_now
    where delivery.id = v_delivery.id
    returning delivery.* into v_delivery;

    insert into public.audit_events (
      org_id,
      request_id,
      delivery_id,
      event_type,
      actor_type,
      metadata
    )
    values (
      v_delivery.org_id,
      v_delivery.request_id,
      v_delivery.id,
      'delivery_attempt_started',
      'worker',
      pg_catalog.jsonb_build_object(
        'attempt_count', v_delivery.attempt_count,
        'worker_id', v_worker_id
      )
    );

    return query
    select
      v_delivery.id,
      v_delivery.org_id,
      v_delivery.request_id,
      v_delivery.event_type,
      v_delivery.event_version,
      v_delivery.idempotency_key,
      v_delivery.payload,
      v_delivery.attempt_count,
      v_delivery.lock_token,
      v_delivery.locked_until,
      endpoint.url,
      endpoint.signing_secret_ref
    from public.webhook_endpoints as endpoint
    where endpoint.id = v_delivery.webhook_endpoint_id
      and endpoint.org_id = v_delivery.org_id;
  end loop;
end;
$$;

create or replace function public.record_delivery_success(
  p_delivery_id uuid,
  p_lock_token uuid,
  p_http_status integer,
  p_receiver_event_id uuid,
  p_receiver_request_reference text,
  p_receiver_effect text
)
returns table (
  delivery_id uuid,
  status text,
  succeeded_at timestamptz
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_delivery public.integration_deliveries%rowtype;
  v_succeeded_at timestamptz := statement_timestamp();
begin
  select delivery.*
  into v_delivery
  from public.integration_deliveries as delivery
  where delivery.id = p_delivery_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'delivery_not_found';
  end if;

  if v_delivery.status <> 'processing'
    or p_lock_token is null
    or v_delivery.lock_token <> p_lock_token
  then
    raise exception using errcode = 'P0001', message = 'delivery_lease_conflict';
  end if;

  if p_http_status not between 200 and 299
    or p_receiver_event_id is distinct from v_delivery.id
    or p_receiver_request_reference is distinct from
      (v_delivery.payload #>> '{request,reference}')
    or p_receiver_effect is distinct from 'upserted'
  then
    raise exception using errcode = 'P0001', message = 'invalid_delivery_result';
  end if;

  update public.integration_deliveries as delivery
  set
    status = 'succeeded',
    locked_at = null,
    locked_until = null,
    lock_token = null,
    locked_by = null,
    last_http_status = p_http_status,
    last_error_code = null,
    last_error_message = null,
    succeeded_at = v_succeeded_at
  where delivery.id = v_delivery.id;

  insert into public.audit_events (
    org_id,
    request_id,
    delivery_id,
    event_type,
    actor_type,
    metadata
  )
  values (
    v_delivery.org_id,
    v_delivery.request_id,
    v_delivery.id,
    'delivery_succeeded',
    'worker',
    pg_catalog.jsonb_build_object(
      'attempt_count', v_delivery.attempt_count,
      'http_status', p_http_status,
      'effect', p_receiver_effect
    )
  );

  return query select v_delivery.id, 'succeeded'::text, v_succeeded_at;
end;
$$;

create or replace function public.record_delivery_failure(
  p_delivery_id uuid,
  p_lock_token uuid,
  p_retryable boolean,
  p_http_status integer,
  p_error_code text,
  p_error_message text,
  p_retry_delay_seconds integer
)
returns table (
  delivery_id uuid,
  status text,
  available_at timestamptz
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_delivery public.integration_deliveries%rowtype;
  v_error_code text := btrim(p_error_code);
  v_error_message text := btrim(p_error_message);
  v_next_status text;
  v_available_at timestamptz;
  v_backoff_ceiling integer;
begin
  select delivery.*
  into v_delivery
  from public.integration_deliveries as delivery
  where delivery.id = p_delivery_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'delivery_not_found';
  end if;

  if v_delivery.status <> 'processing'
    or p_lock_token is null
    or v_delivery.lock_token <> p_lock_token
  then
    raise exception using errcode = 'P0001', message = 'delivery_lease_conflict';
  end if;

  if p_retryable is null
    or (p_http_status is not null and p_http_status not between 100 and 599)
    or p_error_code is null
    or v_error_code !~ '^[a-z0-9_]{1,64}$'
    or p_error_message is null
    or v_error_message = ''
    or char_length(v_error_message) > 300
  then
    raise exception using errcode = 'P0001', message = 'invalid_delivery_failure';
  end if;

  if p_retryable and v_delivery.attempt_count < v_delivery.max_attempts then
    v_backoff_ceiling := least(
      1800,
      (30 * pg_catalog.power(2, least(v_delivery.attempt_count - 1, 20)))::integer
    );

    if p_retry_delay_seconds is null
      or p_retry_delay_seconds not between 0 and v_backoff_ceiling
    then
      raise exception using errcode = 'P0001', message = 'invalid_retry_delay';
    end if;

    v_next_status := 'failed';
    v_available_at := statement_timestamp()
      + pg_catalog.make_interval(secs => p_retry_delay_seconds);
  else
    if not p_retryable and p_retry_delay_seconds is not null then
      raise exception using errcode = 'P0001', message = 'invalid_retry_delay';
    end if;

    v_next_status := 'dead';
    v_available_at := v_delivery.available_at;
  end if;

  update public.integration_deliveries as delivery
  set
    status = v_next_status,
    available_at = v_available_at,
    locked_at = null,
    locked_until = null,
    lock_token = null,
    locked_by = null,
    last_http_status = p_http_status,
    last_error_code = v_error_code,
    last_error_message = v_error_message
  where delivery.id = v_delivery.id;

  insert into public.audit_events (
    org_id,
    request_id,
    delivery_id,
    event_type,
    actor_type,
    metadata
  )
  values (
    v_delivery.org_id,
    v_delivery.request_id,
    v_delivery.id,
    case v_next_status
      when 'failed' then 'delivery_failed'
      else 'delivery_dead'
    end,
    'worker',
    pg_catalog.jsonb_strip_nulls(
      pg_catalog.jsonb_build_object(
        'attempt_count', v_delivery.attempt_count,
        'http_status', p_http_status,
        'error_code', v_error_code,
        'retryable', p_retryable,
        'retry_delay_seconds', p_retry_delay_seconds
      )
    )
  );

  return query select v_delivery.id, v_next_status, v_available_at;
end;
$$;

create or replace function public.manual_retry(
  p_delivery_id uuid,
  p_actor_user_id uuid
)
returns table (
  delivery_id uuid,
  status text,
  max_attempts integer,
  available_at timestamptz
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_delivery public.integration_deliveries%rowtype;
  v_available_at timestamptz := statement_timestamp();
  v_max_attempts integer;
begin
  select delivery.*
  into v_delivery
  from public.integration_deliveries as delivery
  where delivery.id = p_delivery_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'delivery_not_found';
  end if;

  if not exists (
    select 1
    from public.organization_members as member
    where member.org_id = v_delivery.org_id
      and member.user_id = p_actor_user_id
      and member.role = 'admin'
      and member.is_active
  ) then
    raise exception using errcode = 'P0001', message = 'access_denied';
  end if;

  if v_delivery.status not in ('failed', 'dead') then
    raise exception using errcode = 'P0001', message = 'delivery_conflict';
  end if;

  v_max_attempts := v_delivery.max_attempts + 1;

  update public.integration_deliveries as delivery
  set
    status = 'pending',
    available_at = v_available_at,
    max_attempts = v_max_attempts,
    locked_at = null,
    locked_until = null,
    lock_token = null,
    locked_by = null,
    last_http_status = null,
    last_error_code = null,
    last_error_message = null
  where delivery.id = v_delivery.id;

  insert into public.audit_events (
    org_id,
    request_id,
    delivery_id,
    event_type,
    actor_type,
    actor_user_id,
    actor_role,
    metadata
  )
  values (
    v_delivery.org_id,
    v_delivery.request_id,
    v_delivery.id,
    'manual_retry',
    'staff_user',
    p_actor_user_id,
    'admin',
    pg_catalog.jsonb_build_object(
      'attempt_count', v_delivery.attempt_count,
      'new_max_attempts', v_max_attempts
    )
  );

  return query
  select v_delivery.id, 'pending'::text, v_max_attempts, v_available_at;
end;
$$;

revoke all on function public.claim_integration_deliveries(integer, text, integer)
  from public, anon, authenticated;
revoke all on function public.record_delivery_success(
  uuid, uuid, integer, uuid, text, text
) from public, anon, authenticated;
revoke all on function public.record_delivery_failure(
  uuid, uuid, boolean, integer, text, text, integer
) from public, anon, authenticated;
revoke all on function public.manual_retry(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.claim_integration_deliveries(
  integer, text, integer
) to service_role;
grant execute on function public.record_delivery_success(
  uuid, uuid, integer, uuid, text, text
) to service_role;
grant execute on function public.record_delivery_failure(
  uuid, uuid, boolean, integer, text, text, integer
) to service_role;
grant execute on function public.manual_retry(uuid, uuid) to service_role;
