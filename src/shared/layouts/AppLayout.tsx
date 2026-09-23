import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'

/**
 * Layout principal para usuarios autenticados.
 * Navbar superior + área de contenido + footer.
 */
export function AppLayout() {
  const { fullName, roles, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const roleLabel = (role: string) =>
    ({ inst_admin: 'Administrador', tutor: 'Tutor', estudiante: 'Estudiante' }[role] ?? role)

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Navbar */}
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="text-xl font-bold text-primary-700">UniTutor</span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <Link
              to="/dashboard"
              className="text-sm font-medium text-gray-600 hover:text-primary-600"
            >
              Inicio
            </Link>
            {/* Próximas rutas se agregarán aquí por módulo */}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden flex-col items-end sm:flex">
              <span className="text-sm font-medium text-gray-900">{fullName}</span>
              <span className="text-xs text-gray-500">
                {roles.map(roleLabel).join(' · ')}
              </span>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      <footer className="border-t border-gray-200 bg-white py-4 text-center text-xs text-gray-400">
        UniTutor © {new Date().getFullYear()} — Plataforma de tutorías universitarias
      </footer>
    </div>
  )
}

