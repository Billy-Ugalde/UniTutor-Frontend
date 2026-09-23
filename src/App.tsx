import { useEffect } from 'react'
import { AppRouter } from '@/router'
import { useAuthStore } from '@/modules/auth/store/auth.store'

/**
 * Punto de entrada de la aplicación.
 * Inicializa el estado de autenticación y monta el router.
 */
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

  return <AppRouter />
}
