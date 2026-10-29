-- Migration: 202610280001_single_use_password_recovery.sql
-- Garantiza que los enlaces y tokens de recuperacion de contrasena sean estrictamente
-- de un solo uso y venzan de inmediato tras el cambio de credenciales.
begin;

-- 1. Trigger BEFORE UPDATE en auth.users: elimina el token de recuperacion al cambiar la contrasena
create or replace function public.trg_burn_recovery_token()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.encrypted_password is distinct from new.encrypted_password then
    new.recovery_token := null;
    new.recovery_sent_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_burn_recovery_token_before_update on auth.users;

create trigger trg_burn_recovery_token_before_update
before update of encrypted_password on auth.users
for each row
execute function public.trg_burn_recovery_token();

-- 2. Trigger AFTER UPDATE en auth.users: cierra de inmediato todas las sesiones y revoca refresh tokens
create or replace function public.trg_revoke_sessions_on_password_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.encrypted_password is distinct from new.encrypted_password then
    delete from auth.sessions where user_id = new.id;
    update auth.refresh_tokens set revoked = true where user_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_revoke_sessions_after_password_change on auth.users;

create trigger trg_revoke_sessions_after_password_change
after update of encrypted_password on auth.users
for each row
execute function public.trg_revoke_sessions_on_password_change();

-- 3. Tabla de auditoria de recuperaciones de contrasena consumidas
create table if not exists public.password_recovery_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consumed_at timestamptz not null default now(),
  ip_address text,
  user_agent text
);

alter table public.password_recovery_audit enable row level security;

-- Politica RLS: Bloqueo de acceso directo por anon/authenticated
drop policy if exists "No direct access to password_recovery_audit" on public.password_recovery_audit;
create policy "No direct access to password_recovery_audit"
  on public.password_recovery_audit
  for all
  using (false);

-- 4. Funcion RPC de consumo y registro de recuperacion
create or replace function public.record_password_recovery_consumed()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'No autenticado.' using errcode = '42501';
  end if;

  insert into public.password_recovery_audit (user_id)
  values (v_user_id);

  return jsonb_build_object('success', true, 'consumed_at', now());
end;
$$;

grant execute on function public.record_password_recovery_consumed() to authenticated;

notify pgrst, 'reload schema';

commit;
