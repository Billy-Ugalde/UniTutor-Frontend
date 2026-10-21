import type { TutoringRequestStatus, SessionStatus } from '@/types/database.types'

export const requestStatusLabels = {
  pendiente: 'Pendiente', aceptada: 'Aceptada', rechazada: 'Rechazada', cancelada: 'Cancelada',
} as const

export function requestLoadErrorKey(error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined
  return code === 'PGRST202' || code === '42883'
    ? 'El módulo de solicitudes todavía no está habilitado. Contacta al administrador.'
    : 'No se pudieron cargar las solicitudes. Inténtalo nuevamente.'
}

interface RequestState {
  status: TutoringRequestStatus
  session_status: SessionStatus
}

export function isConfirmed(request: RequestState): boolean {
  return request.status === 'aceptada' && request.session_status !== 'cancelada'
}

export function canRespond(
  request: RequestState & { session_date: string; start_time: string },
  now = new Date(),
): boolean {
  return request.status === 'pendiente' && request.session_status === 'programada'
    && new Date(`${request.session_date}T${request.start_time}-06:00`).getTime() > now.getTime()
}

export function safeMeetingUrl(value: string): string | null {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch {
    return null
  }
}
