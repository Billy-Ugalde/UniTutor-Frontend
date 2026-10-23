-- Protege las llamadas a PostgREST/Supabase para aceptar únicamente solicitudes
-- emitidas desde el cliente interno del sistema UniTutor.
begin;

create or replace function public.check_request_authorized()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_raw_headers text;
  v_headers jsonb;
  v_client_info text;
  v_user_agent text;
  v_sec_fetch_site text;
begin
  v_raw_headers := current_setting('request.headers', true);

  -- Si no hay cabeceras HTTP (ej. ejecución directa desde el SQL Editor de Supabase), permitir.
  if v_raw_headers is null or btrim(v_raw_headers) = '' then
    return;
  end if;

  begin
    v_headers := v_raw_headers::jsonb;
  exception when others then
    raise exception 'Acceso no autorizado: cabeceras de solicitud inválidas.'
      using errcode = '42501';
  end;

  v_client_info := coalesce(v_headers->>'x-client-info', '');
  v_user_agent := lower(coalesce(v_headers->>'user-agent', ''));
  v_sec_fetch_site := lower(coalesce(v_headers->>'sec-fetch-site', ''));

  -- 1. Verificar firma obligatoria del cliente del sistema UniTutor
  if v_client_info not like 'unitutor-system-client/%' then
    raise exception 'Acceso no autorizado: la solicitud debe originarse desde el sistema UniTutor.'
      using errcode = '42501';
  end if;

  -- 2. Bloquear herramientas de terminal / clientes HTTP externos
  if v_user_agent = ''
     or v_user_agent ~ '(curl|postmanruntime|insomnia|httpie|python-requests|python-urllib|wget|powershell|axios|node-fetch|go-http-client)'
  then
    raise exception 'Acceso no autorizado: cliente HTTP o terminal no permitida.'
      using errcode = '42501';
  end if;

  -- 3. Bloquear navegación directa por barra de direcciones o contextos ajenos
  if v_sec_fetch_site = 'none' then
    raise exception 'Acceso no autorizado: acceso directo por navegador no permitido.'
      using errcode = '42501';
  end if;
end;
$$;

grant execute on function public.check_request_authorized() to anon, authenticated, service_role;

alter role authenticator set pgrst.db_pre_request = 'public.check_request_authorized';
notify pgrst, 'reload config';

commit;
