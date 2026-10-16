create table private.public_submission_rate_limits (
  public_form_id uuid not null references public.public_forms (id) on delete cascade,
  subject_hash bytea not null,
  window_started_at timestamptz not null,
  submission_count integer not null default 1,
  updated_at timestamptz not null default statement_timestamp(),
  primary key (public_form_id, subject_hash, window_started_at),
  constraint public_submission_rate_limits_subject_hash_check check (
    octet_length(subject_hash) = 32
  ),
  constraint public_submission_rate_limits_submission_count_check check (
    submission_count > 0
  )
);

create index public_submission_rate_limits_updated_idx
  on private.public_submission_rate_limits (updated_at);

revoke all on table private.public_submission_rate_limits
  from public, anon, authenticated;
grant select, insert, update, delete
  on table private.public_submission_rate_limits to service_role;

create or replace function public.consume_public_submission_rate_limit(
  p_public_form_id uuid,
  p_subject_hash bytea
)
returns table (
  allowed boolean,
  retry_after_seconds integer
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := statement_timestamp();
  v_window_started_at timestamptz;
  v_submission_count integer;
begin
  if p_public_form_id is null or octet_length(p_subject_hash) <> 32 then
    raise exception using errcode = 'P0001', message = 'invalid_rate_limit_subject';
  end if;

  v_window_started_at := pg_catalog.to_timestamp(
    (extract(epoch from v_now)::bigint / 900) * 900
  );

  insert into private.public_submission_rate_limits (
    public_form_id,
    subject_hash,
    window_started_at,
    submission_count,
    updated_at
  )
  values (
    p_public_form_id,
    p_subject_hash,
    v_window_started_at,
    1,
    v_now
  )
  on conflict (public_form_id, subject_hash, window_started_at)
  do update set
    submission_count = private.public_submission_rate_limits.submission_count + 1,
    updated_at = excluded.updated_at
  returning submission_count into v_submission_count;

  return query
  select
    v_submission_count <= 5,
    greatest(
      1,
      ceil(
        extract(
          epoch from (v_window_started_at + interval '15 minutes' - v_now)
        )
      )::integer
    );
end;
$$;

revoke all on function public.consume_public_submission_rate_limit(uuid, bytea)
  from public, anon, authenticated;
grant execute on function public.consume_public_submission_rate_limit(uuid, bytea)
  to service_role;
