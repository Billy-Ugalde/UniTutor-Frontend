-- Migración para validar anticipación de 30 minutos en tutorías e inmutabilidad de calificaciones

-- 1. Actualizar función de traslape y anticipación de tutorías
CREATE OR REPLACE FUNCTION public.check_tutor_session_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.end_time <= NEW.start_time THEN
    RAISE EXCEPTION 'La hora de finalizacion debe ser posterior a la hora de inicio.';
  END IF;

  -- Validar que una tutoría programada tenga al menos 30 minutos de anticipación respecto a la hora local
  IF NEW.status = 'programada' AND (
    TG_OP = 'INSERT' OR (
      TG_OP = 'UPDATE' AND (
        OLD.date <> NEW.date OR
        OLD.start_time <> NEW.start_time OR
        OLD.status <> NEW.status
      )
    )
  ) THEN
    IF (NEW.date + NEW.start_time) < ((now() AT TIME ZONE 'America/Costa_Rica') + INTERVAL '30 minutes') THEN
      RAISE EXCEPTION 'La tutoria debe programarse con al menos 30 minutos de anticipacion.';
    END IF;
  END IF;

  IF NEW.status <> 'cancelada' THEN
    IF EXISTS (
      SELECT 1
      FROM public.tutoring_sessions
      WHERE tutor_id = NEW.tutor_id
        AND date = NEW.date
        AND status <> 'cancelada'
        AND (NEW.id IS NULL OR id <> NEW.id)
        AND NEW.start_time < end_time
        AND NEW.end_time > start_time
    ) THEN
      RAISE EXCEPTION 'El tutor ya tiene una tutoria programada que coincide o se traslapa con este horario.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_tutor_session_overlap ON public.tutoring_sessions;

CREATE TRIGGER trg_check_tutor_session_overlap
BEFORE INSERT OR UPDATE OF tutor_id, date, start_time, end_time, status
ON public.tutoring_sessions
FOR EACH ROW
EXECUTE FUNCTION public.check_tutor_session_overlap();


-- 2. Actualizar función submit_tutoring_review para prohibir edición una vez enviada
CREATE OR REPLACE FUNCTION public.submit_tutoring_review(
  p_session_id uuid,
  p_rating integer,
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

  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'La calificación debe ser un valor entero entre 1 y 5.';
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

-- Eliminar políticas de actualización y eliminación para que la calificación sea inmutable
DROP POLICY IF EXISTS "Students can update their own review" ON public.tutoring_reviews;
DROP POLICY IF EXISTS "Students can delete their own review" ON public.tutoring_reviews;

