import type { TutoringRequestStatus, SessionStatus, SessionModality } from '@/types/database.types'

export const requestStatusLabels = {
  pendiente: 'Pendiente', aceptada: 'Aceptada', rechazada: 'Rechazada', cancelada: 'Cancelada',
} as const

export const sessionStatusLabels = {
  programada: 'Programada', en_curso: 'En curso', completada: 'Completada', cancelada: 'Cancelada',
} as const

export const modalityLabels = {
  virtual: 'Virtual', presencial: 'Presencial', hibrida: 'Híbrida',
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

export function canCancel(
  request: RequestState & { session_date: string; start_time: string },
  now = new Date(),
): boolean {
  return canRespond(request, now)
}

export interface SearchableRequest {
  subject_name: string
  subject_code: string
  title: string
  tutor_name: string
  student_name: string
  message: string | null
}

export function matchesRequestQuery(
  request: SearchableRequest,
  query: string,
  asTutor = false,
): boolean {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true
  const counterpart = asTutor ? request.student_name : request.tutor_name
  const haystack = [
    request.subject_name,
    request.subject_code,
    request.title,
    counterpart,
    request.message ?? '',
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(normalized)
}

export interface FilterableSessionRequest extends SearchableRequest, RequestState {
  modality: SessionModality
}

export function filterConfirmedSessions<T extends FilterableSessionRequest>(
  requests: T[],
  options: {
    sessionStatus?: 'all' | 'programada' | 'en_curso' | 'completada'
    modality?: 'all' | SessionModality
    query?: string
  },
): T[] {
  const { sessionStatus = 'all', modality = 'all', query = '' } = options
  return requests.filter((req) => {
    if (!isConfirmed(req)) return false
    if (sessionStatus !== 'all' && req.session_status !== sessionStatus) return false
    if (modality !== 'all' && req.modality !== modality) return false
    if (!matchesRequestQuery(req, query, false)) return false
    return true
  })
}

export function safeMeetingUrl(value: string): string | null {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch {
    return null
  }
}
