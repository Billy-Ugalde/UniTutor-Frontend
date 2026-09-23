import { useEffect, useState } from 'react'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Card } from '@/shared/components/ui/Card'
import type { Institution } from '@/types/database.types'

/**
 * Dashboard principal — página de inicio para usuarios autenticados.
 */
export function DashboardPage() {
  const { fullName, profile, roles } = useAuth()
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
      inst_admin: 'bg-purple-100 text-purple-700',
      tutor: 'bg-green-100 text-green-700',
      estudiante: 'bg-blue-100 text-blue-700',
    }[role] ?? 'bg-gray-100 text-gray-700')

  return (
    <div className="space-y-6">
      {/* Bienvenida */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          ¡Bienvenido, {fullName}!
        </h1>
        <p className="mt-1 text-gray-500">Este es tu panel de control en UniTutor.</p>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Perfil */}
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
                  {roles.map((role) => (
                    <span
                      key={role}
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleColor(role)}`}
                    >
                      {roleLabel(role)}
                    </span>
                  ))}
                  {roles.length === 0 && (
                    <span className="text-xs text-gray-400">Sin roles asignados</span>
                  )}
                </div>
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* Institución */}
        <Card>
          <Card.Body>
            <p className="text-sm font-medium text-gray-500">Tu institución</p>
            {institution ? (
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

        {/* Estado */}
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

      {/* Módulos */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-800">Módulos disponibles</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Buscar tutores', icon: '🔍', href: '/tutors', available: false },
            { label: 'Mis solicitudes', icon: '📋', href: '/requests', available: false },
            { label: 'Mis tutorías', icon: '📚', href: '/sessions', available: false },
            { label: 'Administración', icon: '⚙️', href: '/admin', available: false },
          ].map(({ label, icon, available }) => (
            <div
              key={label}
              className={[
                'rounded-xl border p-4 transition-colors',
                available
                  ? 'cursor-pointer border-primary-200 bg-primary-50 hover:bg-primary-100'
                  : 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-60',
              ].join(' ')}
            >
              <span className="text-2xl">{icon}</span>
              <p className="mt-2 font-medium text-gray-700">{label}</p>
              {!available && <p className="mt-0.5 text-xs text-gray-400">Próximamente</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

