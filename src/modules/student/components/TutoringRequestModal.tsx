import { useTranslations } from '@/i18n/useTranslations'
import { useEffect, useState, type FormEvent } from 'react'
import { X, Calendar, Clock, BookOpen, User, Video, MapPin, Send } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import { toast } from '@/shared/store/toast.store'
import type { TutorSlotRow } from '@/types/database.types'
import { backendErrorMessage, createTutoringRequest } from '../services/tutor-search.api'
import { formatTime, parseISODate } from '../utils/date-utils'

const MAX_MESSAGE_LENGTH = 500

interface TutoringRequestModalProps {
  slot: TutorSlotRow
  tutorName: string
  onClose: () => void
  /** Se llama tras crear la solicitud, o si el horario cambió y conviene recargarlo. */
  onDone: () => void
}

export function TutoringRequestModal({ slot, tutorName, onClose, onDone }: TutoringRequestModalProps) {
  const { t, locale } = useTranslations()
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isSubmitting, onClose])

  const dateLabel = parseISODate(slot.session_date).toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const modalityLabel =
    slot.modality === 'virtual' ? t("Virtual") : slot.modality === 'presencial' ? t("Presencial") : t("Híbrida")

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      await createTutoringRequest(slot.session_id, message)
      toast.success(t("Solicitud enviada"), t("El tutor recibirá una notificación con tu solicitud."))
      onDone()
    } catch (err) {
      console.error('Error al crear la solicitud de tutoría:', err)
      const backendMessage = backendErrorMessage(err)
      toast.error(
        t("No se pudo enviar la solicitud"),
        backendMessage ? t(backendMessage as Parameters<typeof t>[0]) : t("Error inesperado al enviar la solicitud."),
      )
      // El horario pudo llenarse o cambiar: se recarga la disponibilidad.
      onDone()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-modal-title"
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-gray-100 p-5">
          <div>
            <h2 id="request-modal-title" className="text-lg font-bold text-gray-900">
              {t("Solicitar tutoría")}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {t("Revisa los datos del horario y envía tu solicitud al tutor.")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label={t("Cerrar")}
            title={t("Cerrar")}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto p-5">
          <dl className="space-y-2.5 rounded-xl border border-gray-100 bg-gray-50/70 p-4 text-sm">
            <div className="flex items-start gap-2.5">
              <User className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
              <div>
                <dt className="text-xs font-medium text-gray-400">{t("Tutor")}</dt>
                <dd className="font-semibold text-gray-900">{tutorName}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
              <div>
                <dt className="text-xs font-medium text-gray-400">{t("Materia")}</dt>
                <dd className="font-semibold text-gray-900">
                  {slot.subject_code} · {slot.subject_name}
                </dd>
                <dd className="text-xs text-gray-500">{slot.title}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
              <div>
                <dt className="text-xs font-medium text-gray-400">{t("Fecha")}</dt>
                <dd className="font-semibold capitalize text-gray-900">{dateLabel}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
              <div>
                <dt className="text-xs font-medium text-gray-400">{t("Horario")}</dt>
                <dd className="font-semibold text-gray-900">
                  {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              {slot.modality === 'presencial' ? (
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
              ) : (
                <Video className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
              )}
              <div>
                <dt className="text-xs font-medium text-gray-400">{t("Modalidad")}</dt>
                <dd className="font-semibold text-gray-900">{modalityLabel}</dd>
              </div>
            </div>
          </dl>

          <div>
            <label htmlFor="request-message" className="mb-1 block text-sm font-medium text-gray-700">
              {t("Mensaje para el tutor (opcional)")}
            </label>
            <textarea
              id="request-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={MAX_MESSAGE_LENGTH}
              rows={4}
              disabled={isSubmitting}
              placeholder={t("Cuéntale qué temas necesitas reforzar...")}
              className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-300 disabled:cursor-not-allowed disabled:bg-gray-50"
            />
            <p className="mt-1 text-right text-xs text-gray-400">
              {message.length}/{MAX_MESSAGE_LENGTH}
            </p>
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              {t("Cancelar")}
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {!isSubmitting && <Send className="h-4 w-4" />}
              {t("Enviar solicitud")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
