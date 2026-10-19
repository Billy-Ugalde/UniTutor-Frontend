import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { AppNotification } from '@/types/database.types'

const NOTIFICATION_LIMIT = 20

interface UseTutorNotificationsOptions {
  userId: string | undefined
  enabled: boolean
  /** Se invoca cuando llega una notificación nueva por tiempo real. */
  onNew?: (notification: AppNotification) => void
}

export function useTutorNotifications({ userId, enabled, onNew }: UseTutorNotificationsOptions) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [pendingCount, setPendingCount] = useState(0)

  const onNewRef = useRef(onNew)
  useEffect(() => {
    onNewRef.current = onNew
  }, [onNew])

  const load = useCallback(async () => {
    if (!userId) return
    const [notificationsRes, pendingRes] = await Promise.all([
      supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(NOTIFICATION_LIMIT),
      supabase
        .from('tutoring_requests')
        .select('id', { count: 'exact', head: true })
        .eq('tutor_id', userId)
        .eq('status', 'pendiente'),
    ])

    if (notificationsRes.error) {
      console.error('Error al cargar notificaciones:', notificationsRes.error)
    } else {
      setNotifications((notificationsRes.data ?? []) as AppNotification[])
    }

    if (pendingRes.error) {
      console.error('Error al contar solicitudes pendientes:', pendingRes.error)
    } else {
      setPendingCount(pendingRes.count ?? 0)
    }
  }, [userId])

  useEffect(() => {
    if (!enabled || !userId) return

    // La carga inicial se agenda para no encadenar setState dentro del efecto.
    const initialLoad = setTimeout(() => void load(), 0)

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const incoming = payload.new as AppNotification
          setNotifications((current) =>
            current.some((item) => item.id === incoming.id)
              ? current
              : [incoming, ...current].slice(0, NOTIFICATION_LIMIT),
          )
          onNewRef.current?.(incoming)
          void load()
        },
      )
      .subscribe()

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void load()
    }
    document.addEventListener('visibilitychange', refreshWhenVisible)

    return () => {
      clearTimeout(initialLoad)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
      void supabase.removeChannel(channel)
    }
  }, [enabled, userId, load])

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)))
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id)
    if (error) console.error('Error al marcar la notificación como leída:', error)
  }, [])

  const markAllAsRead = useCallback(async () => {
    if (!userId) return
    setNotifications((current) => current.map((item) => ({ ...item, read: true })))
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)
    if (error) console.error('Error al marcar las notificaciones como leídas:', error)
  }, [userId])

  const unreadCount = notifications.filter((item) => !item.read).length

  return { notifications, pendingCount, unreadCount, markAsRead, markAllAsRead }
}
