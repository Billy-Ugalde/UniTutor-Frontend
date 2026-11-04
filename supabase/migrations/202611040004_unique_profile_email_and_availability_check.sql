CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_unique
ON public.profiles (lower(trim(email)))
WHERE email IS NOT NULL;

CREATE OR REPLACE FUNCTION public.check_email_availability(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_clean_email text := lower(trim(coalesce(p_email, '')));
  v_exists boolean := false;
BEGIN
  IF v_clean_email = '' OR v_clean_email NOT LIKE '%_@__%.__%' THEN
    RETURN jsonb_build_object(
      'available', false,
      'reason', 'invalid',
      'message', 'Formato de correo electrónico no válido.'
    );
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE lower(trim(email)) = v_clean_email
    UNION
    SELECT 1 FROM public.profiles WHERE lower(trim(email)) = v_clean_email
  ) INTO v_exists;

  IF v_exists THEN
    RETURN jsonb_build_object(
      'available', false,
      'reason', 'already_registered',
      'message', 'Este correo ya está registrado en el sistema. Por favor inicia sesión o recupera tu contraseña si la olvidaste.'
    );
  END IF;

  RETURN jsonb_build_object(
    'available', true,
    'reason', 'available',
    'message', 'El correo está disponible.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_email_availability(text) TO anon, authenticated;

