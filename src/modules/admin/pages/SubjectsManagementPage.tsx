import { useEffect, useState, useMemo, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Shield, ArrowLeft, CheckCircle2, BookOpen, X, Plus, Layers, GraduationCap, Pencil } from 'lucide-react'
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
  code: string | null
  careerId: string
  careerName?: string
}

interface SubjectWithStatus extends Subject {
  isOffered: boolean
  customCode: string | null
}

interface CourseWithSubjects extends Course {
  subjects: SubjectWithStatus[]
}

interface CareerWithCourses extends Career {
  courses: CourseWithSubjects[]
}

interface InstSubjectRecord {
  customCode: string | null
  active: boolean
}

export function SubjectsManagementPage() {
  const { profile: currentProfile, isSuperAdmin } = useAuth()
  const { selectedInstitutionId, setSelectedInstitutionId } = useAdminStore()
  const [searchParams, setSearchParams] = useSearchParams()

  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [careersList, setCareersList] = useState<Career[]>([])
  const [coursesList, setCoursesList] = useState<CourseOption[]>([])

  const [catalog, setCatalog] = useState<CareerWithCourses[]>([])
  const [institutionSubjectsMap, setInstitutionSubjectsMap] = useState<Map<string, InstSubjectRecord>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const [isCreateCareerModalOpen, setIsCreateCareerModalOpen] = useState(false)
  const [isCreatingCareer, setIsCreatingCareer] = useState(false)
  const [newCareer, setNewCareer] = useState({
    name: '',
    description: '',
  })

  const [isCreateCourseModalOpen, setIsCreateCourseModalOpen] = useState(false)
  const [isCreatingCourse, setIsCreatingCourse] = useState(false)
  const [newCourse, setNewCourse] = useState({
    careerId: '',
    code: '',
    name: '',
    description: '',
  })

  const [isCreateSubjectModalOpen, setIsCreateSubjectModalOpen] = useState(false)
  const [isCreatingSubject, setIsCreatingSubject] = useState(false)
  const [newSubject, setNewSubject] = useState({
    courseId: '',
    code: '',
    name: '',
    description: '',
    offerImmediately: true,
  })

  const [editingCareer, setEditingCareer] = useState<Career | null>(null)
  const [isUpdatingCareer, setIsUpdatingCareer] = useState(false)

  const [editingCourse, setEditingCourse] = useState<{
    id: string
    careerId: string
    code: string
    name: string
    description: string
  } | null>(null)
  const [isUpdatingCourse, setIsUpdatingCourse] = useState(false)

  const [editingSubjectGlobal, setEditingSubjectGlobal] = useState<{
    id: string
    courseId: string
    code: string
    name: string
    description: string
  } | null>(null)
  const [isUpdatingSubjectGlobal, setIsUpdatingSubjectGlobal] = useState(false)

  const [editingInstitutionCode, setEditingInstitutionCode] = useState<{
    subjectId: string
    subjectName: string
    customCode: string
  } | null>(null)
  const [isUpdatingInstitutionCode, setIsUpdatingInstitutionCode] = useState(false)

  const [enablingSubject, setEnablingSubject] = useState<{
    id: string
    name: string
    suggestedCode: string
  } | null>(null)
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false)
  const [offerCodeInput, setOfferCodeInput] = useState('')

  const targetInstId = isSuperAdmin
    ? (selectedInstitutionId || currentProfile?.institution_id)
    : currentProfile?.institution_id

  useEffect(() => {
    if (!isSuperAdmin) return
    const instParam = searchParams.get('inst')
    if (instParam && instParam !== selectedInstitutionId) {
      setSelectedInstitutionId(instParam)
    }
  }, [searchParams, isSuperAdmin, selectedInstitutionId, setSelectedInstitutionId])

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
  }, [isSuperAdmin, currentProfile?.institution_id, selectedInstitutionId, setSelectedInstitutionId])

  const loadCatalogAndOffered = useCallback(async () => {
    if (!targetInstId) return
    setIsLoading(true)
    try {
      const [careersRes, coursesRes, subjectsRes, offeredRes] = await Promise.all([
        supabase.from('careers').select('*').eq('active', true).order('name'),
        supabase.from('courses').select('*').eq('active', true).order('name'),
        supabase.from('subjects').select('*').eq('active', true).order('name'),
        supabase
          .from('institution_subjects')
          .select('subject_id, custom_code, active')
          .eq('institution_id', targetInstId),
      ])

      if (careersRes.error) throw careersRes.error
      if (coursesRes.error) throw coursesRes.error
      if (subjectsRes.error) throw subjectsRes.error
      if (offeredRes.error) throw offeredRes.error

      const rawCareers: Career[] = careersRes.data ?? []
      const rawCourses: Course[] = coursesRes.data ?? []
      const rawSubjects: Subject[] = subjectsRes.data ?? []

      setCareersList(rawCareers)

      const instMap = new Map<string, InstSubjectRecord>()
      for (const o of offeredRes.data ?? []) {
        instMap.set(o.subject_id, {
          customCode: o.custom_code || null,
          active: o.active !== false,
        })
      }
      setInstitutionSubjectsMap(instMap)

      const subjectsByCourse = new Map<string, SubjectWithStatus[]>()
      rawSubjects.forEach((s) => {
        const list = subjectsByCourse.get(s.course_id) ?? []
        const instRecord = instMap.get(s.id)
        const isOffered = instRecord ? instRecord.active : false
        const customCode = instRecord?.customCode ?? null
        subjectsByCourse.set(s.course_id, [
          ...list,
          { ...s, isOffered, customCode },
        ])
      })

      const coursesByCareer = new Map<string, CourseWithSubjects[]>()
      rawCourses.forEach((c) => {
        const list = coursesByCareer.get(c.career_id) ?? []
        coursesByCareer.set(c.career_id, [
          ...list,
          { ...c, subjects: subjectsByCourse.get(c.id) ?? [] },
        ])
      })

      const structuredCatalog: CareerWithCourses[] = rawCareers.map((car) => ({
        ...car,
        courses: coursesByCareer.get(car.id) ?? [],
      }))

      setCatalog(structuredCatalog)

      const careerMap = new Map<string, string>(rawCareers.map((c) => [c.id, c.name]))
      const coursesOptions: CourseOption[] = rawCourses.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        careerId: c.career_id,
        careerName: careerMap.get(c.career_id) || '',
      }))
      setCoursesList(coursesOptions)
    } catch (err) {
      console.error('Error al cargar catálogo de materias:', err)
      toast.error('Error', 'No fue posible cargar el catálogo de materias.')
    } finally {
      setIsLoading(false)
    }
  }, [targetInstId])

  useEffect(() => {
    void loadCatalogAndOffered()
  }, [loadCatalogAndOffered])

  const offeredCount = useMemo(() => {
    let count = 0
    for (const item of institutionSubjectsMap.values()) {
      if (item.active) count++
    }
    return count
  }, [institutionSubjectsMap])

  const handleSelectInstitution = (instId: string) => {
    setSelectedInstitutionId(instId)
    setSearchParams(instId ? { inst: instId } : {})
  }

  const handleOpenEnableModal = (subject: SubjectWithStatus) => {
    const defaultCode = subject.customCode || subject.code || ''
    setEnablingSubject({
      id: subject.id,
      name: subject.name,
      suggestedCode: defaultCode,
    })
    setOfferCodeInput(defaultCode)
  }

  const handleConfirmEnableSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetInstId || !enablingSubject) return
    const codeVal = offerCodeInput.trim().toUpperCase()
    if (!codeVal) {
      toast.warning('Código requerido', 'Debes ingresar el código administrativo para esta institución.')
      return
    }

    setIsSubmittingOffer(true)
    try {
      const { error } = await supabase.from('institution_subjects').upsert({
        institution_id: targetInstId,
        subject_id: enablingSubject.id,
        custom_code: codeVal,
        active: true,
      })

      if (error) throw error

      toast.success('Materia habilitada', `Materia habilitada con código institucional ${codeVal}.`)
      setEnablingSubject(null)
      await loadCatalogAndOffered()
    } catch (err) {
      console.error('Error al habilitar materia:', err)
      const errorText = err instanceof Error ? err.message : 'Error al habilitar materia.'
      toast.error('Error', errorText)
    } finally {
      setIsSubmittingOffer(false)
    }
  }

  const handleDisableSubject = async (subject: SubjectWithStatus) => {
    if (!targetInstId) return
    setTogglingId(subject.id)
    try {
      const { error } = await supabase
        .from('institution_subjects')
        .upsert({
          institution_id: targetInstId,
          subject_id: subject.id,
          custom_code: subject.customCode || subject.code,
          active: false,
        })

      if (error) throw error

      toast.info('Materia deshabilitada', 'La materia ya no se ofrece en esta institución.')
      await loadCatalogAndOffered()
    } catch (err) {
      console.error('Error al deshabilitar materia:', err)
      const errorText = err instanceof Error ? err.message : 'Error al deshabilitar materia.'
      toast.error('Error', errorText)
    } finally {
      setTogglingId(null)
    }
  }

  const handleToggleOrEnable = async (subject: SubjectWithStatus) => {
    if (!targetInstId) return
    if (subject.isOffered) {
      await handleDisableSubject(subject)
    } else {
      if (subject.customCode) {
        setTogglingId(subject.id)
        try {
          const { error } = await supabase
            .from('institution_subjects')
            .upsert({
              institution_id: targetInstId,
              subject_id: subject.id,
              custom_code: subject.customCode,
              active: true,
            })

          if (error) throw error

          toast.success('Materia habilitada', `Materia habilitada con código institucional ${subject.customCode}.`)
          await loadCatalogAndOffered()
        } catch (err) {
          console.error('Error al habilitar materia:', err)
          toast.error('Error', err instanceof Error ? err.message : 'Error al habilitar materia.')
        } finally {
          setTogglingId(null)
        }
      } else {
        handleOpenEnableModal(subject)
      }
    }
  }

  const handleOpenCreateCareer = () => {
    setNewCareer({
      name: '',
      description: '',
    })
    setIsCreateCareerModalOpen(true)
  }

  const handleCreateCareer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCareer.name.trim()) {
      toast.warning('Campos incompletos', 'Por favor ingresa el nombre de la carrera o categoría.')
      return
    }

    setIsCreatingCareer(true)

    try {
      const { data: createdCareer, error: careerError } = await supabase
        .from('careers')
        .insert({
          name: newCareer.name.trim(),
          description: newCareer.description.trim() || null,
          active: true,
        })
        .select('id, name')
        .single()

      if (careerError) throw careerError

      const successMsg = `Carrera / Categoría "${createdCareer.name}" creada exitosamente.`
      toast.success('Carrera registrada', successMsg)

      setNewCareer({ name: '', description: '' })
      setIsCreateCareerModalOpen(false)
      await loadCatalogAndOffered()
    } catch (err) {
      console.error('Error al crear carrera:', err)
      const errorText = err instanceof Error ? err.message : 'Error al crear la carrera.'
      toast.error('Error al crear carrera', errorText)
    } finally {
      setIsCreatingCareer(false)
    }
  }

  const handleOpenCreateCourse = (preselectedCareerId?: string) => {
    setNewCourse({
      careerId: preselectedCareerId || (careersList[0]?.id ?? ''),
      code: '',
      name: '',
      description: '',
    })
    setIsCreateCourseModalOpen(true)
  }

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCourse.careerId || !newCourse.name.trim()) {
      toast.warning('Campos incompletos', 'Por favor selecciona la carrera padre e introduce el nombre del curso.')
      return
    }

    setIsCreatingCourse(true)

    try {
      const { data: createdCourse, error: courseError } = await supabase
        .from('courses')
        .insert({
          career_id: newCourse.careerId,
          code: newCourse.code.trim() ? newCourse.code.trim().toUpperCase() : null,
          name: newCourse.name.trim(),
          description: newCourse.description.trim() || null,
          active: true,
        })
        .select('id, name')
        .single()

      if (courseError) throw courseError

      const successMsg = `Curso / Área "${createdCourse.name}" creado exitosamente.`
      toast.success('Curso registrado', successMsg)

      setNewCourse({ careerId: '', code: '', name: '', description: '' })
      setIsCreateCourseModalOpen(false)
      await loadCatalogAndOffered()
    } catch (err) {
      console.error('Error al crear curso:', err)
      const errorText = err instanceof Error ? err.message : 'Error al crear el curso.'
      toast.error('Error al crear curso', errorText)
    } finally {
      setIsCreatingCourse(false)
    }
  }

  const handleOpenCreateSubject = (preselectedCourseId?: string) => {
    setNewSubject({
      courseId: preselectedCourseId || (coursesList[0]?.id ?? ''),
      code: '',
      name: '',
      description: '',
      offerImmediately: true,
    })
    setIsCreateSubjectModalOpen(true)
  }

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubject.courseId || !newSubject.name.trim() || !newSubject.code.trim()) {
      toast.warning('Campos incompletos', 'Por favor completa todos los campos requeridos para la materia.')
      return
    }

    setIsCreatingSubject(true)

    try {
      const enteredCode = newSubject.code.trim().toUpperCase()
      const { data: createdSubject, error: subjectError } = await supabase
        .from('subjects')
        .insert({
          course_id: newSubject.courseId,
          code: enteredCode,
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
            custom_code: enteredCode,
            active: true,
          })

        if (offerError) {
          console.warn('Materia creada, pero hubo un error al ofertarla en la institución:', offerError)
        }
      }

      const successMsg = `Materia "${createdSubject.name}" creada exitosamente${newSubject.offerImmediately ? ' y ofertada con código ' + enteredCode : ''}.`
      toast.success('Materia registrada', successMsg)

      setNewSubject({
        courseId: '',
        name: '',
        code: '',
        description: '',
        offerImmediately: true,
      })
      setIsCreateSubjectModalOpen(false)
      await loadCatalogAndOffered()
    } catch (err) {
      console.error('Error al crear materia:', err)
      const errorText = err instanceof Error ? err.message : 'Error inesperado al crear la materia.'
      toast.error('Error al crear materia', errorText)
    } finally {
      setIsCreatingSubject(false)
    }
  }

  const handleOpenEditCareer = (career: Career) => {
    setEditingCareer(career)
  }

  const handleUpdateCareer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCareer || !editingCareer.name.trim()) return
    setIsUpdatingCareer(true)
    try {
      const { error } = await supabase
        .from('careers')
        .update({
          name: editingCareer.name.trim(),
          description: editingCareer.description?.trim() || null,
        })
        .eq('id', editingCareer.id)

      if (error) throw error

      toast.success('Carrera actualizada', 'Los cambios en la carrera se guardaron correctamente.')
      setEditingCareer(null)
      await loadCatalogAndOffered()
    } catch (err) {
      console.error('Error al actualizar carrera:', err)
      toast.error('Error', err instanceof Error ? err.message : 'Error al actualizar carrera.')
    } finally {
      setIsUpdatingCareer(false)
    }
  }

  const handleOpenEditCourse = (course: Course) => {
    setEditingCourse({
      id: course.id,
      careerId: course.career_id,
      code: course.code || '',
      name: course.name,
      description: course.description || '',
    })
  }

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCourse || !editingCourse.name.trim() || !editingCourse.careerId) return
    setIsUpdatingCourse(true)
    try {
      const { error } = await supabase
        .from('courses')
        .update({
          career_id: editingCourse.careerId,
          code: editingCourse.code.trim() ? editingCourse.code.trim().toUpperCase() : null,
          name: editingCourse.name.trim(),
          description: editingCourse.description.trim() || null,
        })
        .eq('id', editingCourse.id)

      if (error) throw error

      toast.success('Curso actualizado', 'Los cambios en el curso se guardaron correctamente.')
      setEditingCourse(null)
      await loadCatalogAndOffered()
    } catch (err) {
      console.error('Error al actualizar curso:', err)
      toast.error('Error', err instanceof Error ? err.message : 'Error al actualizar curso.')
    } finally {
      setIsUpdatingCourse(false)
    }
  }

  const handleOpenEditSubjectGlobal = (subject: Subject) => {
    setEditingSubjectGlobal({
      id: subject.id,
      courseId: subject.course_id,
      code: subject.code,
      name: subject.name,
      description: subject.description || '',
    })
  }

  const handleUpdateSubjectGlobal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSubjectGlobal || !editingSubjectGlobal.name.trim() || !editingSubjectGlobal.courseId) return
    setIsUpdatingSubjectGlobal(true)
    try {
      const { error } = await supabase
        .from('subjects')
        .update({
          course_id: editingSubjectGlobal.courseId,
          code: editingSubjectGlobal.code.trim().toUpperCase(),
          name: editingSubjectGlobal.name.trim(),
          description: editingSubjectGlobal.description.trim() || null,
        })
        .eq('id', editingSubjectGlobal.id)

      if (error) throw error

      toast.success('Materia actualizada', 'Datos globales de la materia actualizados.')
      setEditingSubjectGlobal(null)
      await loadCatalogAndOffered()
    } catch (err) {
      console.error('Error al actualizar materia global:', err)
      toast.error('Error', err instanceof Error ? err.message : 'Error al actualizar materia.')
    } finally {
      setIsUpdatingSubjectGlobal(false)
    }
  }

  const handleOpenEditInstitutionCode = (subjectId: string, subjectName: string, currentCustomCode: string | null) => {
    setEditingInstitutionCode({
      subjectId,
      subjectName,
      customCode: currentCustomCode || '',
    })
  }

  const handleUpdateInstitutionCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetInstId || !editingInstitutionCode) return
    const newCode = editingInstitutionCode.customCode.trim().toUpperCase()
    if (!newCode) {
      toast.warning('Código requerido', 'Debes ingresar un código administrativo para esta institución.')
      return
    }

    setIsUpdatingInstitutionCode(true)
    try {
      const currentRec = institutionSubjectsMap.get(editingInstitutionCode.subjectId)
      const currentActive = currentRec ? currentRec.active : false

      const { error } = await supabase
        .from('institution_subjects')
        .upsert({
          institution_id: targetInstId,
          subject_id: editingInstitutionCode.subjectId,
          custom_code: newCode,
          active: currentActive,
        })

      if (error) throw error

      toast.success('Código institucional actualizado', `El código para ${editingInstitutionCode.subjectName} ahora es ${newCode}.`)
      setEditingInstitutionCode(null)
      await loadCatalogAndOffered()
    } catch (err) {
      console.error('Error al actualizar código institucional:', err)
      toast.error('Error', err instanceof Error ? err.message : 'Error al actualizar código.')
    } finally {
      setIsUpdatingInstitutionCode(false)
    }
  }

  const filteredCatalog = useMemo(() => {
    if (!searchTerm.trim()) return catalog

    const term = searchTerm.toLowerCase().trim()
    return catalog
      .map((career) => {
        const careerMatches =
          career.name.toLowerCase().includes(term) ||
          (career.description?.toLowerCase().includes(term) ?? false)

        const filteredCourses = career.courses
          .map((course) => {
            const courseMatches =
              course.name.toLowerCase().includes(term) ||
              (course.code?.toLowerCase().includes(term) ?? false) ||
              (course.description?.toLowerCase().includes(term) ?? false)

            const filteredSubjects = course.subjects.filter(
              (s) =>
                s.name.toLowerCase().includes(term) ||
                s.code.toLowerCase().includes(term) ||
                (s.customCode?.toLowerCase().includes(term) ?? false) ||
                (s.description?.toLowerCase().includes(term) ?? false)
            )

            if (courseMatches) {
              return course
            }

            if (filteredSubjects.length > 0) {
              return {
                ...course,
                subjects: filteredSubjects,
              }
            }

            return null
          })
          .filter((c): c is CourseWithSubjects => c !== null)

        if (careerMatches) {
          return career
        }

        if (filteredCourses.length > 0) {
          return {
            ...career,
            courses: filteredCourses,
          }
        }

        return null
      })
      .filter((c): c is CareerWithCourses => c !== null)
  }, [catalog, searchTerm])

  const selectedInstName = institutions.find((i) => i.id === targetInstId)?.name || 'Institución'

  return (
    <div className="space-y-6">
      {isSuperAdmin && (
        <div className="rounded-xl border border-primary-100 bg-primary-50/40 p-4">
          <div className="flex items-center gap-2 mb-2 text-primary-800 font-semibold text-sm">
            <Shield className="h-4 w-4" /> Modo SuperAdmin: Selección de Campus / Institución
          </div>
          <p className="text-xs text-primary-700 mb-3">
            Gestionando catálogo y códigos administrativos de la institución seleccionada:
          </p>
          <select
            value={targetInstId || ''}
            onChange={(e) => handleSelectInstitution(e.target.value)}
            className="w-full sm:w-80 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-xs focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
          >
            {institutions.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-800">
              <ArrowLeft className="h-4 w-4" /> Panel de Administración
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            Catálogo Académico y Materias
          </h1>
          <p className="text-sm text-gray-500">
            Gestión en 3 niveles: Carreras (Nivel 1), Cursos/Áreas (Nivel 2) y Materias con código institucional (Nivel 3).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button
            variant="success"
            onClick={handleOpenCreateCareer}
            className="flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <GraduationCap className="h-4 w-4" />
            Crear Carrera
          </Button>
          <Button
            variant="success"
            onClick={() => handleOpenCreateCourse()}
            className="flex items-center gap-2 cursor-pointer shadow-xs"
            disabled={careersList.length === 0}
          >
            <Layers className="h-4 w-4" />
            Crear Curso / Área
          </Button>
          <Button
            variant="success"
            onClick={() => handleOpenCreateSubject()}
            className="flex items-center gap-2 cursor-pointer shadow-xs"
            disabled={coursesList.length === 0}
          >
            <BookOpen className="h-4 w-4" />
            Crear Materia
          </Button>
          <div className="rounded-lg bg-primary-50 px-3.5 py-1.5 border border-primary-200">
            <span className="text-xs font-semibold uppercase text-primary-700">Ofertadas:</span>
            <span className="ml-1.5 text-base font-bold text-primary-900">
              {offeredCount}
            </span>
          </div>
        </div>
      </div>

      <Card>
        <Card.Body>
          <div className="max-w-md">
            <Input
              placeholder="Buscar por carrera, curso o código institucional (ej: Idiomas, MA-1001, Cálculo)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </Card.Body>
      </Card>

      {isLoading ? (
        <div className="py-12 text-center text-gray-500">Cargando catálogo académico...</div>
      ) : filteredCatalog.length === 0 ? (
        <Card>
          <Card.Body>
            <div className="text-center py-8 space-y-3">
              <p className="text-gray-500">
                {catalog.length === 0
                  ? 'No hay carreras registradas en el catálogo académico.'
                  : 'No se encontraron resultados con ese criterio de búsqueda.'}
              </p>
              {catalog.length === 0 && (
                <Button
                  variant="success"
                  onClick={handleOpenCreateCareer}
                  className="inline-flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Crear la primera carrera (Nivel 1)
                </Button>
              )}
            </div>
          </Card.Body>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredCatalog.map((career) => (
            <Card key={career.id} className="overflow-hidden border-gray-200 shadow-xs">
              <Card.Header className="bg-gray-50/90 border-b border-gray-200 py-3.5 px-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                        <GraduationCap className="h-3 w-3" /> Nivel 1: Carrera
                      </span>
                      <h2 className="text-lg font-bold text-gray-900">{career.name}</h2>
                      {isSuperAdmin && (
                        <button
                          type="button"
                          onClick={() => handleOpenEditCareer(career)}
                          title="Editar carrera"
                          className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors cursor-pointer"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {career.description && (
                      <p className="text-xs text-gray-500">{career.description}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenCreateCourse(career.id)}
                    className="text-primary-700 hover:text-primary-800 hover:bg-primary-50 self-start sm:self-auto flex items-center gap-1.5 border border-primary-200 bg-white cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Añadir Curso / Área
                  </Button>
                </div>
              </Card.Header>

              <Card.Body className="p-5 space-y-5">
                {career.courses.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center bg-gray-50/50">
                    <p className="text-sm text-gray-500 mb-2">
                      Esta carrera aún no cuenta con cursos o áreas académicas (Nivel 2).
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenCreateCourse(career.id)}
                      className="inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Crear primer curso para {career.name}
                    </Button>
                  </div>
                ) : (
                  career.courses.map((course) => (
                    <div key={course.id} className="rounded-lg border border-gray-200 bg-gray-50/30 p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-200/70 pb-2.5">
                        <div className="flex items-center gap-2">
                          {course.code && (
                            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-mono font-bold text-blue-800">
                              {course.code}
                            </span>
                          )}
                          <h3 className="font-semibold text-gray-900 text-sm">{course.name}</h3>
                          {course.description && (
                            <span className="text-xs text-gray-500 hidden md:inline">
                              — {course.description}
                            </span>
                          )}
                          {isSuperAdmin && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditCourse(course)}
                              title="Editar curso"
                              className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors cursor-pointer"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenCreateSubject(course.id)}
                          className="text-primary-700 hover:text-primary-800 hover:bg-primary-50 self-start sm:self-auto flex items-center gap-1 text-xs cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                          Añadir Materia
                        </Button>
                      </div>

                      {course.subjects.length === 0 ? (
                        <div className="rounded-md border border-dashed border-gray-200 bg-white p-4 text-center">
                          <p className="text-xs text-gray-500 mb-2">
                            No hay materias registradas en este curso (Nivel 3).
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenCreateSubject(course.id)}
                            className="text-xs inline-flex items-center gap-1 text-primary-600 hover:underline cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                            Crear primera materia
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {course.subjects.map((subject) => {
                            const isOffered = subject.isOffered
                            const isToggling = togglingId === subject.id
                            const displayCode = subject.customCode || subject.code

                            return (
                              <div
                                key={subject.id}
                                className={`flex items-center justify-between rounded-lg border p-3 transition-all ${
                                  isOffered
                                    ? 'border-primary-300 bg-primary-50/50 shadow-xs'
                                    : 'border-gray-200 bg-white hover:bg-gray-50/70'
                                }`}
                              >
                                <div className="min-w-0 pr-2">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`font-mono text-xs font-semibold px-1.5 py-0.5 rounded ${
                                        isOffered
                                          ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                          : subject.customCode
                                            ? 'bg-gray-100 text-gray-800 border border-gray-300'
                                            : 'bg-gray-100 text-gray-500'
                                      }`}
                                      title={
                                        isOffered
                                          ? 'Código institucional activo'
                                          : subject.customCode
                                            ? `Código institucional asignado: ${subject.customCode}`
                                            : 'Código de referencia global'
                                      }
                                    >
                                      {displayCode}
                                    </span>
                                    <p className="truncate text-sm font-medium text-gray-900">
                                      {subject.name}
                                    </p>
                                    {isSuperAdmin && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditSubjectGlobal(subject)}
                                        title="Editar materia global"
                                        className="text-gray-400 hover:text-gray-700 p-0.5 cursor-pointer"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </button>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span
                                      className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                                        isOffered ? 'text-primary-700' : 'text-gray-400'
                                      }`}
                                    >
                                      {isOffered ? (
                                        <>
                                          <CheckCircle2 className="h-3 w-3 text-primary-600" />
                                          Ofertada
                                        </>
                                      ) : (
                                        'No ofertada'
                                      )}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleOpenEditInstitutionCode(
                                          subject.id,
                                          subject.name,
                                          subject.customCode || subject.code
                                        )
                                      }
                                      className="text-[11px] text-blue-700 hover:text-blue-900 underline flex items-center gap-0.5 cursor-pointer"
                                      title="Cambiar código para esta institución"
                                    >
                                      <Pencil className="h-2.5 w-2.5" />
                                      Editar código
                                    </button>
                                  </div>
                                </div>

                                <Button
                                  variant={isOffered ? 'secondary' : 'primary'}
                                  size="sm"
                                  isLoading={isToggling}
                                  onClick={() => handleToggleOrEnable(subject)}
                                  className="cursor-pointer shrink-0"
                                >
                                  {isOffered ? 'Quitar' : 'Habilitar'}
                                </Button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </Card.Body>
            </Card>
          ))}
        </div>
      )}

      {enablingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Habilitar Materia en Institución</h3>
              <button
                type="button"
                onClick={() => setEnablingSubject(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleConfirmEnableSubject} className="mt-4 space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-900 mb-1">{enablingSubject.name}</p>
                <p className="text-xs text-gray-500 mb-3">
                  Establece el código administrativo oficial con el que se impartirá en esta institución.
                </p>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Código en esta Institución <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="Ej: MA-1001, MAT-001, 00801..."
                  value={offerCodeInput}
                  onChange={(e) => setOfferCodeInput(e.target.value)}
                />
              </div>
              <div className="mt-6 flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEnablingSubject(null)}
                  disabled={isSubmittingOffer}
                  className="cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="success"
                  isLoading={isSubmittingOffer}
                  className="cursor-pointer"
                >
                  Confirmar y Habilitar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingInstitutionCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Editar Código Institucional</h3>
              <button
                type="button"
                onClick={() => setEditingInstitutionCode(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateInstitutionCode} className="mt-4 space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-900 mb-1">{editingInstitutionCode.subjectName}</p>
                <p className="text-xs text-gray-500 mb-3">
                  Este código es exclusivo para esta institución y no afectará el catálogo de otras universidades.
                </p>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Nuevo Código Oficial <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="Ej: MA-1001, MAT-001..."
                  value={editingInstitutionCode.customCode}
                  onChange={(e) =>
                    setEditingInstitutionCode({
                      ...editingInstitutionCode,
                      customCode: e.target.value,
                    })
                  }
                />
              </div>
              <div className="mt-6 flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditingInstitutionCode(null)}
                  disabled={isUpdatingInstitutionCode}
                  className="cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="success"
                  isLoading={isUpdatingInstitutionCode}
                  className="cursor-pointer"
                >
                  Guardar Código
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingCareer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Editar Carrera (SuperAdmin)</h3>
              <button
                type="button"
                onClick={() => setEditingCareer(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateCareer} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Nombre de la Carrera <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={editingCareer.name}
                  onChange={(e) => setEditingCareer({ ...editingCareer, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Descripción (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={editingCareer.description || ''}
                  onChange={(e) => setEditingCareer({ ...editingCareer, description: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div className="mt-6 flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditingCareer(null)}
                  disabled={isUpdatingCareer}
                  className="cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="success"
                  isLoading={isUpdatingCareer}
                  className="cursor-pointer"
                >
                  Guardar Cambios
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Editar Curso / Área (SuperAdmin)</h3>
              <button
                type="button"
                onClick={() => setEditingCourse(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateCourse} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Carrera Padre <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={editingCourse.careerId}
                  onChange={(e) => setEditingCourse({ ...editingCourse, careerId: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
                >
                  {careersList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Nombre del Curso <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={editingCourse.name}
                  onChange={(e) => setEditingCourse({ ...editingCourse, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Sigla o Código de Referencia (Opcional)
                </label>
                <Input
                  placeholder="Ej: CALC, FRA, ENG..."
                  value={editingCourse.code}
                  onChange={(e) => setEditingCourse({ ...editingCourse, code: e.target.value })}
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Los códigos administrativos oficiales se asignan individualmente a nivel de cada materia por institución.
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Descripción (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={editingCourse.description}
                  onChange={(e) => setEditingCourse({ ...editingCourse, description: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div className="mt-6 flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditingCourse(null)}
                  disabled={isUpdatingCourse}
                  className="cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="success"
                  isLoading={isUpdatingCourse}
                  className="cursor-pointer"
                >
                  Guardar Cambios
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingSubjectGlobal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Editar Materia Global (SuperAdmin)</h3>
              <button
                type="button"
                onClick={() => setEditingSubjectGlobal(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateSubjectGlobal} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Curso Padre <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={editingSubjectGlobal.courseId}
                  onChange={(e) =>
                    setEditingSubjectGlobal({ ...editingSubjectGlobal, courseId: e.target.value })
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
                >
                  {coursesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.careerName ? '(' + c.careerName + ')' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Nombre de la Materia <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={editingSubjectGlobal.name}
                  onChange={(e) =>
                    setEditingSubjectGlobal({ ...editingSubjectGlobal, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Código de Referencia Global <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={editingSubjectGlobal.code}
                  onChange={(e) =>
                    setEditingSubjectGlobal({ ...editingSubjectGlobal, code: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Descripción (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={editingSubjectGlobal.description}
                  onChange={(e) =>
                    setEditingSubjectGlobal({ ...editingSubjectGlobal, description: e.target.value })
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div className="mt-6 flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditingSubjectGlobal(null)}
                  disabled={isUpdatingSubjectGlobal}
                  className="cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="success"
                  isLoading={isUpdatingSubjectGlobal}
                  className="cursor-pointer"
                >
                  Guardar Cambios
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCreateCareerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 text-green-700">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Crear Carrera / Categoría</h3>
                  <p className="text-xs text-gray-500">
                    Nivel 1 de la jerarquía académica (ej: Idiomas, Ingeniería, Salud)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateCareerModalOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCareer} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Nombre de la Carrera o Categoría <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="Ej: Idiomas, Ciencias Exactas, Humanidades..."
                  value={newCareer.name}
                  onChange={(e) => setNewCareer({ ...newCareer, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Descripción (Opcional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Breve descripción o propósito de esta área del catálogo..."
                  value={newCareer.description}
                  onChange={(e) => setNewCareer({ ...newCareer, description: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div className="mt-6 flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCreateCareerModalOpen(false)}
                  disabled={isCreatingCareer}
                  className="cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="success"
                  isLoading={isCreatingCareer}
                  className="cursor-pointer"
                >
                  Crear Carrera
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCreateCourseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 text-green-700">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Crear Curso / Área Académica</h3>
                  <p className="text-xs text-gray-500">
                    Nivel 2 de la jerarquía académica (agrupa materias temáticas)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateCourseModalOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Carrera Padre (Nivel 1) <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={newCourse.careerId}
                  onChange={(e) => setNewCourse({ ...newCourse, careerId: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
                >
                  {careersList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Nombre del Curso o Área <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="Ej: Francés, Cálculo, Álgebra, Programación..."
                  value={newCourse.name}
                  onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Sigla o Código de Referencia (Opcional)
                </label>
                <Input
                  placeholder="Ej: CALC, FRA, ENG (Opcional)..."
                  value={newCourse.code}
                  onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Los códigos administrativos oficiales se asignan individualmente a nivel de cada materia por institución.
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Descripción (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Breve descripción del área académica..."
                  value={newCourse.description}
                  onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div className="mt-6 flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCreateCourseModalOpen(false)}
                  disabled={isCreatingCourse}
                  className="cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="success"
                  isLoading={isCreatingCourse}
                  className="cursor-pointer"
                >
                  Crear Curso
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCreateSubjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 text-green-700">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Crear Materia Académica</h3>
                  <p className="text-xs text-gray-500">
                    Nivel 3 con código administrativo asignado a {selectedInstName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateSubjectModalOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubject} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Curso / Área Perteneciente (Nivel 2) <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={newSubject.courseId}
                  onChange={(e) => setNewSubject({ ...newSubject, courseId: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
                >
                  {coursesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.careerName ? '(' + c.careerName + ')' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Nombre de la Materia <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="Ej: Francés Integrado I, Cálculo Diferencial, Química Orgánica..."
                  value={newSubject.name}
                  onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Código Administrativo Institucional <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="Ej: FL-0101, MA-1001, MAT-001..."
                  value={newSubject.code}
                  onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value })}
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Se asignará este código directamente para {selectedInstName}. Cada universidad puede tener códigos distintos.
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Descripción (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Temario breve, prerrequisitos o detalles de la asignatura..."
                  value={newSubject.description}
                  onChange={(e) => setNewSubject({ ...newSubject, description: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="offerImmediately"
                  checked={newSubject.offerImmediately}
                  onChange={(e) => setNewSubject({ ...newSubject, offerImmediately: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                />
                <label htmlFor="offerImmediately" className="text-xs text-gray-700 cursor-pointer select-none">
                  Ofertada activamente en <span className="font-semibold text-gray-900">{selectedInstName}</span>
                </label>
              </div>
              <div className="mt-6 flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCreateSubjectModalOpen(false)}
                  disabled={isCreatingSubject}
                  className="cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="success"
                  isLoading={isCreatingSubject}
                  className="cursor-pointer"
                >
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
