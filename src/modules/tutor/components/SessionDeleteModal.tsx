import { useTranslations } from '@/i18n/useTranslations'
import { Trash2, X, Calendar, Clock } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import type { TutoringSession } from '@/types/database.types'

interface SessionDeleteModalProps {
  isOpen: boolean
  session: TutoringSession | null
  subjectLabel?: string
  isSubmitting?: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
}

export function SessionDeleteModal({
  isOpen,
  session,
  subjectLabel,
  isSubmitting = false,
  onClose,
  onConfirm,
}: SessionDeleteModalProps) {
  const { t } = useTranslations()

  if (!isOpen || !session) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl flex flex-col overflow-hidden">
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                {t("Confirmar eliminación de tutoría")}
              </h3>
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
          <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-3.5 space-y-2">
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
          </div>

          <p className="text-xs text-gray-600 leading-relaxed">
            {t("¿Estás seguro de eliminar esta sesión de tutoría permanentemente? Esta acción no se puede deshacer.")}
          </p>
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
            variant="danger"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="cursor-pointer"
          >
            {isSubmitting ? t("Eliminando...") : t("Eliminar Sesión")}
          </Button>
        </div>
      </div>
    </div>
  )
}
