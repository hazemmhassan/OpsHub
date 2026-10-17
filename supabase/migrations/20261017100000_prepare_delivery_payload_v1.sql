create or replace function private.prepare_delivery_payload_v1()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_request public.requests%rowtype;
  v_snapshot public.request_submission_snapshots%rowtype;
begin
  select request.*
  into v_request
  from public.requests as request
  where request.id = new.request_id
    and request.org_id = new.org_id;

  if not found
    or v_request.status <> 'approved'
    or v_request.decided_at is null
  then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_delivery_request';
  end if;

  select snapshot.*
  into v_snapshot
  from public.request_submission_snapshots as snapshot
  where snapshot.request_id = v_request.id
    and snapshot.org_id = v_request.org_id;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'delivery_snapshot_not_found';
  end if;

  new.payload := pg_catalog.jsonb_build_object(
    'event_id', new.id,
    'event_type', new.event_type,
    'event_version', new.event_version,
    'occurred_at', v_request.decided_at,
    'request', pg_catalog.jsonb_build_object(
      'reference', v_request.reference,
      'submitted_at', v_request.submitted_at,
      'approved_at', v_request.decided_at,
      'submitted_locale', v_snapshot.submitted_locale,
      'requester_type', v_snapshot.requester_type,
      'contact_name', v_snapshot.contact_name,
      'email', v_snapshot.email,
      'phone_e164', v_snapshot.phone_e164,
      'country_code', v_snapshot.country_code,
      'preferred_contact_method', v_snapshot.preferred_contact_method,
      'company_name', v_snapshot.company_name,
      'job_title', v_snapshot.job_title,
      'company_website', v_snapshot.company_website,
      'service_category', v_snapshot.service_category,
      'request_title', v_snapshot.request_title,
      'description', v_snapshot.description,
      'desired_start_date', v_snapshot.desired_start_date
    )
  );

  return new;
end;
$$;

create trigger integration_deliveries_prepare_payload_v1
before insert on public.integration_deliveries
for each row execute function private.prepare_delivery_payload_v1();
