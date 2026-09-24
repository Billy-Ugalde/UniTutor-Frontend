import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Shield,
  Building2,
  Users,
  BookOpen,
  UserCheck,
  GraduationCap,
  ArrowRight,
} from 'lucide-react'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { useAdminStore } from '@/modules/admin/store/admin.store'
import { supabase } from '@/lib/supabase'
import { Card } from '@/shared/components/ui/Card'
import type { Institution } from '@/types/database.types'

interface AdminStats {
  totalUsers: number
  totalTutors: number
  totalStudents: number
  totalSubjects: number
}

export function AdminDashboardPage() {
  const { profile, isSuperAdmin } = useAuth()
  const { selectedInstitutionId, setSelectedInstitutionId } = useAdminStore()
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [currentInst, setCurrentInst] = useState<Institution | null>(null)
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalTutors: 0,
    totalStudents: 0,
    totalSubjects: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  const fetchInstitutions = async () => {
    if (!isSuperAdmin) {
      if (profile?.institution_id) {
        setSelectedInstitutionId(profile.institution_id)
      }
      return
    }

    const { data } = await supabase
      .from('institutions')
      .select('*')
      .eq('active', true)
      .order('name')
    
    const list = data ?? []
    setInstitutions(list)

    const exists = list.some((i) => i.id === selectedInstitutionId)
    if (!exists && list.length > 0) {
      const fallbackId =
        profile?.institution_id && list.some((i) => i.id === profile.institution_id)
          ? profile.institution_id
          : list[0].id
      setSelectedInstitutionId(fallbackId)
    }
  }

  useEffect(() => {
    void fetchInstitutions()
  }, [isSuperAdmin, profile?.institution_id])

  const targetInstId = isSuperAdmin
    ? (selectedInstitutionId || profile?.institution_id)
    : profile?.institution_id

  useEffect(() => {
    if (!targetInstId) return

    const loadData = async () => {
      setIsLoading(true)
      try {
        const { data: instData } = await supabase
          .from('institutions')
          .select('*')
          .eq('id', targetInstId)
          .single()
        setCurrentInst(instData)

        const { count: usersCount } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('institution_id', targetInstId)

        const { count: tutorsCount } = await supabase
          .from('user_roles')
          .select('id', { count: 'exact', head: true })
          .eq('institution_id', targetInstId)
          .eq('role', 'tutor')
          .eq('active', true)

        const { count: studentsCount } = await supabase
          .from('user_roles')
          .select('id', { count: 'exact', head: true })
          .eq('institution_id', targetInstId)
          .eq('role', 'estudiante')
          .eq('active', true)

        const { count: subjectsCount } = await supabase
          .from('institution_subjects')
          .select('subject_id', { count: 'exact', head: true })
          .eq('institution_id', targetInstId)
          .eq('active', true)

        setStats({
          totalUsers: usersCount ?? 0,
          totalTutors: tutorsCount ?? 0,
          totalStudents: studentsCount ?? 0,
          totalSubjects: subjectsCount ?? 0,
        })
      } catch (err) {
        console.error('Error cargando estadísticas de administración:', err)
      } finally {
        setIsLoading(false)
      }
    }

    void loadData()
  }, [targetInstId])

  const adminModules = [
    ...(isSuperAdmin
      ? [
          {
            id: 'institutions',
            label: 'Gestión de Instituciones',
            icon: Building2,
            badge: 'Super Admin',
            description:
              'Supervisa universidades adscritas, edita sus datos de contacto y registra nuevas instituciones.',
            href: '/admin/institutions',
          },
        ]
      : []),
    {
      id: 'users',
      label: 'Gestión de Usuarios y Roles',
      icon: Users,
      badge: 'Disponible',
      description:
        'Administra el personal y estudiantes de la institución, asigna o revoca roles de tutor y administrador.',
      href: '/admin/users',
    },
    {
      id: 'subjects',
      label: 'Catálogo de Materias',
      icon: BookOpen,
      badge: 'Disponible',
      description:
        'Habilita o deshabilita qué asignaturas del catálogo global imparte la institución para tutorías.',
      href: '/admin/subjects',
    },
  ]

  return (
    <div className="space-y-6">
      {isSuperAdmin && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-blue-200 bg-blue-50/70 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-blue-900">Control de Plataforma (Super Administrador)</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-blue-700">Institución actual:</span>
                <select
                  value={selectedInstitutionId ?? ''}
                  onChange={(e) => setSelectedInstitutionId(e.target.value)}
                  className="rounded-lg border border-blue-300 bg-white px-3 py-1 text-xs font-semibold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Administración Institucional
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Gestión de usuarios, roles y materias para{' '}
          <span className="font-semibold text-gray-800">
            {currentInst?.name ?? 'la institución seleccionada'}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <Card.Body>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Usuarios Totales
                </p>
                <p className="mt-1 text-3xl font-extrabold text-gray-900">
                  {isLoading ? '...' : stats.totalUsers}
                </p>
              </div>
              <div className="rounded-full bg-blue-50 p-3 text-blue-600">
                <Users className="h-6 w-6" />
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">Registrados en la institución</p>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Tutores Activos
                </p>
                <p className="mt-1 text-3xl font-extrabold text-green-600">
                  {isLoading ? '...' : stats.totalTutors}
                </p>
              </div>
              <div className="rounded-full bg-green-50 p-3 text-green-600">
                <UserCheck className="h-6 w-6" />
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">Listos para impartir tutorías</p>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Estudiantes
                </p>
                <p className="mt-1 text-3xl font-extrabold text-sky-600">
                  {isLoading ? '...' : stats.totalStudents}
                </p>
              </div>
              <div className="rounded-full bg-sky-50 p-3 text-sky-600">
                <GraduationCap className="h-6 w-6" />
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">Con rol de estudiante activo</p>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Materias Ofertadas
                </p>
                <p className="mt-1 text-3xl font-extrabold text-amber-600">
                  {isLoading ? '...' : stats.totalSubjects}
                </p>
              </div>
              <div className="rounded-full bg-amber-50 p-3 text-amber-600">
                <BookOpen className="h-6 w-6" />
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">Disponibles para tutoría</p>
          </Card.Body>
        </Card>
      </div>

      <div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {adminModules.map((item) => {
            const Icon = item.icon
            return (
              <Link key={item.id} to={item.href} className="group">
                <div className="rounded-xl border p-5 transition-all h-full flex flex-col justify-between border-blue-200 bg-blue-50/40 hover:bg-blue-50 hover:border-blue-300 shadow-xs hover:shadow-sm cursor-pointer">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
                        {item.badge}
                      </span>
                    </div>
                    <h3 className="mt-3 font-semibold text-gray-900 group-hover:text-blue-900 transition-colors">
                      {item.label}
                    </h3>
                    <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100/80">
                    <span className="inline-flex items-center text-xs font-semibold text-blue-600 group-hover:text-blue-700">
                      Acceder al módulo <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
