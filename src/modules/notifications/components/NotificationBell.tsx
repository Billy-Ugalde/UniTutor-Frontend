import { useTranslations } from '@/i18n/useTranslations'
import { useEffect, useRef, useState } from 'react'
import { Bell, CheckCheck, ClipboardList } from 'lucide-react'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { toast } from '@/shared/store/toast.store'
import type { AppNotification, NewRequestNotificationPayload } from '@/types/database.types'
import { useTutorNotifications } from '../hooks/useTutorNotifications'

export function NotificationBell() {
  const { t, locale } = useTranslations()
  const { profile, hasRole } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const isTutor = hasRole('tutor')

  const describe = (notification: AppNotification) => {
    const payload = (notification.payload ?? {}) as NewRequestNotificationPayload
    return {
      title: t("{student} solicitó una tutoría de {subject}", {
        student: payload.student_name || t("Un estudiante"),
        subject: payload.subject_name ?? '',
      }),
      payload,
    }
  }

  const { notifications, pendingCount, unreadCount, markAsRead, markAllAsRead } = useTutorNotifications({
    userId: profile?.id,
    enabled: isTutor,
    onNew: (notification) => {
      toast.info(t("Nueva solicitud de tutoría"), describe(notification).title)
    },
  })

  useEffect(() => {
    if (!isOpen) return
    const handlePointer = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false)
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [isOpen])

  if (!isTutor) return null

  const badgeCount = pendingCount

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={
          badgeCount > 0
            ? t("Notificaciones: {count} solicitudes pendientes", { count: badgeCount })
            : t("Notificaciones")
        }
        title={t("Notificaciones")}
        className="relative rounded-md border border-gray-200 bg-white p-2 text-gray-600 transition-colors hover:bg-gray-50 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
      >
        <Bell className="h-5 w-5" />
        {badgeCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900">{t("Notificaciones")}</h2>
              <p className="text-xs text-gray-500">
                {pendingCount === 1
                  ? t("1 solicitud pendiente")
                  : t("{count} solicitudes pendientes", { count: pendingCount })}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllAsRead()}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:text-primary-800 cursor-pointer"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                {t("Marcar todas como leídas")}
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <ClipboardList className="mx-auto h-9 w-9 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">{t("No tienes notificaciones")}</p>
            </div>
          ) : (
            <ul className="max-h-96 divide-y divide-gray-100 overflow-y-auto">
              {notifications.map((notification) => {
                const { title, payload } = describe(notification)
                return (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!notification.read) void markAsRead(notification.id)
                      }}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 cursor-pointer ${
                        notification.read ? '' : 'bg-primary-50/50'
                      }`}
                    >
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          notification.read ? 'bg-transparent' : 'bg-primary-600'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-gray-900">{title}</span>
                        {payload.session_title && (
                          <span className="mt-0.5 block truncate text-xs text-gray-600">
                            {payload.session_title}
                          </span>
                        )}
                        {payload.message && (
                          <span className="mt-0.5 block line-clamp-2 text-xs italic text-gray-500">
                            “{payload.message}”
                          </span>
                        )}
                        <span className="mt-1 block text-[11px] text-gray-400">
                          {new Date(notification.created_at).toLocaleString(locale, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
