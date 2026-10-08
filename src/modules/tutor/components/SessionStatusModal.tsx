import { useTranslations } from '@/i18n/useTranslations'
import { CheckCircle2, XCircle, RotateCcw, X, ArrowRight, Calendar, Clock } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import type { TutoringSession, SessionStatus } from '@/types/database.types'

interface SessionStatusModalProps {
  isOpen: boolean
  session: TutoringSession | null
  targetStatus: SessionStatus | null
  subjectLabel?: string
  isSubmitting?: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
}

export function SessionStatusModal({
  isOpen,
  session,
  targetStatus,
  subjectLabel,
  isSubmitting = false,
  onClose,
  onConfirm,
}: SessionStatusModalProps) {
  const { t } = useTranslations()

  if (!isOpen || !session || !targetStatus) return null

  const getStatusBadge = (status: SessionStatus) => {
    switch (status) {
      case 'programada':
        return <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800 border border-blue-200">{t("Programada")}</span>
      case 'en_curso':
        return <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">{t("En curso")}</span>
      case 'completada':
        return <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800 border border-green-200">{t("Completada")}</span>
      case 'cancelada':
        return <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800 border border-red-200">{t("Cancelada")}</span>
    }
  }

  const isComplete = targetStatus === 'completada'
  const isCancel = targetStatus === 'cancelada'

  const title = isComplete
    ? t("Confirmar Sesión Completada")
    : isCancel
    ? t("Confirmar Cancelación de Tutoría")
    : session.status === 'cancelada'
    ? t("Reactivar Sesión de Tutoría")
    : t("Reabrir Sesión de Tutoría")

  const description = isComplete
    ? t("¿Confirmas que esta tutoría se ha completado? Pasará al historial de sesiones impartidas y no podrá ser editada a menos que la reabras.")
    : isCancel
    ? t("¿Confirmas que deseas cancelar esta sesión de tutoría? Los datos quedarán registrados como cancelados y no podrá ser editada.")
    : t("¿Deseas reactivar esta sesión como programada? Volverá a estar activa y habilitada para editarse.")

  const confirmText = isComplete
    ? t("Marcar como completada")
    : isCancel
    ? t("Confirmar Cancelación")
    : t("Reabrir como Programada")

  const confirmButtonClass = isComplete
    ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
    : isCancel
    ? 'bg-red-600 hover:bg-red-700 text-white cursor-pointer'
    : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl flex flex-col overflow-hidden">
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                isComplete
                  ? 'bg-green-100 text-green-700'
                  : isCancel
                  ? 'bg-red-100 text-red-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {isComplete ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : isCancel ? (
                <XCircle className="h-5 w-5" />
              ) : (
                <RotateCcw className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">{title}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{subjectLabel}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-3.5 space-y-2.5">
            <h4 className="text-sm font-semibold text-gray-900">{session.title}</h4>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-gray-500" />
                {session.date}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-gray-500" />
                {session.start_time.substring(0, 5)} - {session.end_time.substring(0, 5)}
              </span>
            </div>

            <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500">{t("Estado actual:")}</span>
                {getStatusBadge(session.status)}
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500">{t("Nuevo estado:")}</span>
                {getStatusBadge(targetStatus)}
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-600 leading-relaxed">{description}</p>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 bg-gray-50 border-t border-gray-100">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            className="cursor-pointer"
          >
            {t("Cancelar")}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className={confirmButtonClass}
          >
            {isSubmitting ? t("Actualizando...") : confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}
