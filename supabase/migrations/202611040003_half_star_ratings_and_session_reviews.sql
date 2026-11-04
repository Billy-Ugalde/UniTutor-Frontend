-- Migración para soportar calificaciones con medios puntos (1.0 a 5.0) y consulta de calificaciones de tutorías completadas

-- 1. Modificar columna rating en tutoring_reviews a numeric(2, 1) con pasos de 0.5
ALTER TABLE public.tutoring_reviews ALTER COLUMN rating TYPE numeric(2, 1);

ALTER TABLE public.tutoring_reviews DROP CONSTRAINT IF EXISTS tutoring_reviews_rating_check;
ALTER TABLE public.tutoring_reviews ADD CONSTRAINT tutoring_reviews_rating_check
  CHECK (rating >= 1.0 AND rating <= 5.0 AND (rating * 2) = round(rating * 2));

-- 2. Actualizar función RPC submit_tutoring_review con p_rating numeric
DROP FUNCTION IF EXISTS public.submit_tutoring_review(uuid, integer, text);
DROP FUNCTION IF EXISTS public.submit_tutoring_review(uuid, numeric, text);

CREATE OR REPLACE FUNCTION public.submit_tutoring_review(
  p_session_id uuid,
  p_rating numeric,
  p_comment text default null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_student_id uuid;
  v_tutor_id uuid;
  v_session_status text;
  v_session_title text;
  v_request_status text;
  v_student_name text;
  v_review_id uuid;
  v_now timestamptz := now();
BEGIN
  v_student_id := auth.uid();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para calificar una tutoría.';
  END IF;

  IF p_rating IS NULL OR p_rating < 1.0 OR p_rating > 5.0 OR (p_rating * 2) <> round(p_rating * 2) THEN
    RAISE EXCEPTION 'La calificación debe ser un valor entre 1.0 y 5.0 en incrementos de 0.5.';
  END IF;

  -- Verificar si el estudiante ya calificó esta tutoría
  IF EXISTS (
    SELECT 1 FROM public.tutoring_reviews
    WHERE session_id = p_session_id AND student_id = v_student_id
  ) THEN
    RAISE EXCEPTION 'Ya has calificado esta tutoría. No es posible editar la calificación.';
  END IF;

  -- Verificar sesión
  SELECT s.tutor_id, s.status, s.title
  INTO v_tutor_id, v_session_status, v_session_title
  FROM public.tutoring_sessions s
  WHERE s.id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La sesión de tutoría no existe.';
  END IF;

  IF v_session_status <> 'completada' THEN
    RAISE EXCEPTION 'Solo se pueden calificar tutorías que hayan finalizado (estado completada).';
  END IF;

  -- Verificar solicitud aceptada del estudiante
  SELECT r.status INTO v_request_status
  FROM public.tutoring_requests r
  WHERE r.session_id = p_session_id
    AND r.student_id = v_student_id;

  IF NOT FOUND OR v_request_status <> 'aceptada' THEN
    RAISE EXCEPTION 'No estuviste inscrito o admitido en esta tutoría.';
  END IF;

  -- Obtener nombre del estudiante para notificación
  SELECT trim(concat(first_name, ' ', last_name))
  INTO v_student_name
  FROM public.profiles
  WHERE id = v_student_id;

  -- Insertar calificación única
  INSERT INTO public.tutoring_reviews (
    session_id,
    student_id,
    tutor_id,
    rating,
    comment,
    created_at,
    updated_at
  )
  VALUES (
    p_session_id,
    v_student_id,
    v_tutor_id,
    p_rating,
    nullif(btrim(coalesce(p_comment, '')), ''),
    v_now,
    v_now
  )
  RETURNING id INTO v_review_id;

  -- Notificar al tutor si existe la tabla notifications
  BEGIN
    INSERT INTO public.notifications (
      user_id,
      type,
      payload
    )
    VALUES (
      v_tutor_id,
      'tutor_review_received',
      jsonb_build_object(
        'review_id', v_review_id,
        'session_id', p_session_id,
        'session_title', v_session_title,
        'student_id', v_student_id,
        'student_name', coalesce(v_student_name, 'Un estudiante'),
        'rating', p_rating,
        'comment', p_comment,
        'created_at', v_now
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'review_id', v_review_id,
    'rating', p_rating,
    'comment', p_comment
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_tutoring_review(uuid, numeric, text) TO authenticated;

-- 3. Actualizar función RPC get_tutor_rating_stats para contemplar promedios y distribución
CREATE OR REPLACE FUNCTION public.get_tutor_rating_stats(p_tutor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_avg numeric(3, 2);
  v_count integer;
  v_5 integer;
  v_4 integer;
  v_3 integer;
  v_2 integer;
  v_1 integer;
BEGIN
  SELECT
    coalesce(round(avg(rating)::numeric, 2), 0.0),
    count(*),
    count(*) FILTER (WHERE round(rating) = 5),
    count(*) FILTER (WHERE round(rating) = 4),
    count(*) FILTER (WHERE round(rating) = 3),
    count(*) FILTER (WHERE round(rating) = 2),
    count(*) FILTER (WHERE round(rating) = 1)
  INTO v_avg, v_count, v_5, v_4, v_3, v_2, v_1
  FROM public.tutoring_reviews
  WHERE tutor_id = p_tutor_id;

  RETURN jsonb_build_object(
    'average_rating', v_avg,
    'total_reviews', v_count,
    'stars', jsonb_build_object(
      '5', v_5,
      '4', v_4,
      '3', v_3,
      '2', v_2,
      '1', v_1
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tutor_rating_stats(uuid) TO authenticated, anon;

-- 4. Función RPC para obtener detalles de calificaciones de una sesión específica
CREATE OR REPLACE FUNCTION public.get_session_reviews(p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_id uuid;
  v_avg numeric(3, 1);
  v_count integer;
  v_reviews jsonb;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión.';
  END IF;

  SELECT
    coalesce(round(avg(rating)::numeric, 1), 0.0),
    count(*)
  INTO v_avg, v_count
  FROM public.tutoring_reviews
  WHERE session_id = p_session_id;

  SELECT coalesce(jsonb_agg(item ORDER BY (item->>'created_at') DESC), '[]'::jsonb)
  INTO v_reviews
  FROM (
    SELECT jsonb_build_object(
      'id', rev.id,
      'rating', rev.rating,
      'comment', rev.comment,
      'created_at', rev.created_at,
      'student_name', trim(concat(st.first_name, ' ', st.last_name)),
      'student_avatar', st.avatar_url
    ) AS item
    FROM public.tutoring_reviews rev
    JOIN public.profiles st ON st.id = rev.student_id
    WHERE rev.session_id = p_session_id
  ) q;

  RETURN jsonb_build_object(
    'average_rating', v_avg,
    'total_reviews', v_count,
    'reviews', v_reviews
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_session_reviews(uuid) TO authenticated;

-- 5. Función RPC para obtener resumen de calificaciones por sesión de un tutor
CREATE OR REPLACE FUNCTION public.get_tutor_sessions_rating_summary(p_tutor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN (
    SELECT coalesce(jsonb_object_agg(session_id, jsonb_build_object(
      'average_rating', avg_rating,
      'total_reviews', total_reviews
    )), '{}'::jsonb)
    FROM (
      SELECT
        session_id,
        round(avg(rating)::numeric, 1) AS avg_rating,
        count(*) AS total_reviews
      FROM public.tutoring_reviews
      WHERE tutor_id = p_tutor_id
      GROUP BY session_id
    ) s
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tutor_sessions_rating_summary(uuid) TO authenticated;

