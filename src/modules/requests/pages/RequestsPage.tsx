import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ClipboardList, RefreshCw } from 'lucide-react'
import { useTranslations } from '@/i18n/useTranslations'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { Button } from '@/shared/components/ui/Button'
import { toast } from '@/shared/store/toast.store'
import { backendErrorMessage } from '@/modules/student/services/tutor-search.api'
import type { TutoringRequestStatus } from '@/types/database.types'
import { RequestCard } from '../components/RequestCard'
import { useRequests } from '../hooks/useRequests'
import { respondToRequest } from '../services/requests.api'
import { isConfirmed, requestStatusLabels, requestLoadErrorKey } from '../utils/request-state'

interface Props { asTutor?: boolean; sessionsOnly?: boolean }

export function RequestsPage({ asTutor = false, sessionsOnly = false }: Props) {
  const { t } = useTranslations()
  const { profile } = useAuth()
  const { requests, isLoading, error, refresh } = useRequests(profile?.id, asTutor)
  const [filter, setFilter] = useState<TutoringRequestStatus | 'all'>(asTutor ? 'pendiente' : 'all')
  const [savingId, setSavingId] = useState<string | null>(null)
  const saving = useRef(false)
  const rows = sessionsOnly ? requests.filter(isConfirmed) : requests
  const visible = sessionsOnly || filter === 'all' ? rows : rows.filter((request) => request.status === filter)

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
      {!sessionsOnly && <div className="flex flex-wrap gap-2" role="group" aria-label={t('Filtrar por estado')}>
        {(['all', 'pendiente', 'aceptada', 'rechazada', 'cancelada'] as const).map((status) => (
          <button key={status} type="button" aria-pressed={filter === status} onClick={() => setFilter(status)}
            className={`rounded-full border px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${filter === status ? 'border-primary-600 bg-primary-600 text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'}`}>
            {status === 'all' ? t('Todas') : t(requestStatusLabels[status])} ({status === 'all' ? rows.length : rows.filter((request) => request.status === status).length})
          </button>
        ))}
      </div>}
      {error !== null && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{t(requestLoadErrorKey(error))}</div>}
      {isLoading ? <div role="status" className="space-y-3" aria-label={t('Cargando solicitudes')}>
        {[0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-xl border border-gray-200 bg-gray-100" />)}
        <span className="sr-only">{t('Cargando solicitudes')}</span>
      </div> : visible.length > 0 ? <div className="space-y-4">
        {visible.map((request) => <RequestCard key={request.id} request={request} asTutor={asTutor} busy={savingId !== null} saving={savingId === request.id} onRespond={respond} />)}
      </div> : !error && <div role="status" className="rounded-xl border border-gray-200 bg-white px-4 py-12 text-center">
        <ClipboardList className="mx-auto h-10 w-10 text-gray-400" />
        <p className="mt-3 font-medium text-gray-700">{sessionsOnly ? t('Aún no tienes tutorías confirmadas.') : t('No hay solicitudes en este estado.')}</p>
        {!asTutor && <Link to="/tutores" className="mt-4 inline-block text-sm font-semibold text-primary-700 hover:underline">{t('Buscar Tutores')}</Link>}
      </div>}
    </div>
  )
}
