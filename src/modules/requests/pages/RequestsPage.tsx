import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ClipboardList, RefreshCw, Search, X } from 'lucide-react'
import { useTranslations } from '@/i18n/useTranslations'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { Button } from '@/shared/components/ui/Button'
import { toast } from '@/shared/store/toast.store'
import { backendErrorMessage } from '@/modules/student/services/tutor-search.api'
import type { SessionModality, TutoringRequestStatus } from '@/types/database.types'
import { RequestCard } from '../components/RequestCard'
import { useRequests } from '../hooks/useRequests'
import { cancelRequest, respondToRequest } from '../services/requests.api'
import {
  filterConfirmedSessions,
  isConfirmed,
  matchesRequestQuery,
  modalityLabels,
  requestLoadErrorKey,
  requestStatusLabels,
  sessionStatusLabels,
} from '../utils/request-state'

interface Props { asTutor?: boolean; sessionsOnly?: boolean }

export function RequestsPage({ asTutor = false, sessionsOnly = false }: Props) {
  const { t } = useTranslations()
  const { profile } = useAuth()
  const { requests, isLoading, error, refresh } = useRequests(profile?.id, asTutor)
  const [filter, setFilter] = useState<TutoringRequestStatus | 'all'>(asTutor ? 'pendiente' : 'all')
  const [sessionStatusFilter, setSessionStatusFilter] = useState<'all' | 'programada' | 'en_curso' | 'completada'>('all')
  const [modalityFilter, setModalityFilter] = useState<'all' | SessionModality>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const saving = useRef(false)

  const confirmedRows = requests.filter(isConfirmed)
  const rows = sessionsOnly ? confirmedRows : requests

  const visible = sessionsOnly
    ? filterConfirmedSessions(confirmedRows, {
        sessionStatus: sessionStatusFilter,
        modality: modalityFilter,
        query: searchQuery,
      })
    : rows.filter(
        (request) =>
          (filter === 'all' || request.status === filter) &&
          matchesRequestQuery(request, searchQuery, asTutor),
      )

  const respond = async (id: string, status: 'aceptada' | 'rechazada'): Promise<boolean> => {
    if (saving.current) return false
    saving.current = true
    setSavingId(id)
    try {
      await respondToRequest(id, status)
      toast.success(status === 'aceptada' ? t('Tutoría confirmada') : t('Solicitud rechazada'))
      await refresh()
      // Refresh the notification badge even without Realtime configured.
      window.dispatchEvent(new Event('tutoring-requests-updated'))
      return true
    } catch (err) {
      const message = backendErrorMessage(err)
      toast.error(t('No se pudo responder la solicitud'), message ? t(message as Parameters<typeof t>[0]) : t('Inténtalo nuevamente.'))
      await refresh()
      return false
    } finally {
      saving.current = false
      setSavingId(null)
    }
  }

  const cancel = async (id: string): Promise<boolean> => {
    if (saving.current) return false
    saving.current = true
    setSavingId(id)
    try {
      await cancelRequest(id)
      toast.success(t('Solicitud cancelada'), t('Tu solicitud de tutoría fue cancelada correctamente.'))
      await refresh()
      window.dispatchEvent(new Event('tutoring-requests-updated'))
      return true
    } catch (err) {
      const message = backendErrorMessage(err)
      toast.error(
        t('No se pudo cancelar la solicitud'),
        message ? t(message as Parameters<typeof t>[0]) : t('Inténtalo nuevamente.'),
      )
      await refresh()
      return false
    } finally {
      saving.current = false
      setSavingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary-700"><ArrowLeft className="h-4 w-4" />{t('Volver al inicio')}</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{asTutor ? t('Solicitudes Recibidas') : sessionsOnly ? t('Mis Sesiones de Tutoría') : t('Mis Solicitudes')}</h1>
          <p className="mt-1 text-sm text-gray-500">{asTutor ? t('Revisa y responde a solicitudes de estudiantes') : sessionsOnly ? t('Horarios de tus tutorías confirmadas') : t('Estado de tus solicitudes de tutoría enviadas')}</p>
        </div>
        <Button variant="secondary" disabled={isLoading || savingId !== null} onClick={() => void refresh()} className="gap-2"><RefreshCw className="h-4 w-4" />{t('Actualizar')}</Button>
      </div>
      {!asTutor && <nav aria-label={t('Tutorías del estudiante')} className="flex flex-wrap gap-4 text-sm font-medium text-primary-700">
        <Link to="/solicitudes" aria-current={!sessionsOnly ? 'page' : undefined} className={!sessionsOnly ? 'underline' : ''}>{t('Mis Solicitudes')}</Link>
        <Link to="/sesiones" aria-current={sessionsOnly ? 'page' : undefined} className={sessionsOnly ? 'underline' : ''}>{t('Mis Sesiones de Tutoría')}</Link>
      </nav>}

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={
            asTutor
              ? t('Buscar por materia, código, título o estudiante...')
              : t('Buscar por materia, código, título o tutor...')
          }
          aria-label={
            asTutor
              ? t('Buscar por materia, código, título o estudiante...')
              : t('Buscar por materia, código, título o tutor...')
          }
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-9 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-300"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            aria-label={t('Limpiar búsqueda')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {!sessionsOnly ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('Filtrar por estado')}>
          {(['all', 'pendiente', 'aceptada', 'rechazada', 'cancelada'] as const).map((status) => (
            <button key={status} type="button" aria-pressed={filter === status} onClick={() => setFilter(status)}
              className={`rounded-full border px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${filter === status ? 'border-primary-600 bg-primary-600 text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'}`}>
              {status === 'all' ? t('Todas') : t(requestStatusLabels[status])} ({status === 'all' ? rows.length : rows.filter((request) => request.status === status).length})
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label={t('Filtrar por estado de la sesión')}>
            {(['all', 'programada', 'en_curso', 'completada'] as const).map((status) => (
              <button
                key={status}
                type="button"
                aria-pressed={sessionStatusFilter === status}
                onClick={() => setSessionStatusFilter(status)}
                className={`rounded-full border px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  sessionStatusFilter === status
                    ? 'border-primary-600 bg-primary-600 text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                {status === 'all' ? t('Todas') : t(sessionStatusLabels[status])} (
                {status === 'all'
                  ? confirmedRows.length
                  : confirmedRows.filter((req) => req.session_status === status).length}
                )
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label={t('Filtrar por modalidad')}>
            {(['all', 'virtual', 'presencial', 'hibrida'] as const).map((modality) => (
              <button
                key={modality}
                type="button"
                aria-pressed={modalityFilter === modality}
                onClick={() => setModalityFilter(modality)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  modalityFilter === modality
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                {modality === 'all' ? t('Todas las modalidades') : t(modalityLabels[modality])}
              </button>
            ))}
          </div>
        </div>
      )}

      {error !== null && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{t(requestLoadErrorKey(error))}</div>}
      {isLoading ? <div role="status" className="space-y-3" aria-label={t('Cargando solicitudes')}>
        {[0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-xl border border-gray-200 bg-gray-100" />)}
        <span className="sr-only">{t('Cargando solicitudes')}</span>
      </div> : visible.length > 0 ? <div className="space-y-4">
        {visible.map((request) => (
          <RequestCard
            key={request.id}
            request={request}
            asTutor={asTutor}
            busy={savingId !== null}
            saving={savingId === request.id}
            onRespond={respond}
            onCancel={!asTutor ? cancel : undefined}
          />
        ))}
      </div> : !error && <div role="status" className="rounded-xl border border-gray-200 bg-white px-4 py-12 text-center">
        <ClipboardList className="mx-auto h-10 w-10 text-gray-400" />
        <p className="mt-3 font-medium text-gray-700">{sessionsOnly ? t('Aún no tienes tutorías confirmadas.') : t('No hay solicitudes en este estado.')}</p>
        {!asTutor && <Link to="/tutores" className="mt-4 inline-block text-sm font-semibold text-primary-700 hover:underline">{t('Buscar Tutores')}</Link>}
      </div>}
    </div>
  )
}
