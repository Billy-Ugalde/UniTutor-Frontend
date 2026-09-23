import { useEffect } from 'react'
import { AppRouter } from '@/router'
import { useAuthStore } from '@/modules/auth/store/auth.store'
import { ToastContainer } from '@/shared/components/ui/ToastContainer'

export default function App() {
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => {
    let cleanup: (() => void) | undefined

    const run = async () => {
      cleanup = await initialize()
    }
    void run()

    return () => {
      cleanup?.()
    }
  }, [initialize])

  return (
    <>
      <AppRouter />
      <ToastContainer />
    </>
  )
}
