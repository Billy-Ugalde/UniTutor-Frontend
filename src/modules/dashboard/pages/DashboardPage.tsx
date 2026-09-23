import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Shield,
  BookOpen,
  Search,
  ClipboardList,
  Calendar,
  Clock,
  ArrowRight,
} from 'lucide-react'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Card } from '@/shared/components/ui/Card'
import type { Institution } from '@/types/database.types'

export function DashboardPage() {
  const { fullName, profile, roles, hasRole, isSuperAdmin } = useAuth()
  const [institution, setInstitution] = useState<Institution | null>(null)

  useEffect(() => {
    if (!profile?.institution_id) return
    const load = async () => {
      const { data } = await supabase
        .from('institutions')
        .select('*')
        .eq('id', profile.institution_id!)
        .single()
      setInstitution(data)
    }
    void load()
  }, [profile?.institution_id])

  const roleLabel = (role: string) =>
    ({ inst_admin: 'Administrador', tutor: 'Tutor', estudiante: 'Estudiante' }[role] ?? role)

  const roleColor = (role: string) =>
    ({
      inst_admin: 'bg-blue-100 text-blue-800 border border-blue-200',
      tutor: 'bg-green-100 text-green-800 border border-green-200',
      estudiante: 'bg-amber-100 text-amber-800 border border-amber-200',
    }[role] ?? 'bg-gray-100 text-gray-700 border border-gray-200')

  const isInstAdmin = hasRole('inst_admin')
  const isAdmin = isSuperAdmin || isInstAdmin
  const isTutor = hasRole('tutor')
  const isStudent = hasRole('estudiante')

  const availableModules = useMemo(() => {
    const modules: {
      id: string
      label: string
      icon: typeof Shield
      href: string
      available: boolean
      badgeText: string
      description: string
    }[] = []

    if (isAdmin) {
      modules.push({
        id: 'admin-panel',
        label: 'Panel de Administración',
        icon: Shield,
        href: '/admin',
        available: true,
        badgeText: 'Disponible',
        description: 'Centro de gestión institucional: instituciones, usuarios y materias.',
      })
    }

    if (isTutor) {
      modules.push(
        {
          id: 'tutor-sessions',
          label: 'Mis Tutorías Impartidas',
          icon: Calendar,
          href: '/sessions',
          available: false,
          badgeText: 'Próximamente',
          description: 'Consulta tus sesiones asignadas y calendario',
        },
        {
          id: 'tutor-requests',
          label: 'Solicitudes Recibidas',
          icon: ClipboardList,
          href: '/requests',
          available: false,
          badgeText: 'Próximamente',
          description: 'Revisa y responde a solicitudes de estudiantes',
        },
        {
          id: 'tutor-availability',
          label: 'Mi Disponibilidad y Materias',
          icon: Clock,
          href: '/availability',
          available: false,
          badgeText: 'Próximamente',
          description: 'Configura tus horarios y asignaturas de dominio',
        }
      )
    }

    if (isStudent || (!isAdmin && !isTutor)) {
      modules.push(
        {
          id: 'student-search',
          label: 'Buscar Tutores',
          icon: Search,
          href: '/tutors',
          available: false,
          badgeText: 'Próximamente',
          description: 'Encuentra tutores calificados por materia',
        },
        {
          id: 'student-requests',
          label: 'Mis Solicitudes',
          icon: ClipboardList,
          href: '/requests',
          available: false,
          badgeText: 'Próximamente',
          description: 'Estado de tus solicitudes de tutoría enviadas',
        },
        {
          id: 'student-sessions',
          label: 'Mis Sesiones de Tutoría',
          icon: BookOpen,
          href: '/sessions',
          available: false,
          badgeText: 'Próximamente',
          description: 'Horarios de tus tutorías confirmadas',
        }
      )
    }

    return modules
  }, [isAdmin, isTutor, isStudent])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          ¡Bienvenido, {fullName}!
        </h1>
        <p className="mt-1 text-gray-500">Este es tu panel de control en UniTutor.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <Card.Body>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-lg font-semibold text-primary-700">
                {profile?.first_name?.charAt(0).toUpperCase() ?? '?'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-500">Tu perfil</p>
                <p className="mt-0.5 truncate font-semibold text-gray-900">{fullName}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {isSuperAdmin && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800">
                      <Shield className="h-3 w-3 text-blue-700" /> Super Administrador
                    </span>
                  )}
                  {roles.map((role) => (
                    <span
                      key={role}
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleColor(
                        role
                      )}`}
                    >
                      {roleLabel(role)}
                    </span>
                  ))}
                  {!isSuperAdmin && roles.length === 0 && (
                    <span className="text-xs text-gray-400">Sin roles asignados</span>
                  )}
                </div>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <p className="text-sm font-medium text-gray-500">Tu institución</p>
            {isSuperAdmin ? (
              <>
                <p className="mt-0.5 font-semibold text-blue-900">Plataforma Global</p>
                <p className="mt-1 text-xs text-blue-700">
                  Acceso de Super Administrador a todas las instituciones
                </p>
              </>
            ) : institution ? (
              <>
                <p className="mt-0.5 font-semibold text-gray-900">{institution.name}</p>
                {institution.official_email && (
                  <p className="mt-1 text-sm text-gray-500">{institution.official_email}</p>
                )}
              </>
            ) : (
              <p className="mt-0.5 text-sm text-gray-400">
                {profile?.institution_id ? 'Cargando...' : 'No asignado a ninguna institución'}
              </p>
            )}
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <p className="text-sm font-medium text-gray-500">Estado de la plataforma</p>
            <div className="mt-2 space-y-2">
              {[
                { label: 'Supabase conectado', ok: true },
                { label: 'Autenticación activa', ok: true },
              ].map(({ label, ok }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-sm text-gray-700">{label}</span>
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>
      </div>

      <div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {availableModules.map((item) => {
            const Icon = item.icon
            const cardContent = (
              <div
                className={[
                  'rounded-xl border p-5 transition-all h-full flex flex-col justify-between',
                  item.available
                    ? 'cursor-pointer border-blue-200 bg-blue-50/40 hover:bg-blue-50 hover:border-blue-300 shadow-xs hover:shadow-sm'
                    : 'cursor-not-allowed border-gray-200 bg-gray-50/70 opacity-70',
                ].join(' ')}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        item.available ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        item.available
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {item.badgeText}
                    </span>
                  </div>
                  <h3
                    className={`mt-3 font-semibold ${
                      item.available ? 'text-gray-900' : 'text-gray-700'
                    }`}
                  >
                    {item.label}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100/80">
                  {item.available ? (
                    <span className="inline-flex items-center text-xs font-semibold text-blue-600 group-hover:text-blue-700">
                      Acceder al módulo <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">En desarrollo</span>
                  )}
                </div>
              </div>
            )

            return item.available ? (
              <Link key={item.id} to={item.href} className="group">
                {cardContent}
              </Link>
            ) : (
              <div key={item.id}>{cardContent}</div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
