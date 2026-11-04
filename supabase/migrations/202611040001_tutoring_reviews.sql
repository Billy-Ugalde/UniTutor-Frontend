-- 1. Crear tabla de calificaciones y comentarios
create table if not exists public.tutoring_reviews (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.tutoring_sessions(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  tutor_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tutoring_reviews_session_student_unique unique (session_id, student_id)
);

create index if not exists idx_tutoring_reviews_tutor_id on public.tutoring_reviews(tutor_id);
create index if not exists idx_tutoring_reviews_session_id on public.tutoring_reviews(session_id);
create index if not exists idx_tutoring_reviews_student_id on public.tutoring_reviews(student_id);

alter table public.tutoring_reviews enable row level security;

-- Políticas RLS
drop policy if exists "Authenticated users can view tutoring reviews" on public.tutoring_reviews;
create policy "Authenticated users can view tutoring reviews"
  on public.tutoring_reviews
  for select
  to authenticated
  using (true);

drop policy if exists "Students can insert review for attended completed session" on public.tutoring_reviews;
create policy "Students can insert review for attended completed session"
  on public.tutoring_reviews
  for insert
  to authenticated
  with check (
    auth.uid() = student_id
    and exists (
      select 1 from public.tutoring_sessions s
      where s.id = session_id
        and s.status = 'completada'
        and s.tutor_id = tutoring_reviews.tutor_id
    )
    and exists (
      select 1 from public.tutoring_requests r
      where r.session_id = session_id
        and r.student_id = auth.uid()
        and r.status = 'aceptada'
    )
  );

drop policy if exists "Students can update their own review" on public.tutoring_reviews;
create policy "Students can update their own review"
  on public.tutoring_reviews
  for update
  to authenticated
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

drop policy if exists "Students can delete their own review" on public.tutoring_reviews;
create policy "Students can delete their own review"
  on public.tutoring_reviews
  for delete
  to authenticated
  using (auth.uid() = student_id);

-- 2. Función RPC para registrar o editar una calificación
create or replace function public.submit_tutoring_review(
  p_session_id uuid,
  p_rating integer,
  p_comment text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_id uuid;
  v_tutor_id uuid;
  v_session_status text;
  v_session_title text;
  v_request_status text;
  v_student_name text;
  v_review_id uuid;
  v_now timestamptz := now();
begin
  v_student_id := auth.uid();
  if v_student_id is null then
    raise exception 'Debes iniciar sesión para calificar una tutoría.';
  end if;

  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'La calificación debe ser un valor entero entre 1 y 5.';
  end if;

  -- Verificar sesión
  select s.tutor_id, s.status, s.title
  into v_tutor_id, v_session_status, v_session_title
  from public.tutoring_sessions s
  where s.id = p_session_id;

  if not found then
    raise exception 'La sesión de tutoría no existe.';
  end if;

  if v_session_status <> 'completada' then
    raise exception 'Solo se pueden calificar tutorías que hayan finalizado (estado completada).';
  end if;

  -- Verificar solicitud aceptada del estudiante
  select r.status into v_request_status
  from public.tutoring_requests r
  where r.session_id = p_session_id
    and r.student_id = v_student_id;

  if not found or v_request_status <> 'aceptada' then
    raise exception 'No estuviste inscrito o admitido en esta tutoría.';
  end if;

  -- Obtener nombre del estudiante para notificación
  select trim(concat(first_name, ' ', last_name))
  into v_student_name
  from public.profiles
  where id = v_student_id;

  -- Insertar o actualizar reseña
  insert into public.tutoring_reviews (
    session_id,
    student_id,
    tutor_id,
    rating,
    comment,
    created_at,
    updated_at
  )
  values (
    p_session_id,
    v_student_id,
    v_tutor_id,
    p_rating,
    nullif(btrim(coalesce(p_comment, '')), ''),
    v_now,
    v_now
  )
  on conflict (session_id, student_id) do update set
    rating = excluded.rating,
    comment = excluded.comment,
    updated_at = v_now
  returning id into v_review_id;

  -- Notificar al tutor si existe la tabla notifications
  begin
    insert into public.notifications (
      user_id,
      type,
      payload
    )
    values (
      v_tutor_id,
      'tutor_review_received',
      jsonb_build_object(
        'review_id', v_review_id,
        'session_id', p_session_id,
        'session_title', v_session_title,
        'student_name', coalesce(v_student_name, 'Estudiante'),
        'rating', p_rating,
        'created_at', v_now
      )
    );
  exception when others then
    null;
  end;

  return jsonb_build_object(
    'success', true,
    'id', v_review_id,
    'session_id', p_session_id,
    'rating', p_rating,
    'comment', nullif(btrim(coalesce(p_comment, '')), '')
  );
end;
$$;

grant execute on function public.submit_tutoring_review(uuid, integer, text) to authenticated;

-- 3. Función RPC para obtener el resumen estadístico de calificaciones de un tutor
create or replace function public.get_tutor_rating_stats(p_tutor_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_avg numeric(3, 2);
  v_count integer;
  v_5 integer;
  v_4 integer;
  v_3 integer;
  v_2 integer;
  v_1 integer;
begin
  select
    coalesce(round(avg(rating)::numeric, 2), 0.0),
    count(*),
    count(*) filter (where rating = 5),
    count(*) filter (where rating = 4),
    count(*) filter (where rating = 3),
    count(*) filter (where rating = 2),
    count(*) filter (where rating = 1)
  into v_avg, v_count, v_5, v_4, v_3, v_2, v_1
  from public.tutoring_reviews
  where tutor_id = p_tutor_id;

  return jsonb_build_object(
    'average_rating', coalesce(v_avg, 0.0),
    'total_reviews', coalesce(v_count, 0),
    'stars', jsonb_build_object(
      '5', coalesce(v_5, 0),
      '4', coalesce(v_4, 0),
      '3', coalesce(v_3, 0),
      '2', coalesce(v_2, 0),
      '1', coalesce(v_1, 0)
    )
  );
end;
$$;

grant execute on function public.get_tutor_rating_stats(uuid) to authenticated, anon;

-- 4. Función RPC para obtener la lista de reseñas y comentarios de un tutor
create or replace function public.get_tutor_reviews(
  p_tutor_id uuid,
  p_limit integer default 20,
  p_offset integer default 0
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(item order by item->>'created_at' desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'id', rev.id,
      'session_id', rev.session_id,
      'rating', rev.rating,
      'comment', rev.comment,
      'created_at', rev.created_at,
      'student_name', trim(concat(st.first_name, ' ', st.last_name)),
      'student_avatar', st.avatar_url,
      'session_title', ses.title,
      'subject_name', sub.name,
      'subject_code', sub.code
    ) as item
    from public.tutoring_reviews rev
    join public.profiles st on st.id = rev.student_id
    join public.tutoring_sessions ses on ses.id = rev.session_id
    join public.subjects sub on sub.id = ses.subject_id
    where rev.tutor_id = p_tutor_id
    order by rev.created_at desc
    limit coalesce(p_limit, 20)
    offset coalesce(p_offset, 0)
  ) rows;
$$;

grant execute on function public.get_tutor_reviews(uuid, integer, integer) to authenticated, anon;

-- 5. Actualizar get_my_tutoring_requests para incluir tutor_id y review
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
      'id', r.id,
      'session_id', r.session_id,
      'status', r.status,
      'message', r.message,
      'created_at', r.created_at,
      'student_name', trim(concat(st.first_name, ' ', st.last_name)),
      'tutor_name', trim(concat(t.first_name, ' ', t.last_name)),
      'tutor_id', r.tutor_id,
      'subject_name', sub.name,
      'subject_code', sub.code,
      'title', s.title,
      'session_date', s.date,
      'start_time', s.start_time,
      'end_time', s.end_time,
      'modality', s.modality,
      'session_status', s.status,
      'location_or_link', case when p_as_tutor or r.status = 'aceptada' then s.location_or_link else null end,
      'review', (
        select jsonb_build_object(
          'id', rev.id,
          'rating', rev.rating,
          'comment', rev.comment,
          'created_at', rev.created_at
        )
        from public.tutoring_reviews rev
        where rev.session_id = r.session_id and rev.student_id = r.student_id
        limit 1
      )
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

grant execute on function public.get_my_tutoring_requests(boolean) to authenticated;

