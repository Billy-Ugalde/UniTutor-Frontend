import { useTranslations } from '@/i18n/useTranslations'
import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { toast } from '@/shared/store/toast.store'
import { useTutorNotifications } from '../hooks/useTutorNotifications'

export function NotificationBell() {
  const { t } = useTranslations()
  const { profile, hasRole } = useAuth()
  const isTutor = hasRole('tutor')

  const { pendingCount } = useTutorNotifications({
    userId: profile?.id,
    enabled: isTutor,
    onNew: (notification) => {
      const payload = (notification.payload ?? {}) as { student_name?: string; subject_name?: string }
      toast.info(
        t("Nueva solicitud de tutoría"),
        t("{student} solicitó una tutoría de {subject}", {
          student: payload.student_name || t("Un estudiante"),
          subject: payload.subject_name ?? '',
        }),
      )
    },
  })

  if (!isTutor) return null

  const badgeCount = pendingCount

  return (
    <Link
      to="/tutor/solicitudes"
      aria-label={
        badgeCount > 0
          ? t("Notificaciones: {count} solicitudes pendientes", { count: badgeCount })
          : t("Notificaciones")
      }
      title={
        badgeCount > 0
          ? t("Notificaciones: {count} solicitudes pendientes", { count: badgeCount })
          : t("Notificaciones")
      }
      className="relative flex items-center justify-center rounded-md border border-gray-200 bg-white p-2 text-gray-600 transition-colors hover:bg-gray-50 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
    >
      <Bell className="h-5 w-5" />
      {badgeCount > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white">
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}
    </Link>
  )
}
