-- Run against the existing UniTutor schema to allow students to cancel their own pending requests.
begin;

create or replace function public.cancel_tutoring_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.tutoring_requests%rowtype;
  session_row public.tutoring_sessions%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  select * into request_row from public.tutoring_requests
    where id = p_request_id and student_id = auth.uid() for update;
  if not found then
    raise exception 'No tienes permiso para cancelar esta solicitud.';
  end if;
  if request_row.status <> 'pendiente' then
    raise exception 'La solicitud ya fue respondida o cancelada.';
  end if;

  select * into session_row from public.tutoring_sessions
    where id = request_row.session_id;
  if not found or session_row.status <> 'programada'
    or (session_row.date + session_row.start_time) <= (now() at time zone 'America/Costa_Rica') then
    raise exception 'La sesión ya no admite cancelaciones.';
  end if;

  update public.tutoring_requests set status = 'cancelada' where id = p_request_id;

  return jsonb_build_object('request_id', p_request_id, 'status', 'cancelada', 'success', true);
end;
$$;

revoke all on function public.cancel_tutoring_request(uuid) from public, anon;
grant execute on function public.cancel_tutoring_request(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
