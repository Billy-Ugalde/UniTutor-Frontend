import { useEffect, useState, useMemo, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Building2,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Pencil,
  Power,
  X,
  UserCheck,
  Shield,
  Eye,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Globe,
} from 'lucide-react'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { useAdminStore } from '@/modules/admin/store/admin.store'
import { supabase } from '@/lib/supabase'
import { Card } from '@/shared/components/ui/Card'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Pagination } from '@/shared/components/ui/Pagination'
import { toast } from '@/shared/store/toast.store'
import type { Institution } from '@/types/database.types'

export function InstitutionsManagementPage() {
  const { isSuperAdmin } = useAuth()
  const { setSelectedInstitutionId } = useAdminStore()
  const navigate = useNavigate()

  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 10

  const [viewingInst, setViewingInst] = useState<Institution | null>(null)

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createFeedback, setCreateFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [newInstForm, setNewInstForm] = useState({
    name: '',
    slug: '',
    officialEmail: '',
    institutionPhone: '',
    institutionAddress: '',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPhone: '',
    adminPassword: '',
  })

  const [editingInst, setEditingInst] = useState<Institution | null>(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    slug: '',
    officialEmail: '',
    phone: '',
    address: '',
    active: true,
  })

  const loadInstitutions = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('institutions')
        .select('*')
        .order('name')

      if (error) throw error
      setInstitutions(data ?? [])
    } catch (err) {
      console.error('Error al cargar instituciones:', err)
      setActionFeedback({
        type: 'error',
        text: 'No fue posible cargar la lista de instituciones.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate('/admin')
      return
    }
    void loadInstitutions()
  }, [isSuperAdmin, navigate])

  const metrics = useMemo(() => {
    const total = institutions.length
    const active = institutions.filter((i) => i.active).length
    const inactive = total - active
    return { total, active, inactive }
  }, [institutions])

  const filteredInstitutions = useMemo(() => {
    return institutions.filter((inst) => {
      const term = searchTerm.toLowerCase().trim()
      const matchesSearch =
        !term ||
        inst.name.toLowerCase().includes(term) ||
        inst.slug.toLowerCase().includes(term) ||
        (inst.official_email && inst.official_email.toLowerCase().includes(term)) ||
        (inst.address && inst.address.toLowerCase().includes(term))

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'active'
          ? inst.active
          : !inst.active

      return matchesSearch && matchesStatus
    })
  }, [institutions, searchTerm, statusFilter])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter])

  const paginatedInstitutions = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredInstitutions.slice(start, start + PAGE_SIZE)
  }, [filteredInstitutions, currentPage])

  const handleCreateInstitution = async (e: FormEvent) => {
    e.preventDefault()
    setCreateFeedback(null)
    setIsCreating(true)

    try {
      const { error } = await supabase.rpc('create_institution_with_admin', {
        p_institution_name: newInstForm.name.trim(),
        p_institution_slug: newInstForm.slug.trim().toLowerCase().replace(/\s+/g, '-'),
        p_official_email: newInstForm.officialEmail.trim(),
        p_institution_phone: newInstForm.institutionPhone.trim(),
        p_institution_address: newInstForm.institutionAddress.trim(),
        p_admin_first_name: newInstForm.adminFirstName.trim(),
        p_admin_last_name: newInstForm.adminLastName.trim(),
        p_admin_email: newInstForm.adminEmail.trim(),
        p_admin_phone: newInstForm.adminPhone.trim(),
        p_admin_password: newInstForm.adminPassword,
      })

      if (error) throw error

      setActionFeedback({
        type: 'success',
        text: `Institución "${newInstForm.name}" creada exitosamente junto a su administrador.`,
      })
      toast.success('Institución registrada', `"${newInstForm.name}" ha sido creada exitosamente.`)

      setIsCreateModalOpen(false)
      setNewInstForm({
        name: '',
        slug: '',
        officialEmail: '',
        institutionPhone: '',
        institutionAddress: '',
        adminFirstName: '',
        adminLastName: '',
        adminEmail: '',
        adminPhone: '',
        adminPassword: '',
      })

      await loadInstitutions()
    } catch (err) {
      console.error('Error al crear institución:', err)
      const errorText = err instanceof Error ? err.message : 'Error al crear la institución.'
      setCreateFeedback({
        type: 'error',
        text: errorText,
      })
      toast.error('Error al registrar institución', errorText)
    } finally {
      setIsCreating(false)
    }
  }

  const handleOpenEdit = (inst: Institution) => {
    setEditingInst(inst)
    setEditForm({
      name: inst.name,
      slug: inst.slug,
      officialEmail: inst.official_email || '',
      phone: inst.phone || '',
      address: inst.address || '',
      active: inst.active,
    })
  }

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editingInst) return
    setIsSavingEdit(true)

    try {
      const { error } = await supabase
        .from('institutions')
        .update({
          name: editForm.name.trim(),
          slug: editForm.slug.trim().toLowerCase().replace(/\s+/g, '-'),
          official_email: editForm.officialEmail.trim() || null,
          phone: editForm.phone.trim() || null,
          address: editForm.address.trim() || null,
          active: editForm.active,
        })
        .eq('id', editingInst.id)

      if (error) throw error

      setActionFeedback({
        type: 'success',
        text: `Institución "${editForm.name}" actualizada con éxito.`,
      })
      toast.success('Institución actualizada', `Los datos de "${editForm.name}" se guardaron correctamente.`)
      setEditingInst(null)
      await loadInstitutions()
    } catch (err) {
      console.error('Error al actualizar institución:', err)
      const errorText = err instanceof Error ? err.message : 'Error al actualizar la institución.'
      setActionFeedback({
        type: 'error',
        text: errorText,
      })
      toast.error('Error al actualizar institución', errorText)
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleToggleActive = async (inst: Institution) => {
    const nextState = !inst.active
    const confirmText = nextState
      ? `¿Deseas activar la institución "${inst.name}"?`
      : `¿Estás seguro de desactivar la institución "${inst.name}"? Sus usuarios no podrán ingresar hasta ser reactivada.`

    if (!window.confirm(confirmText)) return

    try {
      const { error } = await supabase
        .from('institutions')
        .update({ active: nextState })
        .eq('id', inst.id)

      if (error) throw error

      const statusMsg = `Institución "${inst.name}" ahora está ${nextState ? 'activa' : 'desactivada'}.`
      setActionFeedback({
        type: 'success',
        text: statusMsg,
      })
      toast.success(nextState ? 'Institución activada' : 'Institución desactivada', statusMsg)
      await loadInstitutions()
    } catch (err) {
      console.error('Error al cambiar estado de institución:', err)
      setActionFeedback({
        type: 'error',
        text: 'No fue posible cambiar el estado de la institución.',
      })
      toast.error('Error de operación', 'No fue posible cambiar el estado de la institución.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-800"
            >
              <ArrowLeft className="h-4 w-4" /> Panel de Administración
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            Gestión de Instituciones
          </h1>
          <p className="text-sm text-gray-500">
            Supervisa, administra y registra las universidades adscritas a la plataforma
          </p>
        </div>

        {isSuperAdmin && (
          <Button
            variant="success"
            onClick={() => {
              setIsCreateModalOpen(true)
              setCreateFeedback(null)
            }}
            className="whitespace-nowrap cursor-pointer shadow-xs"
          >
            <Building2 className="h-4 w-4" />
            Crear Nueva Institución
          </Button>
        )}
      </div>

      {actionFeedback && (
        <div
          className={`rounded-lg p-4 text-sm ${
            actionFeedback.type === 'success'
              ? 'border border-green-200 bg-green-50 text-green-700'
              : 'border border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {actionFeedback.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <Card.Body>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Total Instituciones
                </p>
                <p className="mt-1 text-3xl font-extrabold text-blue-600">
                  {isLoading ? '...' : metrics.total}
                </p>
              </div>
              <div className="rounded-full bg-blue-50 p-3 text-blue-600">
                <Building2 className="h-6 w-6" />
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">Registradas en la plataforma</p>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Instituciones Activas
                </p>
                <p className="mt-1 text-3xl font-extrabold text-green-600">
                  {isLoading ? '...' : metrics.active}
                </p>
              </div>
              <div className="rounded-full bg-green-50 p-3 text-green-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">Operando con normalidad</p>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Instituciones Inactivas
                </p>
                <p className="mt-1 text-3xl font-extrabold text-amber-600">
                  {isLoading ? '...' : metrics.inactive}
                </p>
              </div>
              <div className="rounded-full bg-amber-50 p-3 text-amber-600">
                <XCircle className="h-6 w-6" />
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">Pausadas o en mantenimiento</p>
          </Card.Body>
        </Card>
      </div>

      <Card>
        <Card.Body>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:max-w-md relative">
              <Input
                placeholder="Buscar por nombre, slug, correo o sede..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Estado:
              </span>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')
                }
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:border-primary-500 focus:outline-none"
              >
                <option value="all">Todas las instituciones</option>
                <option value="active">Solo activas</option>
                <option value="inactive">Solo inactivas</option>
              </select>
            </div>
          </div>
        </Card.Body>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] table-fixed divide-y divide-gray-200 text-left text-sm text-gray-600">
            <colgroup>
              <col className="w-[19%]" />
              <col className="w-[16%]" />
              <col className="w-[15%]" />
              <col className="w-[9%]" />
              <col className="w-[10%]" />
              <col className="w-[31%]" />
            </colgroup>
            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Institución</th>
                <th className="px-4 py-3">Contacto Oficial</th>
                <th className="px-4 py-3">Sede / Dirección</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3">Registro</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    Cargando instituciones...
                  </td>
                </tr>
              ) : filteredInstitutions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    No se encontraron instituciones con el criterio seleccionado.
                  </td>
                </tr>
              ) : (
                paginatedInstitutions.map((inst) => (
                  <tr key={inst.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-gray-900">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 font-bold text-xs">
                          {inst.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-gray-900 text-sm" title={inst.name}>
                            {inst.name}
                          </p>
                          <span className="font-mono text-xs text-gray-400 truncate block" title={`/${inst.slug}`}>
                            /{inst.slug}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-xs text-gray-600">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900" title={inst.official_email || 'Sin correo'}>
                          {inst.official_email || <span className="text-gray-400">Sin correo</span>}
                        </p>
                        {inst.phone && (
                          <p className="truncate text-gray-400 mt-0.5" title={inst.phone}>
                            {inst.phone}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-xs text-gray-600">
                      <p className="truncate" title={inst.address || 'No indicada'}>
                        {inst.address || <span className="text-gray-400">No indicada</span>}
                      </p>
                    </td>

                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      {inst.active ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                          <CheckCircle2 className="h-3 w-3" /> Activa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
                          <XCircle className="h-3 w-3" /> Inactiva
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(inst.created_at).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>

                    <td className="px-4 py-3.5 text-right whitespace-nowrap overflow-hidden">
                      <div className="flex items-center justify-end gap-1.5">
                        {isSuperAdmin && (
                          <>
                            <Button
                              variant="secondary"
                              size="xs"
                              onClick={() => setViewingInst(inst)}
                              title="Ver detalles completos de la institución"
                            >
                              <Eye className="h-3.5 w-3.5 text-blue-600" />
                              Ver
                            </Button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedInstitutionId(inst.id)
                                navigate('/admin')
                              }}
                              title="Seleccionar y administrar esta institución"
                              className="inline-flex items-center justify-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 hover:border-blue-300 hover:text-blue-900 transition-colors shrink-0 whitespace-nowrap"
                            >
                              <Shield className="h-3.5 w-3.5 text-blue-600" />
                              Admin
                            </button>
                            <Button
                              variant="secondary"
                              size="xs"
                              onClick={() => handleOpenEdit(inst)}
                              title="Editar datos de la institución"
                            >
                              <Pencil className="h-3.5 w-3.5 text-gray-600" />
                              Editar
                            </Button>
                            <Button
                              variant={inst.active ? 'ghost' : 'secondary'}
                              size="xs"
                              onClick={() => handleToggleActive(inst)}
                              className={
                                inst.active
                                  ? 'text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200'
                                  : 'text-green-600 hover:bg-green-50 hover:text-green-700 border-green-200'
                              }
                              title={inst.active ? 'Desactivar institución' : 'Activar institución'}
                            >
                              <Power className="h-3.5 w-3.5" />
                              {inst.active ? 'Desactivar' : 'Activar'}
                            </Button>
                          </>
                        )}
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
          totalItems={filteredInstitutions.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </Card>

      {viewingInst && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 font-bold text-blue-700 text-lg">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {viewingInst.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-xs text-gray-400">/{viewingInst.slug}</span>
                    {viewingInst.active ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                        <CheckCircle2 className="h-3 w-3" /> Activa
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                        <XCircle className="h-3 w-3" /> Inactiva
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingInst(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-lg border border-gray-100 bg-gray-50/70 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Mail className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="text-xs text-gray-400 font-medium">Correo Oficial:</span>
                  <span className="text-gray-900 font-medium">{viewingInst.official_email || 'No registrado'}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Phone className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="text-xs text-gray-400 font-medium">Teléfono:</span>
                  <span className="text-gray-800">{viewingInst.phone || 'No registrado'}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <MapPin className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="text-xs text-gray-400 font-medium">Sede Principal / Campus:</span>
                  <span className="text-gray-800">{viewingInst.address || 'No indicada'}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Globe className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="text-xs text-gray-400 font-medium">Identificador Slug:</span>
                  <span className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    /{viewingInst.slug}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Calendar className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="text-xs text-gray-400 font-medium">Fecha de Registro:</span>
                  <span className="text-gray-800">
                    {new Date(viewingInst.created_at).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                <div className="pt-1">
                  <span className="text-xs text-gray-400 font-medium">ID Institucional:</span>
                  <p className="font-mono text-xs text-gray-500 select-all mt-0.5">{viewingInst.id}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-3 border-t">
              <Button
                variant="ghost"
                onClick={() => setViewingInst(null)}
              >
                Cerrar
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  const instToEdit = viewingInst
                  setViewingInst(null)
                  handleOpenEdit(instToEdit)
                }}
              >
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Editar
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setSelectedInstitutionId(viewingInst.id)
                  navigate('/admin')
                }}
              >
                <Shield className="h-3.5 w-3.5 mr-1" />
                Administrar
              </Button>
            </div>
          </div>
        </div>
      )}

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Crear Nueva Institución
                </h3>
                <p className="text-xs text-gray-500">
                  Registra la universidad y su administrador institucional inicial
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {createFeedback && (
              <div
                className={`mt-4 rounded-lg p-3 text-sm ${
                  createFeedback.type === 'success'
                    ? 'border border-green-200 bg-green-50 text-green-700'
                    : 'border border-red-200 bg-red-50 text-red-700'
                }`}
              >
                {createFeedback.text}
              </div>
            )}

            <form onSubmit={handleCreateInstitution} className="mt-4 space-y-4">
              <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-blue-700" /> 1. Datos de la Universidad / Institución
                </h4>
                <div className="space-y-3">
                  <Input
                    label="Nombre de la Institución"
                    placeholder="Ej: Universidad de Costa Rica"
                    value={newInstForm.name}
                    onChange={(e) => {
                      const name = e.target.value
                      setNewInstForm((prev) => ({
                        ...prev,
                        name,
                        slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'),
                      }))
                    }}
                    required
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Slug (identificador web)"
                      placeholder="ej: ucr"
                      value={newInstForm.slug}
                      onChange={(e) =>
                        setNewInstForm((prev) => ({ ...prev, slug: e.target.value }))
                      }
                      required
                    />
                    <Input
                      label="Correo oficial institucional"
                      type="email"
                      placeholder="contacto@institucion.edu"
                      value={newInstForm.officialEmail}
                      onChange={(e) =>
                        setNewInstForm((prev) => ({ ...prev, officialEmail: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Teléfono institucional"
                      type="tel"
                      placeholder="+506 2511-0000"
                      value={newInstForm.institutionPhone}
                      onChange={(e) =>
                        setNewInstForm((prev) => ({
                          ...prev,
                          institutionPhone: e.target.value,
                        }))
                      }
                    />
                    <Input
                      label="Dirección o Campus principal"
                      placeholder="San Pedro, San José"
                      value={newInstForm.institutionAddress}
                      onChange={(e) =>
                        setNewInstForm((prev) => ({
                          ...prev,
                          institutionAddress: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4 text-blue-700" /> 2. Administrador de la Institución (inst_admin)
                </h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Nombre"
                      placeholder="Carlos"
                      value={newInstForm.adminFirstName}
                      onChange={(e) =>
                        setNewInstForm((prev) => ({
                          ...prev,
                          adminFirstName: e.target.value,
                        }))
                      }
                      required
                    />
                    <Input
                      label="Apellido"
                      placeholder="Rodríguez"
                      value={newInstForm.adminLastName}
                      onChange={(e) =>
                        setNewInstForm((prev) => ({
                          ...prev,
                          adminLastName: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Correo electrónico del Administrador"
                      type="email"
                      placeholder="admin@institucion.edu"
                      value={newInstForm.adminEmail}
                      onChange={(e) =>
                        setNewInstForm((prev) => ({
                          ...prev,
                          adminEmail: e.target.value,
                        }))
                      }
                      required
                    />
                    <Input
                      label="Teléfono del Administrador"
                      type="tel"
                      placeholder="+506 8888-9999"
                      value={newInstForm.adminPhone}
                      onChange={(e) =>
                        setNewInstForm((prev) => ({
                          ...prev,
                          adminPhone: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <Input
                    label="Contraseña inicial"
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    value={newInstForm.adminPassword}
                    onChange={(e) =>
                      setNewInstForm((prev) => ({
                        ...prev,
                        adminPassword: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3 border-t">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isCreating}
                >
                  Cerrar
                </Button>
                <Button variant="success" type="submit" isLoading={isCreating}>
                  Crear Institución y Administrador
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingInst && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Editar Institución
                </h3>
                <p className="text-xs text-gray-500">
                  Modifica los datos principales y de contacto de la universidad
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingInst(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <Input
                label="Nombre de la Institución"
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Slug"
                  value={editForm.slug}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, slug: e.target.value }))}
                  required
                />
                <Input
                  label="Correo oficial"
                  type="email"
                  value={editForm.officialEmail}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, officialEmail: e.target.value }))
                  }
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Teléfono"
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                />
                <Input
                  label="Dirección / Sede"
                  value={editForm.address}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, address: e.target.value }))
                  }
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.active}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, active: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span>Institución Activa (permite inicio de sesión y tutorías)</span>
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3 border-t">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setEditingInst(null)}
                  disabled={isSavingEdit}
                >
                  Cancelar
                </Button>
                <Button variant="primary" type="submit" isLoading={isSavingEdit}>
                  Guardar Cambios
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
