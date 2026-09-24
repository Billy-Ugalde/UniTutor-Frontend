import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Shield,
  BookOpen,
  Search,
  ClipboardList,
  Calendar,
  Clock,
  ArrowRight,
  KeyRound,
  X,
  Eye,
  Mail,
  Phone,
  Building2,
  UserCheck,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Card } from '@/shared/components/ui/Card'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { toast } from '@/shared/store/toast.store'
import type { Institution } from '@/types/database.types'

export function DashboardPage() {
  const { fullName, profile, roles, hasRole, isSuperAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  const [institution, setInstitution] = useState<Institution | null>(null)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

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

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword.length < 8) {
      toast.warning('Contraseña muy corta', 'La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.warning('Validación fallida', 'Las contraseñas no coinciden.')
      return
    }

    setIsUpdatingPassword(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) {
        throw error
      }

      toast.success(
        'Contraseña actualizada',
        'Tu contraseña ha sido cambiada. Inicia sesión con tus nuevas credenciales.'
      )
      setIsPasswordModalOpen(false)
      setNewPassword('')
      setConfirmPassword('')

      await signOut()
      navigate('/login', { replace: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al cambiar la contraseña.'
      toast.error('Error al cambiar contraseña', msg)
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            ¡Bienvenido, {fullName}!
          </h1>
          <p className="mt-1 text-gray-500">Este es tu panel de control en UniTutor.</p>
        </div>
        <Button
          variant="secondary"
          onClick={() => setIsPasswordModalOpen(true)}
          className="self-start sm:self-auto flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <KeyRound className="h-4 w-4 text-gray-600" />
          Cambiar contraseña
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <Card.Body>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-lg font-semibold text-primary-700">
                {profile?.first_name?.charAt(0).toUpperCase() ?? '?'}
              </div>
              <div className="min-w-0 flex-1">
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
            <div className="mt-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-700 hover:text-primary-800 transition-colors cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5" />
                Ver detalles
              </button>
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

      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Cambiar Contraseña
                  </h3>
                  <p className="text-xs text-gray-500">
                    Actualiza las credenciales de acceso a tu cuenta
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isUpdatingPassword) {
                    setIsPasswordModalOpen(false)
                    setNewPassword('')
                    setConfirmPassword('')
                  }
                }}
                disabled={isUpdatingPassword}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer disabled:cursor-not-allowed"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdatePassword} className="mt-4 space-y-4">
              <Input
                label="Nueva contraseña"
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
                disabled={isUpdatingPassword}
              />

              <Input
                label="Confirmar nueva contraseña"
                type="password"
                placeholder="Repite tu nueva contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                disabled={isUpdatingPassword}
              />

              <div className="mt-6 flex justify-end gap-3 pt-3 border-t">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsPasswordModalOpen(false)
                    setNewPassword('')
                    setConfirmPassword('')
                  }}
                  disabled={isUpdatingPassword}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isUpdatingPassword}
                >
                  Actualizar Contraseña
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 text-lg">
                  {profile?.first_name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{fullName}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-gray-500">{profile?.email || 'Sin correo electrónico'}</p>
                    {profile?.active !== false ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                        <CheckCircle2 className="h-3 w-3" /> Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                        <XCircle className="h-3 w-3" /> Inactivo
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-lg border border-gray-100 bg-gray-50/70 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Building2 className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="text-xs text-gray-400 font-medium">Institución:</span>
                  <span className="font-semibold text-gray-900">
                    {isSuperAdmin
                      ? 'Plataforma Global (Super Administrador)'
                      : institution?.name || (profile?.institution_id ? 'Cargando...' : 'Institución no asignada')}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Mail className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="text-xs text-gray-400 font-medium">Correo:</span>
                  <span className="text-gray-800">{profile?.email || 'No registrado'}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Phone className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="text-xs text-gray-400 font-medium">Teléfono:</span>
                  <span className="text-gray-800">{profile?.phone || 'No registrado'}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Calendar className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="text-xs text-gray-400 font-medium">Fecha de Registro:</span>
                  <span className="text-gray-800">
                    {profile?.created_at
                      ? new Date(profile.created_at).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'No disponible'}
                  </span>
                </div>

                <div className="pt-1">
                  <span className="text-xs text-gray-400 font-medium">ID de Usuario:</span>
                  <p className="font-mono text-xs text-gray-500 select-all mt-0.5">{profile?.id}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  Roles Asignados
                </p>
                <div className="flex flex-wrap gap-2">
                  {isSuperAdmin && (
                    <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                      <Shield className="h-3.5 w-3.5 text-blue-700" /> Super Administrador
                    </span>
                  )}
                  {roles.map((role) => (
                    <span
                      key={role}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold capitalize ${roleColor(
                        role
                      )}`}
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      {roleLabel(role)}
                    </span>
                  ))}
                  {!isSuperAdmin && roles.length === 0 && (
                    <span className="text-xs text-gray-400 italic">Sin roles asignados</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end pt-3 border-t">
              <Button
                variant="secondary"
                onClick={() => setIsProfileModalOpen(false)}
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
