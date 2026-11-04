export function getErrorMessage(
  err: unknown,
  t: (key: any) => string,
  defaultKey = 'Error inesperado. Inténtalo nuevamente.'
): string {
  if (!err) return t(defaultKey)

  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : ''
  const lower = raw.toLowerCase()

  if (lower.includes('invalid login credentials')) {
    return t('Correo o contraseña incorrectos.')
  }
  if (lower.includes('email not confirmed')) {
    return t('Debes confirmar tu correo electrónico antes de ingresar.')
  }
  if (lower.includes('user already registered') || lower.includes('already registered')) {
    return t('Ya existe una cuenta con este correo electrónico.')
  }
  if (
    lower.includes('different from the old password') ||
    lower.includes('different from')
  ) {
    return t('La nueva contraseña debe ser diferente a la contraseña anterior.')
  }
  if (lower.includes('desactivada') || lower.includes('deactivated')) {
    return t('Esta cuenta ha sido desactivada. Comunícate con el administrador de tu institución.')
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return t('Has excedido el límite de intentos. Por favor espera unos momentos antes de reintentar.')
  }
  if (lower.includes('only request this once every 60 seconds')) {
    return t('Por motivos de seguridad, solo puedes realizar esta solicitud una vez cada 60 segundos.')
  }
  if (
    lower.includes('token has expired') ||
    lower.includes('recovery link expired') ||
    lower.includes('otp expired') ||
    lower.includes('token expired') ||
    lower.includes('jwt expired')
  ) {
    return t('El enlace o código de recuperación ha expirado o no es válido.')
  }
  if (lower.includes('auth session missing') || lower.includes('session missing')) {
    return t('Sesión no válida o expirada. Por favor inicia sesión nuevamente.')
  }
  if (lower.includes('invalid refresh token') || lower.includes('refresh token not found')) {
    return t('Tu sesión ha expirado. Por favor inicia sesión nuevamente.')
  }
  if (lower.includes('password should be at least')) {
    return t('La contraseña debe tener al menos 8 caracteres y cumplir con los requisitos de seguridad.')
  }
  if (lower.includes('user not found')) {
    return t('Usuario no encontrado.')
  }
  if (lower.includes('failed to fetch') || lower.includes('network') || lower.includes('aborterror')) {
    return t('Error de conexión. Verifica tu conexión a internet e inténtalo nuevamente.')
  }
  if (lower.includes('duplicate key') || lower.includes('unique constraint')) {
    return t('Ya existe un registro con estos datos únicos.')
  }
  if (lower.includes('violates foreign key constraint')) {
    return t('No es posible completar la acción porque este elemento tiene registros asociados.')
  }
  if (lower.includes('violates row-level security policy')) {
    return t('No tienes permisos para realizar esta operación.')
  }

  return t(defaultKey)
}

