import { useEffect, useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Shield, ArrowLeft, CheckCircle2, BookOpen, X } from 'lucide-react'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { useAdminStore } from '@/modules/admin/store/admin.store'
import { supabase } from '@/lib/supabase'
import { Card } from '@/shared/components/ui/Card'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { toast } from '@/shared/store/toast.store'
import type { Career, Course, Subject, Institution } from '@/types/database.types'

interface CourseOption {
  id: string
  name: string
  code: string
  careerName?: string
}

interface SubjectWithStatus extends Subject {
  isOffered: boolean
}

interface CourseWithSubjects extends Course {
  subjects: SubjectWithStatus[]
}

interface CareerWithCourses extends Career {
  courses: CourseWithSubjects[]
}

export function SubjectsManagementPage() {
  const { profile: currentProfile, isSuperAdmin } = useAuth()
  const { selectedInstitutionId, setSelectedInstitutionId } = useAdminStore()
  const [searchParams, setSearchParams] = useSearchParams()

  const [institutions, setInstitutions] = useState<Institution[]>([])

  const [catalog, setCatalog] = useState<CareerWithCourses[]>([])
  const [coursesList, setCoursesList] = useState<CourseOption[]>([])
  const [offeredSubjectIds, setOfferedSubjectIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isCreatingSubject, setIsCreatingSubject] = useState(false)
  const [newSubject, setNewSubject] = useState({
    courseId: '',
    name: '',
    code: '',
    description: '',
    offerImmediately: true,
  })

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

  const loadCatalogAndOffered = async () => {
    if (!targetInstId) return
    setIsLoading(true)
    try {
      const [careersRes, coursesRes, subjectsRes, offeredRes] = await Promise.all([
        supabase.from('careers').select('*').eq('active', true).order('name'),
        supabase.from('courses').select('*').eq('active', true).order('name'),
        supabase.from('subjects').select('*').eq('active', true).order('name'),
        supabase
          .from('institution_subjects')
          .select('subject_id')
          .eq('institution_id', targetInstId),
      ])

      if (careersRes.error) throw careersRes.error
      if (coursesRes.error) throw coursesRes.error
      if (subjectsRes.error) throw subjectsRes.error
      if (offeredRes.error) throw offeredRes.error

      const offeredSet = new Set((offeredRes.data ?? []).map((o: { subject_id: string }) => o.subject_id))
      setOfferedSubjectIds(offeredSet)

      const subjectsByCourse = new Map<string, SubjectWithStatus[]>()
      subjectsRes.data?.forEach((s: Subject) => {
        const list = subjectsByCourse.get(s.course_id) ?? []
        subjectsByCourse.set(s.course_id, [
          ...list,
          { ...s, isOffered: offeredSet.has(s.id) },
        ])
      })

      const coursesByCareer = new Map<string, CourseWithSubjects[]>()
      coursesRes.data?.forEach((c: Course) => {
        const list = coursesByCareer.get(c.career_id) ?? []
        coursesByCareer.set(c.career_id, [
          ...list,
          { ...c, subjects: subjectsByCourse.get(c.id) ?? [] },
        ])
      })

      const structuredCatalog: CareerWithCourses[] = (careersRes.data ?? []).map((car: Career) => ({
        ...car,
        courses: coursesByCareer.get(car.id) ?? [],
      }))

      setCatalog(structuredCatalog)

      const careerMap = new Map<string, string>((careersRes.data ?? []).map((c: Career) => [c.id, c.name]))
      const coursesOptions: CourseOption[] = (coursesRes.data ?? []).map((c: Course) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        careerName: careerMap.get(c.career_id) || '',
      }))
      setCoursesList(coursesOptions)
    } catch (err) {
      console.error('Error al cargar catálogo de materias:', err)
      setNotification({ type: 'error', text: 'No fue posible cargar el catálogo de materias.' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadCatalogAndOffered()
  }, [targetInstId])

  const handleSelectInstitution = (instId: string) => {
    setSelectedInstitutionId(instId)
    setSearchParams(instId ? { inst: instId } : {})
  }

  const handleToggleSubject = async (subjectId: string, currentlyOffered: boolean) => {
    if (!targetInstId) return
    setTogglingId(subjectId)
    setNotification(null)

    try {
      if (currentlyOffered) {
        const { error } = await supabase
          .from('institution_subjects')
          .delete()
          .eq('institution_id', targetInstId)
          .eq('subject_id', subjectId)

        if (error) throw error

        const newSet = new Set(offeredSubjectIds)
        newSet.delete(subjectId)
        setOfferedSubjectIds(newSet)
        toast.info('Materia deshabilitada', 'La materia ya no se ofrece para tutorías en esta institución.')
      } else {
        const { error } = await supabase.from('institution_subjects').insert({
          institution_id: targetInstId,
          subject_id: subjectId,
          active: true,
        })

        if (error) throw error

        const newSet = new Set(offeredSubjectIds)
        newSet.add(subjectId)
        setOfferedSubjectIds(newSet)
        toast.success('Materia habilitada', 'La materia ahora está disponible para tutorías en esta institución.')
      }
    } catch (err) {
      console.error('Error al actualizar materia:', err)
      const errorText = err instanceof Error ? err.message : 'Error al cambiar estado de la materia.'
      setNotification({
        type: 'error',
        text: errorText,
      })
      toast.error('Error de operación', errorText)
    } finally {
      setTogglingId(null)
    }
  }

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubject.courseId || !newSubject.name.trim() || !newSubject.code.trim()) {
      const warnText = 'Por favor completa todos los campos requeridos.'
      setNotification({ type: 'error', text: warnText })
      toast.warning('Campos incompletos', warnText)
      return
    }

    setIsCreatingSubject(true)
    setNotification(null)

    try {
      const { data: createdSubject, error: subjectError } = await supabase
        .from('subjects')
        .insert({
          course_id: newSubject.courseId,
          code: newSubject.code.trim().toUpperCase(),
          name: newSubject.name.trim(),
          description: newSubject.description.trim() || null,
          active: true,
        })
        .select('id, name')
        .single()

      if (subjectError) throw subjectError

      if (newSubject.offerImmediately && targetInstId && createdSubject) {
        const { error: offerError } = await supabase
          .from('institution_subjects')
          .insert({
            institution_id: targetInstId,
            subject_id: createdSubject.id,
            active: true,
          })

        if (offerError) {
          console.warn('Materia creada, pero hubo un error al ofertarla en la institución:', offerError)
        }
      }

      const successMsg = `Materia "${createdSubject.name}" creada exitosamente${newSubject.offerImmediately ? ' y ofertada en la institución' : ''}.`
      setNotification({
        type: 'success',
        text: successMsg,
      })
      toast.success('Materia registrada', successMsg)

      setNewSubject({
        courseId: '',
        name: '',
        code: '',
        description: '',
        offerImmediately: true,
      })
      setIsCreateModalOpen(false)

      await loadCatalogAndOffered()
    } catch (err) {
      console.error('Error al crear materia:', err)
      const errorText = err instanceof Error ? err.message : 'Error inesperado al crear la materia.'
      setNotification({
        type: 'error',
        text: errorText,
      })
      toast.error('Error al crear materia', errorText)
    } finally {
      setIsCreatingSubject(false)
    }
  }

  const filteredCatalog = useMemo(() => {
    if (!searchTerm.trim()) return catalog

    const term = searchTerm.toLowerCase()
    return catalog
      .map((career) => {
        const filteredCourses = career.courses
          .map((course) => {
            const filteredSubjects = course.subjects.filter(
              (s) =>
                s.name.toLowerCase().includes(term) ||
                s.code.toLowerCase().includes(term)
            )
            return { ...course, subjects: filteredSubjects }
          })
          .filter((course) => course.subjects.length > 0)

        return { ...career, courses: filteredCourses }
      })
      .filter((career) => career.courses.length > 0)
  }, [catalog, searchTerm])

  return (
    <div className="space-y-6">
      {isSuperAdmin && institutions.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-blue-200 bg-blue-50/60 p-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-700" />
            <div>
              <p className="text-sm font-bold text-blue-900">Institución activa</p>
              <p className="text-xs text-blue-700">Configurando materias ofertadas por:</p>
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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-800">
              <ArrowLeft className="h-4 w-4" /> Panel de Administración
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            Catálogo de Materias de la Institución
          </h1>
          <p className="text-sm text-gray-500">
            Selecciona qué materias del catálogo global imparte esta universidad para tutorías
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="success"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2"
          >
            <BookOpen className="h-4 w-4" />
            Crear Nueva Materia
          </Button>
          <div className="rounded-lg bg-primary-50 px-4 py-2 border border-primary-200">
            <span className="text-xs font-semibold uppercase text-primary-700">Materias Activas:</span>
            <span className="ml-2 text-lg font-bold text-primary-900">
              {offeredSubjectIds.size}
            </span>
          </div>
        </div>
      </div>

      {notification && (
        <div
          className={`rounded-md p-4 text-sm ${
            notification.type === 'success'
              ? 'border border-green-200 bg-green-50 text-green-700'
              : 'border border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {notification.text}
        </div>
      )}

      <Card>
        <Card.Body>
          <div className="max-w-md">
            <Input
              placeholder="Buscar materia por nombre o código (ej: Cálculo, QUI1)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </Card.Body>
      </Card>

      {isLoading ? (
        <div className="py-12 text-center text-gray-500">Cargando catálogo de materias...</div>
      ) : filteredCatalog.length === 0 ? (
        <Card>
          <Card.Body>
            <p className="text-center text-gray-500 py-6">
              No se encontraron materias con ese criterio de búsqueda.
            </p>
          </Card.Body>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredCatalog.map((career) => (
            <Card key={career.id} className="overflow-hidden">
              <Card.Header className="bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{career.name}</h2>
                    {career.description && (
                      <p className="text-xs text-gray-500">{career.description}</p>
                    )}
                  </div>
                  <span className="rounded-full bg-gray-200/80 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                    Área Académica
                  </span>
                </div>
              </Card.Header>

              <Card.Body className="space-y-6 divide-y divide-gray-100">
                {career.courses.map((course) => (
                  <div key={course.id} className="pt-4 first:pt-0">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-mono font-semibold text-blue-700">
                        {course.code}
                      </span>
                      <h3 className="font-semibold text-gray-800 text-sm">{course.name}</h3>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {course.subjects.map((subject) => {
                        const isOffered = offeredSubjectIds.has(subject.id)
                        const isToggling = togglingId === subject.id

                        return (
                          <div
                            key={subject.id}
                            className={`flex items-center justify-between rounded-lg border p-3.5 transition-all ${
                              isOffered
                                ? 'border-primary-300 bg-primary-50/40 shadow-xs'
                                : 'border-gray-200 bg-white hover:bg-gray-50/80'
                            }`}
                          >
                            <div className="min-w-0 pr-3">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs text-gray-400">
                                  {subject.code}
                                </span>
                                <p className="truncate text-sm font-medium text-gray-900">
                                  {subject.name}
                                </p>
                              </div>
                              <span
                                className={`inline-flex items-center gap-1 mt-1 text-[11px] font-medium ${
                                  isOffered ? 'text-primary-700' : 'text-gray-400'
                                }`}
                              >
                                {isOffered ? (
                                  <>
                                    <CheckCircle2 className="h-3 w-3 text-primary-600" />
                                    Ofertada en la institución
                                  </>
                                ) : (
                                  'No ofertada'
                                )}
                              </span>
                            </div>

                            <Button
                              variant={isOffered ? 'secondary' : 'primary'}
                              size="sm"
                              isLoading={isToggling}
                              onClick={() => handleToggleSubject(subject.id, isOffered)}
                            >
                              {isOffered ? 'Quitar' : 'Habilitar'}
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </Card.Body>
            </Card>
          ))}
        </div>
      )}

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 text-green-700">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Crear Nueva Materia</h3>
                  <p className="text-xs text-gray-500">
                    Añade una asignatura al catálogo y oferta en la institución
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubject} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Curso o Área Académica <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={newSubject.courseId}
                  onChange={(e) => setNewSubject({ ...newSubject, courseId: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">-- Seleccionar curso / área --</option>
                  {coursesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.name} {c.careerName ? `(${c.careerName})` : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-gray-400">
                  Define el departamento o curso macro al que pertenece la asignatura
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Nombre de la Materia <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="Ej: Cálculo Diferencial, Química Orgánica I..."
                  value={newSubject.name}
                  onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Código de la Materia <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="Ej: CALC-101, QUI-202, BIO-100..."
                  value={newSubject.code}
                  onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Descripción (Opcional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Temario introductorio, prerequisitos o detalles formativos..."
                  value={newSubject.description}
                  onChange={(e) => setNewSubject({ ...newSubject, description: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newSubject.offerImmediately}
                    onChange={(e) => setNewSubject({ ...newSubject, offerImmediately: e.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-blue-900 block">
                      Habilitar oferta inmediatamente
                    </span>
                    <span className="text-blue-700">
                      Vincular directamente con {institutions.find((i) => i.id === targetInstId)?.name || 'la institución activa'} para que los tutores puedan seleccionarla.
                    </span>
                  </div>
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isCreatingSubject}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="success"
                  isLoading={isCreatingSubject}
                  className="flex items-center gap-2"
                >
                  <BookOpen className="h-4 w-4" />
                  Crear Materia
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
