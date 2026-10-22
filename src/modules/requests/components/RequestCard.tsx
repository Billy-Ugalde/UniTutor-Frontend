import { useState } from 'react'
import { Calendar, Clock, CheckCircle2, MapPin, XCircle } from 'lucide-react'
import { useTranslations } from '@/i18n/useTranslations'
import { Button } from '@/shared/components/ui/Button'
import { formatTime, parseISODate } from '@/modules/student/utils/date-utils'
import { canCancel, canRespond, isConfirmed, safeMeetingUrl, requestStatusLabels } from '../utils/request-state'
import type { RequestRow } from '../services/requests.api'

const statusStyles = {
  pendiente: 'bg-amber-50 text-amber-800 border-amber-200',
  aceptada: 'bg-green-50 text-green-800 border-green-200',
  rechazada: 'bg-red-50 text-red-800 border-red-200',
  cancelada: 'bg-gray-100 text-gray-700 border-gray-200',
}

interface Props {
  request: RequestRow
  asTutor: boolean
  busy: boolean
  saving: boolean
  onRespond: (id: string, status: 'aceptada' | 'rechazada') => Promise<boolean>
  onCancel?: (id: string) => Promise<boolean>
}

export function RequestCard({ request, asTutor, busy, saving, onRespond, onCancel }: Props) {
  const { t, locale } = useTranslations()
  const [decision, setDecision] = useState<'aceptada' | 'rechazada' | null>(null)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const meetingUrl = safeMeetingUrl(request.location_or_link ?? '')
  const confirmed = isConfirmed(request)

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-primary-700">{request.subject_code} · {request.subject_name}</p>
          <h2 className="mt-1 break-words text-lg font-semibold text-gray-900">{request.title}</h2>
          <p className="mt-1 text-sm text-gray-600">
            {asTutor ? t('Estudiante') : t('Tutor')}: {asTutor ? request.student_name : request.tutor_name}
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[request.status]}`}>
          {t(requestStatusLabels[request.status])}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-600">
        <span className="flex items-center gap-2"><Calendar className="h-4 w-4 shrink-0" />
          {parseISODate(request.session_date).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
        <span className="flex items-center gap-2"><Clock className="h-4 w-4 shrink-0" />
          {formatTime(request.start_time)} – {formatTime(request.end_time)}
        </span>
        <span>{request.modality === 'virtual' ? t('Virtual') : request.modality === 'presencial' ? t('Presencial') : t('Híbrida')}</span>
      </div>
      {request.message && <p className="mt-4 whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-3 text-sm text-gray-700">{request.message}</p>}
      {request.session_status === 'cancelada' ? (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{t('Esta sesión de tutoría fue cancelada.')}</p>
      ) : confirmed && (
        <div className="mt-4 space-y-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">
          <p className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-4 w-4" />{t('Tutoría confirmada')}</p>
          <p>{t('Estado de la sesión')}: {request.session_status === 'programada' ? t('Programada') : request.session_status === 'en_curso' ? t('En curso') : t('Completada')}</p>
          {request.location_or_link && <p className="flex items-start gap-2 break-all"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            {meetingUrl ? <a href={meetingUrl} target="_blank" rel="noopener noreferrer" className="underline">{t('Abrir enlace de la tutoría')}</a> : request.location_or_link}
          </p>}
        </div>
      )}
      {asTutor && canRespond(request) && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          {decision ? (
            <div className="space-y-3" onKeyDown={(event) => { if (event.key === 'Escape' && !busy) setDecision(null) }}>
              <p className="text-sm text-gray-700" role="status">
                {decision === 'aceptada' ? t('Al aceptar, la tutoría quedará confirmada para este estudiante.') : t('Al rechazar, el estudiante verá su solicitud como rechazada.')}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button autoFocus disabled={busy} isLoading={saving} onClick={async () => {
                  if (await onRespond(request.id, decision)) setDecision(null)
                }}>{decision === 'aceptada' ? t('Confirmar aceptación') : t('Confirmar rechazo')}</Button>
                <Button variant="secondary" disabled={busy} onClick={() => setDecision(null)}>{t('Cancelar')}</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy} onClick={() => setDecision('aceptada')}>{t('Aceptar solicitud')}</Button>
              <Button variant="secondary" disabled={busy} onClick={() => setDecision('rechazada')}>{t('Rechazar solicitud')}</Button>
            </div>
          )}
        </div>
      )}
      {!asTutor && onCancel && canCancel(request) && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          {confirmingCancel ? (
            <div className="space-y-3" onKeyDown={(event) => { if (event.key === 'Escape' && !busy) setConfirmingCancel(false) }}>
              <p className="text-sm text-gray-700" role="status">
                {t('¿Deseas cancelar esta solicitud pendiente? Podrás volver a solicitar otro horario disponible.')}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="danger" autoFocus disabled={busy} isLoading={saving} onClick={async () => {
                  if (await onCancel(request.id)) setConfirmingCancel(false)
                }}>{t('Confirmar cancelación')}</Button>
                <Button variant="secondary" disabled={busy} onClick={() => setConfirmingCancel(false)}>{t('Volver')}</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" disabled={busy} onClick={() => setConfirmingCancel(true)}>
                <XCircle className="h-4 w-4 text-red-600" />
                {t('Cancelar solicitud')}
              </Button>
            </div>
          )}
        </div>
      )}
      {request.status === 'pendiente' && !canRespond(request) && request.session_status !== 'cancelada' && (
        <p className="mt-4 text-sm text-gray-500">{t('Esta sesión ya no admite respuestas.')}</p>
      )}
      <p className="mt-4 text-xs text-gray-500">{t('Solicitud enviada el {date}', { date: new Date(request.created_at).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }) })}</p>
    </article>
  )
}
