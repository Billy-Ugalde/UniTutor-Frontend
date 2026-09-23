import { useEffect, useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Shield,
  ArrowLeft,
  Settings,
  Eye,
  X,
  Mail,
  Phone,
  Calendar,
  Building2,
  UserCheck,
  Power,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { useAdminStore } from '@/modules/admin/store/admin.store'
import { supabase } from '@/lib/supabase'
import { Card } from '@/shared/components/ui/Card'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Pagination } from '@/shared/components/ui/Pagination'
import { toast } from '@/shared/store/toast.store'
import type { Profile, UserRole, UserRoleRecord, Institution } from '@/types/database.types'

interface UserWithRoles extends Profile {
  roles: UserRole[]
}

const ALL_ROLES: { role: UserRole; label: string; description: string }[] = [
  { role: 'estudiante', label: 'Estudiante', description: 'Puede buscar tutores y solicitar tutorías' },
  { role: 'tutor', label: 'Tutor', description: 'Puede ofrecer tutorías en las materias activas' },
  { role: 'inst_admin', label: 'Administrador', description: 'Gestión total de la institución y catálogo' },
]

export function UsersManagementPage() {
  const { profile: currentProfile, isSuperAdmin } = useAuth()
  const { selectedInstitutionId, setSelectedInstitutionId } = useAdminStore()
  const [searchParams, setSearchParams] = useSearchParams()

  const [institutions, setInstitutions] = useState<Institution[]>([])

  const [users, setUsers] = useState<UserWithRoles[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')

  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 10
  
  const [viewingUser, setViewingUser] = useState<UserWithRoles | null>(null)

  const [editingUser, setEditingUser] = useState<UserWithRoles | null>(null)
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([])
  const [isSavingRoles, setIsSavingRoles] = useState(false)
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const targetInstId = isSuperAdmin
    ? (selectedInstitutionId || currentProfile?.institution_id)
    : currentProfile?.institution_id

  useEffect(() => {
    if (!isSuperAdmin) return
    const instParam = searchParams.get('inst')
    if (instParam && instParam !== selectedInstitutionId) {
      setSelectedInstitutionId(instParam)
    }
  }, [searchParams, isSuperAdmin, selectedInstitutionId])

  useEffect(() => {
    if (!isSuperAdmin) {
      if (currentProfile?.institution_id) {
        setSelectedInstitutionId(currentProfile.institution_id)
      }
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

      const exists = list.some((i) => i.id === selectedInstitutionId)
      if (!exists && list.length > 0) {
        const fallbackId =
          currentProfile?.institution_id && list.some((i) => i.id === currentProfile.institution_id)
            ? currentProfile.institution_id
            : list[0].id
        setSelectedInstitutionId(fallbackId)
      }
    }

    void fetchInstitutions()
  }, [isSuperAdmin, currentProfile?.institution_id])

  const loadUsersAndRoles = async () => {
    if (!targetInstId) return
    setIsLoading(true)
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('institution_id', targetInstId)
        .order('created_at', { ascending: false })

      if (profilesError) throw profilesError

      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('institution_id', targetInstId)
        .eq('active', true)

      if (rolesError) throw rolesError

      const rolesByUser = new Map<string, UserRole[]>()
      rolesData?.forEach((r: UserRoleRecord) => {
        const current = rolesByUser.get(r.user_id) ?? []
        rolesByUser.set(r.user_id, [...current, r.role])
      })

      const combined: UserWithRoles[] = (profilesData ?? []).map((p: Profile) => ({
        ...p,
        roles: rolesByUser.get(p.id) ?? [],
      }))

      setUsers(combined)
    } catch (err) {
      console.error('Error al cargar usuarios:', err)
      setActionMessage({ type: 'error', text: 'No fue posible cargar la lista de usuarios.' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadUsersAndRoles()
  }, [targetInstId])

  const handleSelectInstitution = (instId: string) => {
    setSelectedInstitutionId(instId)
    setSearchParams(instId ? { inst: instId } : {})
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, roleFilter])

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const full = `${u.first_name} ${u.last_name} ${u.email ?? ''}`.toLowerCase()
      const matchesSearch = full.includes(searchTerm.toLowerCase())
      const matchesRole =
        roleFilter === 'all' ? true : u.roles.includes(roleFilter as UserRole)
      return matchesSearch && matchesRole
    })
  }, [users, searchTerm, roleFilter])

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredUsers.slice(start, start + PAGE_SIZE)
  }, [filteredUsers, currentPage])

  const assignableRoles = useMemo(() => {
    if (!editingUser) return []
    const isAlreadyAdmin = editingUser.roles.includes('inst_admin')
    if (!isAlreadyAdmin) {
      return ALL_ROLES.filter((r) => r.role !== 'inst_admin')
    }
    return ALL_ROLES
  }, [editingUser])

  const handleOpenEdit = (user: UserWithRoles) => {
    setEditingUser(user)
    setSelectedRoles([...user.roles])
    setActionMessage(null)
  }

  const handleToggleRole = (role: UserRole) => {
    if (role === 'inst_admin' && !editingUser?.roles.includes('inst_admin')) {
      return
    }
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter((r) => r !== role))
    } else {
      setSelectedRoles([...selectedRoles, role])
    }
  }

  const handleSaveRoles = async () => {
    if (!editingUser || !targetInstId) return
    setIsSavingRoles(true)
    setActionMessage(null)

    try {
      const currentRoles = editingUser.roles
      const rolesToAdd = selectedRoles.filter((r) => !currentRoles.includes(r))
      const rolesToRemove = currentRoles.filter((r) => !selectedRoles.includes(r))

      if (rolesToAdd.length > 0) {
        const inserts = rolesToAdd.map((role) => ({
          user_id: editingUser.id,
          institution_id: targetInstId,
          role,
          active: true,
        }))
        const { error: insertError } = await supabase.from('user_roles').insert(inserts)
        if (insertError) throw insertError
      }

      if (rolesToRemove.length > 0) {
        for (const role of rolesToRemove) {
          const { error: deleteError } = await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', editingUser.id)
            .eq('institution_id', targetInstId)
            .eq('role', role)
          if (deleteError) throw deleteError
        }
      }

      setActionMessage({ type: 'success', text: `Roles actualizados para ${editingUser.first_name}.` })
      toast.success('Roles actualizados', `Se han actualizado los roles de ${editingUser.first_name} ${editingUser.last_name}.`)
      setEditingUser(null)
      await loadUsersAndRoles()
    } catch (err) {
      console.error('Error al guardar roles:', err)
      const errorText = err instanceof Error ? err.message : 'Error al actualizar roles.'
      setActionMessage({
        type: 'error',
        text: errorText,
      })
      toast.error('Error al actualizar roles', errorText)
    } finally {
      setIsSavingRoles(false)
    }
  }

  const handleToggleUserActive = async (user: UserWithRoles) => {
    if (user.id === currentProfile?.id) {
      toast.warning('Acción denegada', 'No puedes desactivar tu propia cuenta de usuario.')
      return
    }

    const nextState = !user.active
    const confirmText = nextState
      ? `¿Deseas activar la cuenta de ${user.first_name} ${user.last_name}? Podrá iniciar sesión en la plataforma.`
      : `¿Estás seguro de desactivar la cuenta de ${user.first_name} ${user.last_name}? No podrá iniciar sesión hasta ser reactivado.`

    if (!window.confirm(confirmText)) return

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ active: nextState })
        .eq('id', user.id)

      if (error) throw error

      const statusMsg = `Usuario "${user.first_name} ${user.last_name}" ahora está ${nextState ? 'activo' : 'desactivado'}.`
      setActionMessage({
        type: 'success',
        text: statusMsg,
      })
      toast.success(nextState ? 'Usuario activado' : 'Usuario desactivado', statusMsg)

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, active: nextState } : u))
      )
    } catch (err) {
      console.error('Error al cambiar estado del usuario:', err)
      const errorText = err instanceof Error ? err.message : 'Error al cambiar estado del usuario.'
      setActionMessage({
        type: 'error',
        text: errorText,
      })
      toast.error('Error de operación', errorText)
    }
  }

  const roleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'inst_admin':
        return 'bg-blue-100 text-blue-800 border border-blue-200'
      case 'tutor':
        return 'bg-green-100 text-green-800 border border-green-200'
      case 'estudiante':
        return 'bg-amber-100 text-amber-800 border border-amber-200'
      default:
        return 'bg-gray-100 text-gray-700 border border-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      {isSuperAdmin && institutions.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-blue-200 bg-blue-50/60 p-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-700" />
            <div>
              <p className="text-sm font-bold text-blue-900">Institución activa</p>
              <p className="text-xs text-blue-700">Gestionando usuarios de:</p>
            </div>
          </div>
          <select
            value={targetInstId ?? ''}
            onChange={(e) => handleSelectInstitution(e.target.value)}
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

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-800">
              <ArrowLeft className="h-4 w-4" /> Panel de Administración
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Gestión de Usuarios</h1>
          <p className="text-sm text-gray-500">
            Supervisa perfiles y administra los roles de la institución
          </p>
        </div>
      </div>

      {actionMessage && (
        <div
          className={`rounded-md p-4 text-sm ${
            actionMessage.type === 'success'
              ? 'border border-green-200 bg-green-50 text-green-700'
              : 'border border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {actionMessage.text}
        </div>
      )}

      <Card>
        <Card.Body>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:max-w-xs relative">
              <Input
                placeholder="Buscar por nombre o correo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Filtrar por rol:
              </span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:border-primary-500 focus:outline-none"
              >
                <option value="all">Todos los roles</option>
                <option value="estudiante">Estudiantes</option>
                <option value="tutor">Tutores</option>
                <option value="inst_admin">Administradores</option>
              </select>
            </div>
          </div>
        </Card.Body>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] table-fixed divide-y divide-gray-200 text-left text-sm text-gray-600">
            <colgroup>
              <col className="w-[21%]" />
              <col className="w-[21%]" />
              <col className="w-[15%]" />
              <col className="w-[9%]" />
              <col className="w-[10%]" />
              <col className="w-[24%]" />
            </colgroup>
            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Correo</th>
                <th className="px-4 py-3">Roles</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3">Registro</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    Cargando usuarios...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    No se encontraron usuarios en esta institución.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-gray-900">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 font-semibold text-primary-700 text-xs">
                          {u.first_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <span className="truncate text-sm text-gray-900" title={`${u.first_name} ${u.last_name}`}>
                          {u.first_name} {u.last_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-600">
                      <p className="truncate" title={u.email || 'Sin correo'}>
                        {u.email || <span className="text-gray-400">Sin correo</span>}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1 min-w-0">
                        {u.roles.map((r) => (
                          <span
                            key={r}
                            className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize whitespace-nowrap ${roleBadgeColor(
                              r
                            )}`}
                          >
                            {r === 'inst_admin' ? 'Admin' : r}
                          </span>
                        ))}
                        {u.roles.length === 0 && (
                          <span className="text-xs text-gray-400 whitespace-nowrap">Sin roles</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      {u.active ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                          <CheckCircle2 className="h-3 w-3" /> Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                          <XCircle className="h-3 w-3" /> Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(u.created_at).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap overflow-hidden">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => setViewingUser(u)}
                          title="Ver detalles completos del usuario"
                        >
                          <Eye className="h-3.5 w-3.5 text-blue-600" />
                          Ver
                        </Button>
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => handleOpenEdit(u)}
                          title="Modificar roles del usuario"
                        >
                          <Settings className="h-3.5 w-3.5 text-gray-600" />
                          Roles
                        </Button>
                        <Button
                          variant={u.active ? 'ghost' : 'secondary'}
                          size="xs"
                          onClick={() => handleToggleUserActive(u)}
                          className={
                            u.active
                              ? 'text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200'
                              : 'text-green-600 hover:bg-green-50 hover:text-green-700 border-green-200'
                          }
                          title={u.active ? 'Desactivar acceso del usuario' : 'Activar acceso del usuario'}
                        >
                          <Power className="h-3.5 w-3.5" />
                          {u.active ? 'Desactivar' : 'Activar'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={filteredUsers.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </Card>

      {viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 text-lg">
                  {viewingUser.first_name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {viewingUser.first_name} {viewingUser.last_name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-gray-500">{viewingUser.email || 'Sin correo electrónico'}</p>
                    {viewingUser.active ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                        <CheckCircle2 className="h-3 w-3" /> Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                        <XCircle className="h-3 w-3" /> Desactivado
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingUser(null)}
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
                    {institutions.find((i) => i.id === viewingUser.institution_id)?.name ||
                      'Institución no especificada'}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Mail className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="text-xs text-gray-400 font-medium">Correo:</span>
                  <span className="text-gray-800">{viewingUser.email || 'No registrado'}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Phone className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="text-xs text-gray-400 font-medium">Teléfono:</span>
                  <span className="text-gray-800">{viewingUser.phone || 'No registrado'}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Calendar className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="text-xs text-gray-400 font-medium">Fecha de Registro:</span>
                  <span className="text-gray-800">
                    {new Date(viewingUser.created_at).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                <div className="pt-1">
                  <span className="text-xs text-gray-400 font-medium">ID de Usuario:</span>
                  <p className="font-mono text-xs text-gray-500 select-all mt-0.5">{viewingUser.id}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  Roles Asignados en la Institución
                </p>
                <div className="flex flex-wrap gap-2">
                  {viewingUser.roles.map((r) => (
                    <span
                      key={r}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold capitalize ${roleBadgeColor(
                        r
                      )}`}
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      {r === 'inst_admin' ? 'Administrador' : r}
                    </span>
                  ))}
                  {viewingUser.roles.length === 0 && (
                    <span className="text-xs text-gray-400 italic">No tiene roles activos asignados</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-3 border-t">
              <Button
                variant="ghost"
                onClick={() => setViewingUser(null)}
              >
                Cerrar
              </Button>
              <Button
                variant={viewingUser.active ? 'secondary' : 'primary'}
                onClick={async () => {
                  const targetUser = viewingUser
                  await handleToggleUserActive(targetUser)
                  setViewingUser((prev) =>
                    prev ? { ...prev, active: !prev.active } : null
                  )
                }}
                className={
                  viewingUser.active
                    ? 'text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200'
                    : 'text-green-600 hover:bg-green-50 hover:text-green-700 border-green-200'
                }
              >
                <Power className="h-3.5 w-3.5 mr-1" />
                {viewingUser.active ? 'Desactivar Cuenta' : 'Activar Cuenta'}
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  const userToEdit = viewingUser
                  setViewingUser(null)
                  handleOpenEdit(userToEdit)
                }}
              >
                <Settings className="h-3.5 w-3.5 mr-1" />
                Modificar Roles
              </Button>
            </div>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">
              Modificar Roles
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {editingUser.first_name} {editingUser.last_name} ({editingUser.email})
            </p>

            <div className="mt-4 space-y-3">
              {assignableRoles.map(({ role, label, description }) => {
                const isChecked = selectedRoles.includes(role)
                return (
                  <label
                    key={role}
                    className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                      isChecked
                        ? 'border-primary-500 bg-primary-50/50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleRole(role)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                      <span className="text-sm font-semibold text-gray-900">{label}</span>
                      <p className="text-xs text-gray-500">{description}</p>
                    </div>
                  </label>
                )
              })}
            </div>

            {!editingUser.roles.includes('inst_admin') && (
              <p className="mt-3 text-[11px] text-gray-500 bg-gray-50 rounded-lg p-2.5 border border-gray-200">
                Los roles de administración institucional no pueden asignarse a tutores o estudiantes. Se configuran al dar de alta la institución.
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setEditingUser(null)}
                disabled={isSavingRoles}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveRoles}
                isLoading={isSavingRoles}
              >
                Guardar Cambios
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
