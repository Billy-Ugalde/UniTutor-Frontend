import { useTranslations } from '@/i18n/useTranslations'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { GraduationCap, Shield, LogOut, BookOpen, Calendar } from 'lucide-react'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { LanguageSelector } from '@/shared/components/LanguageSelector'

export function AppLayout() {
  const { t } = useTranslations()
  const { fullName, roles, hasRole, isSuperAdmin, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const roleLabel = (role: string) =>
    ({ inst_admin: t("Administrador"), tutor: t("Tutor"), estudiante: t("Estudiante") }[role] ?? role)

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/dashboard" className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary-600" />
            <span className="text-xl font-bold text-primary-700">UniTutor</span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <Link
              to="/dashboard"
              className="text-sm font-medium text-gray-600 hover:text-primary-600"
            >
              {t("Inicio")}
            </Link>

            {hasRole('tutor') && (
              <>
                <Link
                  to="/tutor/sesiones"
                  className="text-sm font-medium text-blue-700 hover:text-blue-900 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Calendar className="h-4 w-4 text-blue-600" /> {t("Mis Sesiones")}
                </Link>
                <Link
                  to="/tutor/materias"
                  className="text-sm font-medium text-green-700 hover:text-green-900 bg-green-50 px-2.5 py-1 rounded-md border border-green-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <BookOpen className="h-4 w-4 text-green-600" /> {t("Mis Materias")}
                </Link>
              </>
            )}

            {(hasRole('inst_admin') || isSuperAdmin) && (
              <Link
                to="/admin"
                className="text-sm font-medium text-blue-700 hover:text-blue-900 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 flex items-center gap-1.5 transition-colors"
              >
                <Shield className="h-4 w-4 text-blue-600" /> {t("Administración")}
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-3">
            <LanguageSelector />
            <div className="hidden flex-col items-end sm:flex">
              <span className="text-sm font-medium text-gray-900">{fullName}</span>
              <span className="text-xs text-gray-500">
                {isSuperAdmin
                  ? t("Super Administrador")
                  : roles.map(roleLabel).join(' · ') || t("Estudiante")}
              </span>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4 text-red-600" />
              {t("Cerrar sesión")}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      <footer className="border-t border-gray-200 bg-white py-4 text-center text-xs text-gray-400">
        UniTutor © {new Date().getFullYear()} {t("— Plataforma de tutorías universitarias")}
      </footer>
    </div>
  )
}
