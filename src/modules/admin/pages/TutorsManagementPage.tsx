import { useTranslations } from '@/i18n/useTranslations'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Shield, Trash2, CheckCircle2, XCircle } from 'lucide-react'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { useAdminStore } from '@/modules/admin/store/admin.store'
import { supabase } from '@/lib/supabase'
import { Card } from '@/shared/components/ui/Card'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Pagination } from '@/shared/components/ui/Pagination'
import { toast } from '@/shared/store/toast.store'
import type { Profile, UserRoleRecord, Institution } from '@/types/database.types'

const PAGE_SIZE = 10

/**
 * Gestión de tutores (solo lectura + eliminación).
 * El administrador NO puede editar la información del tutor; únicamente
 * consulta el listado con filtros y puede revocar el rol de tutor.
 */
export function TutorsManagementPage() {
  const { t, locale } = useTranslations()
  const { profile: currentProfile, isSuperAdmin } = useAuth()
  const { selectedInstitutionId, setSelectedInstitutionId } = useAdminStore()

  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [tutors, setTutors] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const targetInstId = isSuperAdmin
    ? selectedInstitutionId || currentProfile?.institution_id
    : currentProfile?.institution_id

  useEffect(() => {
    if (!isSuperAdmin) {
      if (currentProfile?.institution_id) setSelectedInstitutionId(currentProfile.institution_id)
      return
    }
    const fetchInstitutions = async () => {
      const { data } = await supabase
        .from('institutions')
        .select('*')
        .eq('active', true)
        .order('name')
      const list = data ?? []
      setInstitutions(list)
      if (!list.some((i) => i.id === selectedInstitutionId) && list.length > 0) {
        const fallbackId =
          currentProfile?.institution_id && list.some((i) => i.id === currentProfile.institution_id)
            ? currentProfile.institution_id
            : list[0].id
        setSelectedInstitutionId(fallbackId)
      }
    }
    void fetchInstitutions()
  }, [isSuperAdmin, currentProfile?.institution_id])

  const loadTutors = async () => {
    if (!targetInstId) return
    setIsLoading(true)
    try {
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('institution_id', targetInstId)
        .eq('role', 'tutor')
        .eq('active', true)
      if (rolesError) throw rolesError

      const tutorIds = (rolesData ?? []).map((r: UserRoleRecord) => r.user_id)
      if (tutorIds.length === 0) {
        setTutors([])
        return
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', tutorIds)
        .order('created_at', { ascending: false })
      if (profilesError) throw profilesError

      setTutors(profilesData ?? [])
    } catch (err) {
      console.error('Error al cargar tutores:', err)
      toast.error(t("Error de operación"), t("No fue posible cargar la lista de tutores."))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadTutors()
  }, [targetInstId])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter])

  const filteredTutors = useMemo(() => {
    return tutors.filter((u) => {
      const full = `${u.first_name} ${u.last_name} ${u.email ?? ''}`.toLowerCase()
      const matchesSearch = full.includes(searchTerm.toLowerCase())
      const matchesStatus =
        statusFilter === 'all' ? true : statusFilter === 'active' ? u.active : !u.active
      return matchesSearch && matchesStatus
    })
  }, [tutors, searchTerm, statusFilter])

  const paginatedTutors = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredTutors.slice(start, start + PAGE_SIZE)
  }, [filteredTutors, currentPage])

  const handleDeleteTutor = async (tutor: Profile) => {
    if (!targetInstId) return
    const confirmText = t(
      "¿Eliminar a {first} {last} como tutor? Perderá el rol de tutor en esta institución, pero sus datos personales no se modifican.",
      { first: tutor.first_name, last: tutor.last_name },
    )
    if (!window.confirm(confirmText)) return

    setDeletingId(tutor.id)
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', tutor.id)
        .eq('institution_id', targetInstId)
        .eq('role', 'tutor')
      if (error) throw error

      toast.success(
        t("Tutor eliminado"),
        t("{first} {last} ya no es tutor de la institución.", {
          first: tutor.first_name,
          last: tutor.last_name,
        }),
      )
      setTutors((prev) => prev.filter((u) => u.id !== tutor.id))
    } catch (err) {
      console.error('Error al eliminar tutor:', err)
      const errorText = err instanceof Error ? err.message : t("Error al eliminar tutor.")
      toast.error(t("Error de operación"), errorText)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {isSuperAdmin && institutions.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-blue-200 bg-blue-50/60 p-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-700" />
            <div>
              <p className="text-sm font-bold text-blue-900">{t("Institución activa")}</p>
              <p className="text-xs text-blue-700">{t("Gestionando tutores de:")}</p>
            </div>
          </div>
          <select
            value={targetInstId ?? ''}
            onChange={(e) => setSelectedInstitutionId(e.target.value)}
            className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-sm font-medium text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {institutions.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-800"
        >
          <ArrowLeft className="h-4 w-4" /> {t("Panel de Administración")}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">{t("Gestión de Tutores")}</h1>
        <p className="text-sm text-gray-500">
          {t("Consulta los tutores de la institución. La información de cada tutor es de solo lectura.")}
        </p>
      </div>

      <Card>
        <Card.Body>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:max-w-xs">
              <Input
                placeholder={t("Buscar por nombre o correo...")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                {t("Filtrar por estado:")}
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:border-primary-500 focus:outline-none"
              >
                <option value="all">{t("Todos los estados")}</option>
                <option value="active">{t("Activo")}</option>
                <option value="inactive">{t("Inactivo")}</option>
              </select>
            </div>
          </div>
        </Card.Body>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] divide-y divide-gray-200 text-left text-sm text-gray-600">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">{t("Usuario")}</th>
                <th className="px-4 py-3">{t("Correo")}</th>
                <th className="px-4 py-3 text-center">{t("Estado")}</th>
                <th className="px-4 py-3">{t("Registro")}</th>
                <th className="px-4 py-3 text-right">{t("Acciones")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    {t("Cargando tutores...")}
                  </td>
                </tr>
              ) : filteredTutors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    {t("No se encontraron tutores en esta institución.")}
                  </td>
                </tr>
              ) : (
                paginatedTutors.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 font-semibold text-primary-700 text-xs">
                          {u.first_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <span className="truncate text-sm font-medium text-gray-900">
                          {u.first_name} {u.last_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-600">
                      {u.email || <span className="text-gray-400">{t("Sin correo")}</span>}
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      {u.active ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                          <CheckCircle2 className="h-3 w-3" /> {t("Activo")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                          <XCircle className="h-3 w-3" /> {t("Inactivo")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(u.created_at).toLocaleDateString(locale, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleDeleteTutor(u)}
                        isLoading={deletingId === u.id}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                        title={t("Eliminar tutor")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t("Eliminar")}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={filteredTutors.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </Card>
    </div>
  )
}
