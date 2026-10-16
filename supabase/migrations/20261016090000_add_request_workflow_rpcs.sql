create or replace function public.submit_request(
  p_public_id text,
  p_idempotency_key uuid,
  p_requester_type text,
  p_contact_name text,
  p_email text,
  p_phone_raw text,
  p_phone_e164 text,
  p_country_code text,
  p_phone_country_mismatch boolean,
  p_service_category text,
  p_request_title text,
  p_description text,
  p_desired_start_date date,
  p_preferred_contact_method text,
  p_submitted_locale text,
  p_consent_text_version text,
  p_company_name text,
  p_job_title text,
  p_company_website text
)
returns table (
  request_id uuid,
  reference text,
  status text,
  replayed boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_form public.public_forms%rowtype;
  v_request_id uuid;
  v_reference text;
  v_existing public.requests%rowtype;
  v_local_date date;
  v_company_name text := p_company_name;
  v_job_title text := p_job_title;
  v_company_website text := p_company_website;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_public_id || ':' || p_idempotency_key::text, 0)
  );

  select form.*
  into v_form
  from public.public_forms as form
  join public.organizations as organization on organization.id = form.org_id
  where form.public_id = p_public_id
    and form.is_active
    and organization.is_active;

  if not found then
    raise exception using errcode = 'P0001', message = 'form_unavailable';
  end if;

  select request.*
  into v_existing
  from public.requests as request
  where request.public_form_id = v_form.id
    and request.idempotency_key = p_idempotency_key;

  if found then
    return query
    select v_existing.id, v_existing.reference, v_existing.status, true;
    return;
  end if;

  if p_submitted_locale not in ('ar', 'en')
    or p_consent_text_version <> (case p_submitted_locale
      when 'ar' then v_form.consent_text_version_ar
      else v_form.consent_text_version_en
    end)
  then
    raise exception using errcode = 'P0001', message = 'invalid_submission';
  end if;

  select (statement_timestamp() at time zone organization.timezone)::date
  into v_local_date
  from public.organizations as organization
  where organization.id = v_form.org_id;

  if p_desired_start_date is not null and p_desired_start_date < v_local_date then
    raise exception using errcode = 'P0001', message = 'invalid_submission';
  end if;

  if p_requester_type = 'individual' then
    v_company_name := null;
    v_job_title := null;
    v_company_website := null;
  elsif p_requester_type <> 'company' then
    raise exception using errcode = 'P0001', message = 'invalid_submission';
  end if;

  loop
    select pg_catalog.string_agg(
      pg_catalog.substr(
        '0123456789ABCDEFGHJKMNPQRSTVWXYZ',
        (pg_catalog.get_byte(extensions.gen_random_bytes(1), 0) % 32) + 1,
        1
      ),
      ''
    )
    into v_reference
    from pg_catalog.generate_series(1, 10);

    exit when not exists (
      select 1 from public.requests as request where request.reference = v_reference
    );
  end loop;

  insert into public.requests (
    org_id,
    public_form_id,
    reference,
    idempotency_key
  )
  values (
    v_form.org_id,
    v_form.id,
    v_reference,
    p_idempotency_key
  )
  returning id into v_request_id;

  insert into public.request_submission_snapshots (
    request_id,
    org_id,
    requester_type,
    contact_name,
    email,
    phone_raw,
    phone_e164,
    country_code,
    phone_country_mismatch,
    service_category,
    request_title,
    description,
    desired_start_date,
    preferred_contact_method,
    submitted_locale,
    consent_text_version,
    consent_locale,
    company_name,
    job_title,
    company_website,
    form_version
  )
  values (
    v_request_id,
    v_form.org_id,
    p_requester_type,
    p_contact_name,
    p_email,
    p_phone_raw,
    p_phone_e164,
    p_country_code,
    p_phone_country_mismatch,
    p_service_category,
    p_request_title,
    p_description,
    p_desired_start_date,
    p_preferred_contact_method,
    p_submitted_locale,
    p_consent_text_version,
    p_submitted_locale,
    v_company_name,
    v_job_title,
    v_company_website,
    v_form.form_version
  );

  insert into public.audit_events (
    org_id,
    request_id,
    event_type,
    actor_type
  )
  values (
    v_form.org_id,
    v_request_id,
    'request_submitted',
    'public_requester'
  );

  return query select v_request_id, v_reference, 'submitted'::text, false;
end;
$$;

