import { useCallback, useEffect, useRef, useState } from 'react'
import { loadRequests, type RequestRow } from '../services/requests.api'

export function useRequests(userId: string | undefined, asTutor: boolean) {
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const generation = useRef(0)
  const invalidate = useCallback(() => { generation.current++ }, [])

  const refresh = useCallback(async () => {
    if (!userId) return
    const version = ++generation.current
    try {
      const rows = await loadRequests(asTutor)
      if (version !== generation.current) return
      setRequests(rows)
      setError(null)
    } catch (err) {
      if (version === generation.current) {
        console.error('Requests API load failed', {
          code: err && typeof err === 'object' && 'code' in err ? err.code : undefined,
        })
        setError(err)
      }
    } finally {
      if (version === generation.current) setIsLoading(false)
    }
  }, [userId, asTutor])

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      setRequests([])
      setIsLoading(true)
      setError(null)
      void refresh()
    }, 0)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    const interval = window.setInterval(onVisible, 30_000)
    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      invalidate()
      clearTimeout(initialLoad)
      clearInterval(interval)
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh, invalidate])

  return { requests, isLoading, error, refresh }
}
