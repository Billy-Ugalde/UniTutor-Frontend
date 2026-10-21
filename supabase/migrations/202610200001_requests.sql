-- Run against the existing UniTutor schema before deploying the requests UI.
begin;

create or replace function public.get_my_tutoring_requests(p_as_tutor boolean default false)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(item order by item->>'created_at' desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'id', r.id, 'session_id', r.session_id, 'status', r.status,
      'message', r.message, 'created_at', r.created_at,
      'student_name', trim(concat(st.first_name, ' ', st.last_name)),
      'tutor_name', trim(concat(t.first_name, ' ', t.last_name)),
      'subject_name', sub.name, 'subject_code', sub.code,
      'title', s.title, 'session_date', s.date,
      'start_time', s.start_time, 'end_time', s.end_time,
      'modality', s.modality, 'session_status', s.status,
      'location_or_link', case when p_as_tutor or r.status = 'aceptada' then s.location_or_link else null end
    ) as item
    from public.tutoring_requests r
    join public.tutoring_sessions s on s.id = r.session_id
    join public.subjects sub on sub.id = r.subject_id
    join public.profiles st on st.id = r.student_id
    join public.profiles t on t.id = r.tutor_id
    where auth.uid() is not null
      and (
        (not p_as_tutor and r.student_id = auth.uid())
        or (p_as_tutor and r.tutor_id = auth.uid() and exists (
          select 1 from public.user_roles ur
          where ur.user_id = auth.uid() and ur.role = 'tutor'
            and ur.institution_id = r.institution_id and ur.active
        ))
      )
  ) rows;
$$;

create or replace function public.respond_tutoring_request(p_request_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.tutoring_requests%rowtype;
  session_row public.tutoring_sessions%rowtype;
  accepted_count integer;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión.';
  end if;
  if p_status is null or p_status not in ('aceptada', 'rechazada') then
    raise exception 'Estado de respuesta inválido.';
  end if;

  select * into request_row from public.tutoring_requests
    where id = p_request_id and tutor_id = auth.uid();
  if not found or not exists (
    select 1 from public.user_roles ur
    join public.profiles p on p.id = ur.user_id and p.active
    where ur.user_id = auth.uid() and ur.role = 'tutor' and ur.active
      and ur.institution_id = request_row.institution_id
  ) then
    raise exception 'No tienes permiso para responder esta solicitud.';
  end if;

  -- Serialize all admissions for the same session, then re-read the request.
  select * into session_row from public.tutoring_sessions
    where id = request_row.session_id for update;
  if not found or session_row.tutor_id <> auth.uid() then
    raise exception 'La sesión no está disponible.';
  end if;
  select * into request_row from public.tutoring_requests
    where id = p_request_id and tutor_id = auth.uid() for update;
  if not found or request_row.status <> 'pendiente' then
    raise exception 'La solicitud ya fue respondida o cancelada.';
  end if;
  if session_row.status <> 'programada'
    or (session_row.date + session_row.start_time) <= (now() at time zone 'America/Costa_Rica') then
    raise exception 'La sesión ya no admite respuestas.';
  end if;

  if p_status = 'aceptada' then
    select count(*) into accepted_count from public.tutoring_requests
      where session_id = session_row.id and status = 'aceptada';
    if accepted_count >= session_row.max_students then
      raise exception 'La sesión ya no tiene cupos disponibles.';
    end if;
  end if;

  -- Literal assignments also support existing enum-typed status columns.
  if p_status = 'aceptada' then
    update public.tutoring_requests set status = 'aceptada' where id = p_request_id;
  else
    update public.tutoring_requests set status = 'rechazada' where id = p_request_id;
  end if;
  return jsonb_build_object('request_id', p_request_id, 'status', p_status, 'success', true);
end;
$$;

revoke all on function public.get_my_tutoring_requests(boolean) from public, anon;
revoke all on function public.respond_tutoring_request(uuid, text) from public, anon;
grant execute on function public.get_my_tutoring_requests(boolean) to authenticated;
grant execute on function public.respond_tutoring_request(uuid, text) to authenticated;

notify pgrst, 'reload schema';

commit;