create or replace function public.start_review(
  p_request_id uuid,
  p_actor_user_id uuid
)
returns table (
  request_id uuid,
  status text,
  transitioned boolean,
  review_started_at timestamptz
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_request public.requests%rowtype;
  v_actor_role text;
begin
  select request.*
  into v_request
  from public.requests as request
  where request.id = p_request_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'request_not_found';
  end if;

  select member.role
  into v_actor_role
  from public.organization_members as member
  where member.org_id = v_request.org_id
    and member.user_id = p_actor_user_id
    and member.is_active
    and member.role in ('approver', 'admin');

  if not found then
    raise exception using errcode = 'P0001', message = 'access_denied';
  end if;

  if v_request.status = 'under_review' then
    return query
    select v_request.id, v_request.status, false, v_request.review_started_at;
    return;
  end if;

  if v_request.status <> 'submitted' then
    raise exception using errcode = 'P0001', message = 'request_conflict';
  end if;

  update public.requests as request
  set
    status = 'under_review',
    review_started_at = statement_timestamp()
  where request.id = v_request.id
  returning request.review_started_at into v_request.review_started_at;

  insert into public.audit_events (
    org_id,
    request_id,
    event_type,
    actor_type,
    actor_user_id,
    actor_role
  )
  values (
    v_request.org_id,
    v_request.id,
    'review_started',
    'staff_user',
    p_actor_user_id,
    v_actor_role
  );

  return query
  select v_request.id, 'under_review'::text, true, v_request.review_started_at;
end;
$$;

create or replace function public.decide_request(
  p_request_id uuid,
  p_actor_user_id uuid,
  p_decision text,
  p_reason text
)
returns table (
  request_id uuid,
  status text,
  decision_id uuid,
  delivery_id uuid
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_request public.requests%rowtype;
  v_snapshot public.request_submission_snapshots%rowtype;
  v_endpoint public.webhook_endpoints%rowtype;
  v_actor_role text;
  v_decision_id uuid := extensions.gen_random_uuid();
  v_delivery_id uuid;
  v_reason text := case when p_reason is null then null else btrim(p_reason) end;
begin
  select request.*
  into v_request
  from public.requests as request
  where request.id = p_request_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'request_not_found';
  end if;

  select member.role
  into v_actor_role
  from public.organization_members as member
  where member.org_id = v_request.org_id
    and member.user_id = p_actor_user_id
    and member.is_active
    and member.role in ('approver', 'admin');

  if not found then
    raise exception using errcode = 'P0001', message = 'access_denied';
  end if;

  if v_request.status <> 'under_review' then
    raise exception using errcode = 'P0001', message = 'request_conflict';
  end if;

  if p_decision not in ('approved', 'rejected')
    or (p_decision = 'approved' and p_reason is not null)
    or (
      p_decision = 'rejected'
      and (v_reason is null or char_length(v_reason) not between 5 and 500)
    )
  then
    raise exception using errcode = 'P0001', message = 'invalid_decision';
  end if;

  insert into public.approval_decisions (
    id,
    org_id,
    request_id,
    decision,
    reason,
    decided_by,
    actor_role
  )
  values (
    v_decision_id,
    v_request.org_id,
    v_request.id,
    p_decision,
    v_reason,
    p_actor_user_id,
    v_actor_role
  );

  update public.requests as request
  set
    status = p_decision,
    decided_at = statement_timestamp()
  where request.id = v_request.id;

  insert into public.audit_events (
    org_id,
    request_id,
    event_type,
    actor_type,
    actor_user_id,
    actor_role
  )
  values (
    v_request.org_id,
    v_request.id,
    case p_decision
      when 'approved' then 'request_approved'
      else 'request_rejected'
    end,
    'staff_user',
    p_actor_user_id,
    v_actor_role
  );

  if p_decision = 'approved' then
    select endpoint.*
    into v_endpoint
    from public.webhook_endpoints as endpoint
    where endpoint.org_id = v_request.org_id
      and endpoint.destination_type = 'n8n_google_sheets'
      and endpoint.is_active;

    if not found then
      raise exception using errcode = 'P0001', message = 'integration_unavailable';
    end if;

    select snapshot.*
    into strict v_snapshot
    from public.request_submission_snapshots as snapshot
    where snapshot.request_id = v_request.id;

    v_delivery_id := extensions.gen_random_uuid();

    insert into public.integration_deliveries (
      id,
      org_id,
      request_id,
      webhook_endpoint_id,
      idempotency_key,
      payload
    )
    values (
      v_delivery_id,
      v_request.org_id,
      v_request.id,
      v_endpoint.id,
      'request.approved:' || v_request.id::text,
      pg_catalog.jsonb_build_object(
        'event_id', v_delivery_id,
        'event_type', 'request.approved',
        'event_version', 1,
        'request', pg_catalog.jsonb_build_object(
          'id', v_request.id,
          'reference', v_request.reference,
          'submitted_at', v_request.submitted_at,
          'decided_at', statement_timestamp(),
          'submitted_locale', v_snapshot.submitted_locale,
          'requester_type', v_snapshot.requester_type,
          'contact_name', v_snapshot.contact_name,
          'email', v_snapshot.email,
          'phone_e164', v_snapshot.phone_e164,
          'country_code', v_snapshot.country_code,
          'service_category', v_snapshot.service_category,
          'request_title', v_snapshot.request_title,
          'description', v_snapshot.description,
          'desired_start_date', v_snapshot.desired_start_date,
          'preferred_contact_method', v_snapshot.preferred_contact_method,
          'company_name', v_snapshot.company_name,
          'job_title', v_snapshot.job_title,
          'company_website', v_snapshot.company_website
        )
      )
    );

    insert into public.audit_events (
      org_id,
      request_id,
      delivery_id,
      event_type,
      actor_type
    )
    values (
      v_request.org_id,
      v_request.id,
      v_delivery_id,
      'job_created',
      'system'
    );
  end if;

  return query
  select v_request.id, p_decision, v_decision_id, v_delivery_id;
end;
$$;

revoke all on function public.submit_request(
  text, uuid, text, text, text, text, text, text, boolean, text,
  text, text, date, text, text, text, text, text, text
) from public, anon, authenticated;
revoke all on function public.start_review(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.decide_request(uuid, uuid, text, text)
  from public, anon, authenticated;

grant execute on function public.submit_request(
  text, uuid, text, text, text, text, text, text, boolean, text,
  text, text, date, text, text, text, text, text, text
) to service_role;
grant execute on function public.start_review(uuid, uuid) to service_role;
grant execute on function public.decide_request(uuid, uuid, text, text)
  to service_role;
