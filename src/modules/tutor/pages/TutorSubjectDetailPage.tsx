import { useTranslations } from '@/i18n/useTranslations'
import { useEffect, useState, useMemo, useCallback, type FormEvent } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, Clock, MapPin, Users, Video, Pencil, Trash2, CheckCircle2, XCircle, RotateCcw, X, ExternalLink, CalendarPlus } from 'lucide-react'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Card } from '@/shared/components/ui/Card'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { toast } from '@/shared/store/toast.store'
import { SessionStatusModal } from '@/modules/tutor/components/SessionStatusModal'
import { SessionDeleteModal } from '@/modules/tutor/components/SessionDeleteModal'
import { UnlinkSubjectModal } from '@/modules/tutor/components/UnlinkSubjectModal'
import type { Subject, Course, Career, TutoringSession, SessionModality, SessionStatus } from '@/types/database.types'

interface SubjectDetail {
  id: string
  name: string
  code: string
  customCode: string | null
  courseName: string
  careerName: string
  description: string | null
}

export function TutorSubjectDetailPage() {
  const { t } = useTranslations()
  const { subjectId } = useParams<{ subjectId: string }>()
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [subject, setSubject] = useState<SubjectDetail | null>(null)
  const [sessions, setSessions] = useState<TutoringSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'todas' | SessionStatus>('todas')

  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<TutoringSession | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [statusModal, setStatusModal] = useState<{
    isOpen: boolean
    session: TutoringSession | null
    targetStatus: SessionStatus | null
  }>({
    isOpen: false,
    session: null,
    targetStatus: null,
  })

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    session: TutoringSession | null
  }>({
    isOpen: false,
    session: null,
  })

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isDeletingSession, setIsDeletingSession] = useState(false)
  const [tutorSubjectId, setTutorSubjectId] = useState<string | null>(null)
  const [isUnlinkModalOpen, setIsUnlinkModalOpen] = useState(false)
  const [isUnlinkingSubject, setIsUnlinkingSubject] = useState(false)

  const todayStr = new Date().toISOString().split('T')[0]

  const [sessionForm, setSessionForm] = useState({
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
    if (!tutorId || !institutionId || !subjectId) return
    setIsLoading(true)
    try {
      const { data: tutorSubData, error: tutorSubError } = await supabase
        .from('tutor_subjects')
        .select('*')
        .eq('tutor_id', tutorId)
        .eq('subject_id', subjectId)
        .eq('institution_id', institutionId)
        .eq('active', true)
        .single()

      if (tutorSubError || !tutorSubData) {
        toast.warning('Materia no habilitada', 'No tienes esta materia habilitada en tu catálogo de tutor.')
        navigate('/tutor/materias')
        return
      }

      setTutorSubjectId(tutorSubData.id)

      const [subjectRes, instSubRes, sessionsRes] = await Promise.all([
        supabase
          .from('subjects')
          .select('*, courses(*, careers(*))')
          .eq('id', subjectId)
          .single(),
        supabase
          .from('institution_subjects')
          .select('custom_code')
          .eq('institution_id', institutionId)
          .eq('subject_id', subjectId)
          .maybeSingle(),
        supabase
          .from('tutoring_sessions')
          .select('*')
          .eq('tutor_id', tutorId)
          .eq('subject_id', subjectId)
          .eq('institution_id', institutionId)
          .order('date', { ascending: false })
          .order('start_time', { ascending: true }),
      ])

      if (subjectRes.error) throw subjectRes.error
      if (sessionsRes.error) throw sessionsRes.error

      const subData = subjectRes.data as Subject & {
        courses?: Course & { careers?: Career }
      }

      setSubject({
        id: subData.id,
        name: subData.name,
        code: subData.code,
        customCode: instSubRes.data?.custom_code ?? null,
        courseName: subData.courses?.name ?? '',
        careerName: subData.courses?.careers?.name ?? '',
        description: subData.description,
      })

      setSessions(sessionsRes.data ?? [])
    } catch (err) {
      console.error('Error al cargar detalle de materia y tutorías:', err)
      toast.error('Error', 'No fue posible cargar las sesiones de la materia.')
    } finally {
      setIsLoading(false)
    }
  }, [tutorId, institutionId, subjectId, navigate])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleOpenCreateModal = () => {
    setEditingSession(null)
    setSessionForm({
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
    if (!tutorId || !institutionId || !subjectId) return

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
            subject_id: subjectId,
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

  const handleOpenStatusModal = (session: TutoringSession, targetStatus: SessionStatus) => {
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

  const handleOpenDeleteModal = (session: TutoringSession) => {
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

  const handleConfirmUnlinkSubject = async () => {
    if (!tutorSubjectId || !tutorId || !institutionId || !subject) return
    setIsUnlinkingSubject(true)
    try {
      const { count, error: countErr } = await supabase
        .from('tutoring_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('tutor_id', tutorId)
        .eq('subject_id', subject.id)
        .eq('institution_id', institutionId)

      if (countErr) throw countErr

      if (count && count > 0) {
        toast.error(
          t("No se puede deshabilitar"),
          t("Esta materia tiene tutorías registradas en tu historial.")
        )
        setIsUnlinkModalOpen(false)
        return
      }

      const { error } = await supabase
        .from('tutor_subjects')
        .delete()
        .eq('id', tutorSubjectId)

      if (error) throw error

      toast.info(
        t("Materia deshabilitada"),
        t("Has dejado de impartir {name}.", { name: subject.name })
      )

      navigate('/tutor/materias')
    } catch (err) {
      console.error('Error al deshabilitar materia:', err)
      toast.error('Error', err instanceof Error ? err.message : 'Error al deshabilitar materia.')
    } finally {
      setIsUnlinkingSubject(false)
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
    if (statusFilter === 'todas') return sessions
    return sessions.filter((s) => s.status === statusFilter)
  }, [sessions, statusFilter])

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

  if (isLoading && !subject) {
    return <div className="py-12 text-center text-gray-500">Cargando información de la materia...</div>
  }

  if (!subject) return null

  const displayCode = subject.customCode || subject.code

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              to="/tutor/materias"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-800 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" /> {t("Volver a Mis Materias")}
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 mt-2">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200">
              {displayCode}
            </span>
            <h1 className="text-2xl font-bold text-gray-900">{subject.name}</h1>
          </div>

          <p className="text-sm text-gray-500 mt-1">
            {subject.courseName} {subject.careerName ? `• ${subject.careerName}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          <Button
            variant="danger"
            onClick={() => setIsUnlinkModalOpen(true)}
            className="flex items-center gap-1.5 cursor-pointer text-xs sm:text-sm"
          >
            <Trash2 className="h-4 w-4" />
            {t("Deshabilitar Materia")}
          </Button>
          <Button
            variant="success"
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <CalendarPlus className="h-4 w-4" />
            {t("Programar Tutoría")}
          </Button>
        </div>
      </div>

      {subject.description && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-xs text-gray-600">
          <span className="font-semibold text-gray-800">Descripción de la materia: </span>
          {subject.description}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-white p-4 border border-gray-200 shadow-xs">
          <p className="text-xs text-gray-500 font-medium">{t("Total Sesiones")}</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="rounded-lg bg-blue-50/70 p-4 border border-blue-200 shadow-xs">
          <p className="text-xs text-blue-700 font-medium">{t("Tutorías Programadas")}</p>
          <p className="text-xl font-bold text-blue-900 mt-1">{stats.programadas}</p>
        </div>
        <div className="rounded-lg bg-green-50/70 p-4 border border-green-200 shadow-xs">
          <p className="text-xs text-green-700 font-medium">{t("Tutorías Completadas")}</p>
          <p className="text-xl font-bold text-green-900 mt-1">{stats.completadas}</p>
        </div>
        <div className="rounded-lg bg-red-50/70 p-4 border border-red-200 shadow-xs">
          <p className="text-xs text-red-700 font-medium">{t("Tutorías Canceladas")}</p>
          <p className="text-xl font-bold text-red-900 mt-1">{stats.canceladas}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
        {(['todas', 'programada', 'completada', 'cancelada'] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setStatusFilter(filter)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer capitalize ${
              statusFilter === filter
                ? 'bg-primary-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {filter === 'todas' ? t("Todas") : filter}
          </button>
        ))}
      </div>

      {filteredSessions.length === 0 ? (
        <Card>
          <Card.Body>
            <div className="text-center py-12 space-y-3 max-w-md mx-auto">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700 mx-auto">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-gray-900">
                {t("No hay sesiones de tutoría programadas para esta materia.")}
              </h3>
              <p className="text-xs text-gray-500">
                {t("Programa tu primera sesión para que los estudiantes puedan enterarse.")}
              </p>
              <Button
                variant="success"
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-2 cursor-pointer mt-2"
              >
                <CalendarPlus className="h-4 w-4" />
                {t("Programar Tutoría")}
              </Button>
            </div>
          </Card.Body>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredSessions.map((session) => (
            <Card key={session.id} className="border-gray-200 shadow-xs hover:border-primary-300 transition-all">
              <Card.Header className="bg-gray-50/60 border-b border-gray-100 py-3 px-5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {getStatusBadge(session.status)}
                  {getModalityBadge(session.modality)}
                </div>
                <div className="flex items-center gap-1.5">
                  {session.status === 'programada' && (
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(session)}
                      title={t("Editar sesión")}
                      className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700 cursor-pointer"
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
                        className="rounded p-1 text-gray-400 hover:bg-green-100 hover:text-green-700 cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenStatusModal(session, 'cancelada')}
                        title={t("Cancelar sesión")}
                        className="rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-700 cursor-pointer"
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
                        className="rounded p-1 text-gray-400 hover:bg-blue-100 hover:text-blue-700 cursor-pointer"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenStatusModal(session, 'cancelada')}
                        title={t("Cancelar sesión")}
                        className="rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-700 cursor-pointer"
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
                      className="rounded p-1 text-gray-400 hover:bg-blue-100 hover:text-blue-700 cursor-pointer"
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
              </Card.Header>

              <Card.Body className="p-5 space-y-3">
                <h3 className="text-base font-bold text-gray-900">{session.title}</h3>
                {session.description && (
                  <p className="text-xs text-gray-600 leading-relaxed">{session.description}</p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-gray-100 text-xs text-gray-700">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary-600 shrink-0" />
                    <span className="font-medium">{session.date}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary-600 shrink-0" />
                    <span>{session.start_time.substring(0, 5)} - {session.end_time.substring(0, 5)}</span>
                  </div>

                  <div className="flex items-center gap-2 sm:col-span-2">
                    <Users className="h-4 w-4 text-primary-600 shrink-0" />
                    <span>{t("Cupo")}: <strong className="font-semibold text-gray-900">{session.max_students}</strong> {t("estudiantes")}</span>
                  </div>

                  <div className="flex items-center gap-2 sm:col-span-2 min-w-0">
                    <MapPin className="h-4 w-4 text-primary-600 shrink-0" />
                    {session.location_or_link.startsWith('http') ? (
                      <a
                        href={session.location_or_link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary-700 hover:underline truncate inline-flex items-center gap-1 cursor-pointer font-medium"
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
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
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
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
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
                  variant="success"
                  disabled={isSubmitting}
                  className="cursor-pointer"
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
        subjectLabel={subject ? `${displayCode} · ${subject.name}` : undefined}
        isSubmitting={isUpdatingStatus}
        onClose={handleCloseStatusModal}
        onConfirm={handleConfirmStatusChange}
      />

      <SessionDeleteModal
        isOpen={deleteModal.isOpen}
        session={deleteModal.session}
        subjectLabel={subject ? `${displayCode} · ${subject.name}` : undefined}
        isSubmitting={isDeletingSession}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
      />

      <UnlinkSubjectModal
        isOpen={isUnlinkModalOpen}
        subject={
          subject && tutorSubjectId
            ? {
                id: subject.id,
                tutorSubjectId,
                name: subject.name,
                code: subject.code,
                customCode: subject.customCode,
                courseName: subject.courseName,
                totalSessionsCount: sessions.length,
              }
            : null
        }
        isSubmitting={isUnlinkingSubject}
        onClose={() => setIsUnlinkModalOpen(false)}
        onConfirm={handleConfirmUnlinkSubject}
      />
    </div>
  )
}
