CREATE OR REPLACE FUNCTION public.check_tutor_session_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.end_time <= NEW.start_time THEN
    RAISE EXCEPTION 'La hora de finalizacion debe ser posterior a la hora de inicio.';
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

