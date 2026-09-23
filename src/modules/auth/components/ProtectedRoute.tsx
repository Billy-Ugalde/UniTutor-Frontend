import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'

/**
 * Guarda de rutas privadas.
 * Si el usuario no está autenticado, redirige a /login.
 * Mientras se verifica la sesión inicial, muestra un spinner.
 */
export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
          <span className="text-sm text-gray-500">Cargando...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

