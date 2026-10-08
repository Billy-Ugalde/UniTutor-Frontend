import { useTranslations } from '@/i18n/useTranslations'
import { useEffect, useState, useMemo, useCallback, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Clock, MapPin, Users, Video, Pencil, Trash2, CheckCircle2, XCircle, RotateCcw, X, ExternalLink, Search, BookOpen, CalendarPlus } from 'lucide-react'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Card } from '@/shared/components/ui/Card'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { toast } from '@/shared/store/toast.store'
import { SessionStatusModal } from '@/modules/tutor/components/SessionStatusModal'
import { SessionDeleteModal } from '@/modules/tutor/components/SessionDeleteModal'
import type { TutoringSession, SessionModality, SessionStatus } from '@/types/database.types'

interface EnabledSubject {
  id: string
  name: string
  code: string
  customCode: string | null
}

interface SessionWithSubject extends TutoringSession {
  subjectName?: string
  subjectCode?: string
}

export function TutorSessionsPage() {
  const { t } = useTranslations()
  const { profile } = useAuth()

  const [sessions, setSessions] = useState<SessionWithSubject[]>([])
  const [subjects, setSubjects] = useState<EnabledSubject[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [searchTerm, setSearchTerm] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('todas')
  const [statusFilter, setStatusFilter] = useState<'todas' | SessionStatus>('todas')

  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<TutoringSession | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [statusModal, setStatusModal] = useState<{
    isOpen: boolean
    session: SessionWithSubject | null
    targetStatus: SessionStatus | null
  }>({
    isOpen: false,
    session: null,
    targetStatus: null,
  })

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    session: SessionWithSubject | null
  }>({
    isOpen: false,
    session: null,
  })

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isDeletingSession, setIsDeletingSession] = useState(false)

  const todayStr = new Date().toISOString().split('T')[0]

  const [sessionForm, setSessionForm] = useState({
    subjectId: '',
    title: '',
    description: '',
    date: todayStr,
    startTime: '14:00',
    endTime: '16:00',
    modality: 'virtual' as SessionModality,
    locationOrLink: '',
    maxStudents: 5,
  })

  const institutionId = profile?.institution_id
  const tutorId = profile?.id

  const loadData = useCallback(async () => {
    if (!tutorId || !institutionId) return
    setIsLoading(true)
    try {
      const [tutorSubRes, instSubRes, sessionsRes] = await Promise.all([
        supabase
          .from('tutor_subjects')
          .select('subject_id, subjects(id, name, code)')
          .eq('tutor_id', tutorId)
          .eq('institution_id', institutionId)
          .eq('active', true),
        supabase
          .from('institution_subjects')
          .select('subject_id, custom_code')
          .eq('institution_id', institutionId)
          .eq('active', true),
        supabase
          .from('tutoring_sessions')
          .select('*, subjects(id, name, code)')
          .eq('tutor_id', tutorId)
          .eq('institution_id', institutionId)
          .order('date', { ascending: false })
          .order('start_time', { ascending: false }),
      ])

      if (tutorSubRes.error) throw tutorSubRes.error
      if (sessionsRes.error) throw sessionsRes.error

      const customCodeMap = new Map<string, string | null>()
      instSubRes.data?.forEach((row) => {
        customCodeMap.set(row.subject_id, row.custom_code)
      })

      const loadedSubjects: EnabledSubject[] = []
      tutorSubRes.data?.forEach((item) => {
        const sub = item.subjects as unknown as { id: string; name: string; code: string } | null
        if (sub) {
          loadedSubjects.push({
            id: sub.id,
            name: sub.name,
            code: sub.code,
            customCode: customCodeMap.get(sub.id) ?? null,
          })
        }
      })
      setSubjects(loadedSubjects)

      const subjectNameMap = new Map<string, { name: string; code: string }>()
      loadedSubjects.forEach((sub) => {
        subjectNameMap.set(sub.id, {
          name: sub.name,
          code: sub.customCode || sub.code,
        })
      })

      const loadedSessions: SessionWithSubject[] = (sessionsRes.data || []).map((sess) => {
        const subInfo = subjectNameMap.get(sess.subject_id)
        const rawSub = sess.subjects as unknown as { id: string; name: string; code: string } | null
        return {
          ...sess,
          subjectName: subInfo?.name || rawSub?.name || 'Materia',
          subjectCode: subInfo?.code || rawSub?.code || '',
        }
      })
      setSessions(loadedSessions)
    } catch (err) {
      console.error('Error al cargar sesiones de tutoría:', err)
      toast.error('Error', 'No fue posible cargar las sesiones de tutoría.')
    } finally {
      setIsLoading(false)
    }
  }, [tutorId, institutionId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleOpenCreateModal = () => {
    if (subjects.length === 0) {
      toast.warning(t("Materia"), t("Debes tener al menos una materia habilitada para programar tutorías."))
      return
    }

    setEditingSession(null)
    setSessionForm({
      subjectId: subjects[0]?.id || '',
      title: '',
      description: '',
      date: todayStr,
      startTime: '14:00',
      endTime: '16:00',
      modality: 'virtual',
      locationOrLink: '',
      maxStudents: 5,
    })
    setIsSessionModalOpen(true)
  }

  const handleOpenEditModal = (s: TutoringSession) => {
    if (s.status !== 'programada') {
      toast.warning(t("Acción no permitida"), t("Solo se pueden editar tutorías con estado programada."))
      return
    }

    setEditingSession(s)
    setSessionForm({
      subjectId: s.subject_id,
      title: s.title,
      description: s.description || '',
      date: s.date,
      startTime: s.start_time.substring(0, 5),
      endTime: s.end_time.substring(0, 5),
      modality: s.modality,
      locationOrLink: s.location_or_link,
      maxStudents: s.max_students,
    })
    setIsSessionModalOpen(true)
  }

  const handleSubmitSession = async (e: FormEvent) => {
    e.preventDefault()
    if (!tutorId || !institutionId) return

    const targetSubjectId = editingSession ? editingSession.subject_id : sessionForm.subjectId
    if (!targetSubjectId) {
      toast.warning(t("Materia"), t("Selecciona una materia"))
      return
    }

    if (editingSession && editingSession.status !== 'programada') {
      toast.warning(t("Acción no permitida"), t("Solo se pueden editar tutorías con estado programada."))
      return
    }

    if (sessionForm.date < todayStr) {
      toast.warning(t("Fecha inválida"), t("La fecha de la tutoría no puede ser anterior a hoy."))
      return
    }

    if (sessionForm.endTime <= sessionForm.startTime) {
      toast.warning(t("Horario inválido"), t("La hora de finalización debe ser posterior a la hora de inicio."))
      return
    }

    if (sessionForm.maxStudents < 1) {
      toast.warning(t("Cupo inválido"), t("El cupo de estudiantes debe ser al menos 1."))
      return
    }

    setIsSubmitting(true)
    try {
      if (editingSession) {
        const { error } = await supabase
          .from('tutoring_sessions')
          .update({
            title: sessionForm.title.trim(),
            description: sessionForm.description.trim() || null,
            date: sessionForm.date,
            start_time: sessionForm.startTime,
            end_time: sessionForm.endTime,
            modality: sessionForm.modality,
            location_or_link: sessionForm.locationOrLink.trim(),
            max_students: sessionForm.maxStudents,
          })
          .eq('id', editingSession.id)

        if (error) throw error
        toast.success(t("Sesión actualizada exitosamente"))
      } else {
        const { error } = await supabase
          .from('tutoring_sessions')
          .insert({
            tutor_id: tutorId,
            subject_id: targetSubjectId,
            institution_id: institutionId,
            title: sessionForm.title.trim(),
            description: sessionForm.description.trim() || null,
            date: sessionForm.date,
            start_time: sessionForm.startTime,
            end_time: sessionForm.endTime,
            modality: sessionForm.modality,
            location_or_link: sessionForm.locationOrLink.trim(),
            max_students: sessionForm.maxStudents,
            status: 'programada',
          })

        if (error) throw error
        toast.success(t("Sesión programada exitosamente"))
      }

      setIsSessionModalOpen(false)
      await loadData()
    } catch (err) {
      console.error('Error al guardar sesión de tutoría:', err)
      toast.error('Error', err instanceof Error ? err.message : 'Error al guardar la tutoría.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenStatusModal = (session: SessionWithSubject, targetStatus: SessionStatus) => {
    setStatusModal({
      isOpen: true,
      session,
      targetStatus,
    })
  }

  const handleCloseStatusModal = () => {
    if (isUpdatingStatus) return
    setStatusModal({
      isOpen: false,
      session: null,
      targetStatus: null,
    })
  }

  const handleConfirmStatusChange = async () => {
    if (!statusModal.session || !statusModal.targetStatus) return
    const { session, targetStatus } = statusModal
    setIsUpdatingStatus(true)
    try {
      const { error } = await supabase
        .from('tutoring_sessions')
        .update({ status: targetStatus })
        .eq('id', session.id)

      if (error) throw error

      if (targetStatus === 'completada') {
        toast.success(t("Sesión completada"))
      } else if (targetStatus === 'cancelada') {
        toast.info(t("Sesión cancelada"))
      } else {
        toast.success(t("Sesión reabierta"))
      }

      handleCloseStatusModal()
      await loadData()
    } catch (err) {
      console.error('Error al cambiar estado de la sesión:', err)
      toast.error('Error', err instanceof Error ? err.message : 'Error al actualizar estado.')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleOpenDeleteModal = (session: SessionWithSubject) => {
    setDeleteModal({
      isOpen: true,
      session,
    })
  }

  const handleCloseDeleteModal = () => {
    if (isDeletingSession) return
    setDeleteModal({
      isOpen: false,
      session: null,
    })
  }

  const handleConfirmDelete = async () => {
    if (!deleteModal.session) return
    setIsDeletingSession(true)
    try {
      const { error } = await supabase
        .from('tutoring_sessions')
        .delete()
        .eq('id', deleteModal.session.id)

      if (error) throw error

      toast.info(t("Sesión eliminada"))
      handleCloseDeleteModal()
      await loadData()
    } catch (err) {
      console.error('Error al eliminar sesión:', err)
      toast.error('Error', err instanceof Error ? err.message : 'Error al eliminar la sesión.')
    } finally {
      setIsDeletingSession(false)
    }
  }

  const stats = useMemo(() => {
    let programadas = 0
    let completadas = 0
    let canceladas = 0

    sessions.forEach((s) => {
      if (s.status === 'programada' || s.status === 'en_curso') programadas++
      if (s.status === 'completada') completadas++
      if (s.status === 'cancelada') canceladas++
    })

    return {
      total: sessions.length,
      programadas,
      completadas,
      canceladas,
    }
  }, [sessions])

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (subjectFilter !== 'todas' && s.subject_id !== subjectFilter) {
        return false
      }

      if (statusFilter !== 'todas') {
        if (statusFilter === 'programada') {
          if (s.status !== 'programada' && s.status !== 'en_curso') return false
        } else if (s.status !== statusFilter) {
          return false
        }
      }

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim()
        const matchTitle = s.title.toLowerCase().includes(query)
        const matchDesc = s.description ? s.description.toLowerCase().includes(query) : false
        const matchSub = s.subjectName ? s.subjectName.toLowerCase().includes(query) : false
        const matchCode = s.subjectCode ? s.subjectCode.toLowerCase().includes(query) : false
        const matchLoc = s.location_or_link.toLowerCase().includes(query)
        if (!matchTitle && !matchDesc && !matchSub && !matchCode && !matchLoc) return false
      }

      return true
    })
  }, [sessions, subjectFilter, statusFilter, searchTerm])

  const getStatusBadge = (status: SessionStatus) => {
    switch (status) {
      case 'programada':
        return <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800 border border-blue-200">{t("Programada")}</span>
      case 'en_curso':
        return <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">{t("En curso")}</span>
      case 'completada':
        return <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800 border border-green-200">{t("Completada")}</span>
      case 'cancelada':
        return <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800 border border-red-200">{t("Cancelada")}</span>
    }
  }

  const getModalityBadge = (modality: SessionModality) => {
    switch (modality) {
      case 'virtual':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            <Video className="h-3 w-3" />
            {t("Virtual")}
          </span>
        )
      case 'presencial':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            <MapPin className="h-3 w-3" />
            {t("Presencial")}
          </span>
        )
      case 'hibrida':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            <Video className="h-3 w-3" />
            {t("Híbrida")}
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {t("Mis Tutorías Impartidas")}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {t("Agenda general y control de todas tus sesiones de tutoría en tus materias habilitadas.")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/tutor/materias"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <BookOpen className="h-4 w-4 text-gray-500" />
            {t("Mis Materias")}
          </Link>
          <Button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
          >
            <CalendarPlus className="h-4 w-4" />
            {t("Programar Tutoría")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-gray-600">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t("Total Sesiones")}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-blue-600">
          <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">{t("Tutorías Programadas")}</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{stats.programadas}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-green-600">
          <p className="text-xs font-medium text-green-600 uppercase tracking-wider">{t("Tutorías Completadas")}</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{stats.completadas}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-red-600">
          <p className="text-xs font-medium text-red-600 uppercase tracking-wider">{t("Tutorías Canceladas")}</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{stats.canceladas}</p>
        </Card>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder={t("Buscar por título, descripción o ubicación...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="md:col-span-6">
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="todas">{t("Todas las materias")}</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.customCode || s.code} - {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-xs font-medium text-gray-500 mr-2">{t("Estado:")}</span>
          <button
            type="button"
            onClick={() => setStatusFilter('todas')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
              statusFilter === 'todas'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t("Todas")} ({stats.total})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('programada')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
              statusFilter === 'programada'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            {t("Programada")} ({stats.programadas})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('completada')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
              statusFilter === 'completada'
                ? 'bg-green-600 text-white'
                : 'bg-green-50 text-green-700 hover:bg-green-100'
            }`}
          >
            {t("Completada")} ({stats.completadas})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('cancelada')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
              statusFilter === 'cancelada'
                ? 'bg-red-600 text-white'
                : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            {t("Cancelada")} ({stats.canceladas})
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-gray-500">
          Cargando agenda de tutorías...
        </div>
      ) : filteredSessions.length === 0 ? (
        <Card className="p-12 text-center">
          <Calendar className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-base font-semibold text-gray-900">
            {t("No se encontraron sesiones registradas.")}
          </h3>
          <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
            {sessions.length === 0
              ? t("Programa tu primera sesión para que los estudiantes puedan enterarse.")
              : t("No tienes sesiones que coincidan con los filtros seleccionados.")}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            {sessions.length === 0 ? (
              <Button
                onClick={handleOpenCreateModal}
                className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              >
                <CalendarPlus className="mr-2 h-4 w-4" />
                {t("Programar Tutoría")}
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearchTerm('')
                  setSubjectFilter('todas')
                  setStatusFilter('todas')
                }}
              >
                {t("Limpiar filtros")}
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSessions.map((session) => (
            <Card key={session.id} className="flex flex-col overflow-hidden border border-gray-200 hover:border-gray-300 transition-all">
              <Card.Header className="bg-gray-50/70 border-b border-gray-100 py-3 px-4 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    to={`/tutor/materias/${session.subject_id}`}
                    title={session.subjectName}
                    className="truncate max-w-[180px] rounded bg-white px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200 hover:bg-blue-50 transition-colors inline-block"
                  >
                    {session.subjectCode ? `${session.subjectCode} · ` : ''}{session.subjectName}
                  </Link>

                  <div className="flex items-center gap-1">
                    {session.status === 'programada' && (
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(session)}
                        title={t("Editar sesión")}
                        className="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-800 cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}

                    {session.status === 'programada' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenStatusModal(session, 'completada')}
                          title={t("Marcar como completada")}
                          className="rounded p-1 text-gray-500 hover:bg-green-100 hover:text-green-700 cursor-pointer"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenStatusModal(session, 'cancelada')}
                          title={t("Cancelar sesión")}
                          className="rounded p-1 text-gray-500 hover:bg-red-100 hover:text-red-700 cursor-pointer"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}

                    {session.status === 'completada' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenStatusModal(session, 'programada')}
                          title={t("Reabrir sesión")}
                          className="rounded p-1 text-gray-500 hover:bg-blue-100 hover:text-blue-700 cursor-pointer"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenStatusModal(session, 'cancelada')}
                          title={t("Cancelar sesión")}
                          className="rounded p-1 text-gray-500 hover:bg-red-100 hover:text-red-700 cursor-pointer"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}

                    {session.status === 'cancelada' && (
                      <button
                        type="button"
                        onClick={() => handleOpenStatusModal(session, 'programada')}
                        title={t("Reactivar sesión")}
                        className="rounded p-1 text-gray-500 hover:bg-blue-100 hover:text-blue-700 cursor-pointer"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenDeleteModal(session)}
                      title={t("Eliminar sesión")}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {getStatusBadge(session.status)}
                  {getModalityBadge(session.modality)}
                </div>
              </Card.Header>

              <Card.Body className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-gray-900 line-clamp-2">{session.title}</h3>
                  {session.description && (
                    <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">{session.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 border-t border-gray-100 text-xs text-gray-700">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    <span className="font-medium">{session.date}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    <span>{session.start_time.substring(0, 5)} - {session.end_time.substring(0, 5)}</span>
                  </div>

                  <div className="flex items-center gap-1.5 sm:col-span-2">
                    <Users className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    <span>{t("Cupo")}: <strong className="font-semibold text-gray-900">{session.max_students}</strong> {t("estudiantes")}</span>
                  </div>

                  <div className="flex items-center gap-1.5 sm:col-span-2 min-w-0">
                    <MapPin className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    {session.location_or_link.startsWith('http') ? (
                      <a
                        href={session.location_or_link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-700 hover:underline truncate inline-flex items-center gap-1 cursor-pointer font-medium"
                      >
                        {session.location_or_link}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    ) : (
                      <span className="truncate">{session.location_or_link}</span>
                    )}
                  </div>
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>
      )}

      {isSessionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {editingSession ? t("Editar Sesión de Tutoría") : t("Nueva Sesión de Tutoría")}
              </h3>
              <button
                type="button"
                onClick={() => setIsSessionModalOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSession} className="p-5 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  {t("Materia")} <span className="text-red-500">*</span>
                </label>
                {editingSession ? (
                  <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">
                    {subjects.find((s) => s.id === editingSession.subject_id)?.name || t("Materia")}
                  </div>
                ) : (
                  <select
                    required
                    value={sessionForm.subjectId}
                    onChange={(e) => setSessionForm({ ...sessionForm, subjectId: e.target.value })}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.customCode || s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  {t("Título de la tutoría")} <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="Ej: Repaso para Examen Parcial 1, Taller de Ejercicios..."
                  value={sessionForm.title}
                  onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  {t("Descripción o temario")}
                </label>
                <textarea
                  rows={2}
                  placeholder="Temas específicos a repasar, materiales requeridos..."
                  value={sessionForm.description}
                  onChange={(e) => setSessionForm({ ...sessionForm, description: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    {t("Fecha")} <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    required
                    min={todayStr}
                    value={sessionForm.date}
                    onChange={(e) => setSessionForm({ ...sessionForm, date: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    {t("Hora de inicio")} <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="time"
                    required
                    value={sessionForm.startTime}
                    onChange={(e) => setSessionForm({ ...sessionForm, startTime: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    {t("Hora de fin")} <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="time"
                    required
                    value={sessionForm.endTime}
                    onChange={(e) => setSessionForm({ ...sessionForm, endTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    {t("Modalidad")} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={sessionForm.modality}
                    onChange={(e) =>
                      setSessionForm({
                        ...sessionForm,
                        modality: e.target.value as SessionModality,
                      })
                    }
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="virtual">{t("Virtual")}</option>
                    <option value="presencial">{t("Presencial")}</option>
                    <option value="hibrida">{t("Híbrida")}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    {t("Cupo máximo de estudiantes")} <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={sessionForm.maxStudents}
                    onChange={(e) =>
                      setSessionForm({
                        ...sessionForm,
                        maxStudents: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  {t("Enlace de reunión o Lugar físico")} <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder={
                    sessionForm.modality === 'virtual'
                      ? 'https://meet.google.com/xyz-abcd-efg'
                      : 'Aula 204, Edificio de Ciencias...'
                  }
                  value={sessionForm.locationOrLink}
                  onChange={(e) =>
                    setSessionForm({ ...sessionForm, locationOrLink: e.target.value })
                  }
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsSessionModalOpen(false)}
                  disabled={isSubmitting}
                >
                  {t("Cancelar")}
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                >
                  {isSubmitting
                    ? t("Guardando...")
                    : editingSession
                    ? t("Guardar Sesión")
                    : t("Programar Sesión")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <SessionStatusModal
        isOpen={statusModal.isOpen}
        session={statusModal.session}
        targetStatus={statusModal.targetStatus}
        subjectLabel={
          statusModal.session?.subjectName
            ? `${statusModal.session.subjectCode ? `${statusModal.session.subjectCode} · ` : ''}${statusModal.session.subjectName}`
            : undefined
        }
        isSubmitting={isUpdatingStatus}
        onClose={handleCloseStatusModal}
        onConfirm={handleConfirmStatusChange}
      />

      <SessionDeleteModal
        isOpen={deleteModal.isOpen}
        session={deleteModal.session}
        subjectLabel={
          deleteModal.session?.subjectName
            ? `${deleteModal.session.subjectCode ? `${deleteModal.session.subjectCode} · ` : ''}${deleteModal.session.subjectName}`
            : undefined
        }
        isSubmitting={isDeletingSession}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
