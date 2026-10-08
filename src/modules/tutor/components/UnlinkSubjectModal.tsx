import { useTranslations } from '@/i18n/useTranslations'
import { Trash2, AlertTriangle, X, Calendar } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'

export interface SubjectToUnlink {
  id: string
  tutorSubjectId: string
  name: string
  code: string
  customCode: string | null
  courseName: string
  totalSessionsCount: number
}

interface UnlinkSubjectModalProps {
  isOpen: boolean
  subject: SubjectToUnlink | null
  isSubmitting?: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
}

export function UnlinkSubjectModal({
  isOpen,
  subject,
  isSubmitting = false,
  onClose,
  onConfirm,
}: UnlinkSubjectModalProps) {
  const { t } = useTranslations()

  if (!isOpen || !subject) return null

  const isBlocked = subject.totalSessionsCount > 0
  const displayCode = subject.customCode || subject.code

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl flex flex-col overflow-hidden">
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                isBlocked ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'
              }`}
            >
              {isBlocked ? <AlertTriangle className="h-5 w-5" /> : <Trash2 className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                {isBlocked
                  ? t("No es posible deshabilitar materia")
                  : t("Confirmar deshabilitación de materia")}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {isBlocked
                  ? t("Materia con tutorías vinculadas")
                  : t("Acción de deshabilitación")}
              </p>
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
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200">
                {displayCode}
              </span>
              <span className="text-xs text-gray-500 truncate max-w-[200px]">
                {subject.courseName}
              </span>
            </div>
            <h4 className="text-sm font-semibold text-gray-900 truncate" title={subject.name}>
              {subject.name}
            </h4>
          </div>

          {isBlocked ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3.5 space-y-2 text-xs text-amber-900">
              <div className="flex items-center gap-2 font-semibold text-amber-800">
                <Calendar className="h-4 w-4 shrink-0 text-amber-700" />
                <span>
                  {t("Tutorías asociadas en tu historial: {count}", { count: subject.totalSessionsCount })}
                </span>
              </div>
              <p className="leading-relaxed">
                {t("Esta materia cuenta con {count} sesión(es) registrada(s) en tu historial académico. Para evitar tutorías huérfanas y preservar la trazabilidad institucional de los estudiantes, no es posible deshabilitar materias con tutorías vinculadas.", { count: subject.totalSessionsCount })}
              </p>
            </div>
          ) : (
            <div className="space-y-2 text-xs text-gray-600">
              <p className="leading-relaxed">
                {t("¿Estás seguro de que deseas deshabilitar esta materia? Ya no figurarás como tutor disponible para esta asignatura y no podrás programar nuevas tutorías a menos que la vuelvas a habilitar.")}
              </p>
              <div className="rounded-lg border border-green-200 bg-green-50 p-2.5 text-green-800">
                <p className="leading-relaxed font-medium">
                  {t("Esta materia no cuenta con tutorías registradas en tu historial, por lo que puede deshabilitarse de manera segura.")}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-4 bg-gray-50 border-t border-gray-100">
          {isBlocked ? (
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="cursor-pointer"
            >
              {t("Entendido")}
            </Button>
          ) : (
            <>
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
                {isSubmitting ? t("Deshabilitando...") : t("Deshabilitar Materia")}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
