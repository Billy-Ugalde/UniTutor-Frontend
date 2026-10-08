import { useTranslations } from '@/i18n/useTranslations'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, BookOpen, Calendar, X, Trash2, CheckCircle2, ArrowRight, BookPlus } from 'lucide-react'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Card } from '@/shared/components/ui/Card'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { toast } from '@/shared/store/toast.store'
import type { Subject, InstitutionSubject } from '@/types/database.types'
import { UnlinkSubjectModal } from '../components/UnlinkSubjectModal'

interface EnabledSubjectItem {
  id: string
  tutorSubjectId: string
  name: string
  code: string
  customCode: string | null
  courseName: string
  description: string | null
  sessionsCount: number
  totalSessionsCount: number
}

interface AvailableCatalogSubject {
  id: string
  name: string
  code: string
  customCode: string | null
  courseName: string
  description: string | null
  isAlreadyEnabled: boolean
}

export function TutorSubjectsPage() {
  const { t } = useTranslations()
  const { profile } = useAuth()

  const [enabledSubjects, setEnabledSubjects] = useState<EnabledSubjectItem[]>([])
  const [availableCatalog, setAvailableCatalog] = useState<AvailableCatalogSubject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false)
  const [catalogSearchTerm, setCatalogSearchTerm] = useState('')
  const [enablingSubjectId, setEnablingSubjectId] = useState<string | null>(null)

  const [unlinkModal, setUnlinkModal] = useState<{
    isOpen: boolean
    subject: EnabledSubjectItem | null
  }>({
    isOpen: false,
    subject: null,
  })
  const [isUnlinking, setIsUnlinking] = useState(false)

  const institutionId = profile?.institution_id
  const tutorId = profile?.id

  const loadTutorSubjects = useCallback(async () => {
    if (!tutorId || !institutionId) return
    setIsLoading(true)
    try {
      const [tutorSubRes, instSubRes, subjectsRes, coursesRes, sessionsRes] = await Promise.all([
        supabase
          .from('tutor_subjects')
          .select('id, subject_id, active')
          .eq('tutor_id', tutorId)
          .eq('institution_id', institutionId)
          .eq('active', true),
        supabase
          .from('institution_subjects')
          .select('*')
          .eq('institution_id', institutionId)
          .eq('active', true),
        supabase
          .from('subjects')
          .select('*')
          .eq('active', true),
        supabase
          .from('courses')
          .select('id, name')
          .eq('active', true),
        supabase
          .from('tutoring_sessions')
          .select('id, subject_id, status')
          .eq('tutor_id', tutorId)
          .eq('institution_id', institutionId),
      ])

      if (tutorSubRes.error) throw tutorSubRes.error
      if (instSubRes.error) throw instSubRes.error
      if (subjectsRes.error) throw subjectsRes.error
      if (coursesRes.error) throw coursesRes.error
      if (sessionsRes.error) throw sessionsRes.error

      const coursesMap = new Map<string, string>()
      coursesRes.data?.forEach((c: { id: string; name: string }) => {
        coursesMap.set(c.id, c.name)
      })

      const instCodesMap = new Map<string, string | null>()
      instSubRes.data?.forEach((is: InstitutionSubject) => {
        instCodesMap.set(is.subject_id, is.custom_code)
      })

      const sessionsCountMap = new Map<string, number>()
      const totalSessionsCountMap = new Map<string, number>()
      sessionsRes.data?.forEach((s: { subject_id: string; status: string }) => {
        totalSessionsCountMap.set(s.subject_id, (totalSessionsCountMap.get(s.subject_id) ?? 0) + 1)
        if (s.status !== 'cancelada') {
          sessionsCountMap.set(s.subject_id, (sessionsCountMap.get(s.subject_id) ?? 0) + 1)
        }
      })

      const subjectsMap = new Map<string, Subject>()
      subjectsRes.data?.forEach((s: Subject) => {
        subjectsMap.set(s.id, s)
      })

      const enabledList: EnabledSubjectItem[] = []
      const enabledIds = new Set<string>()

      tutorSubRes.data?.forEach((ts: { id: string; subject_id: string }) => {
        const sub = subjectsMap.get(ts.subject_id)
        if (sub) {
          enabledIds.add(sub.id)
          enabledList.push({
            id: sub.id,
            tutorSubjectId: ts.id,
            name: sub.name,
            code: sub.code,
            customCode: instCodesMap.get(sub.id) ?? null,
            courseName: coursesMap.get(sub.course_id) ?? '',
            description: sub.description,
            sessionsCount: sessionsCountMap.get(sub.id) ?? 0,
            totalSessionsCount: totalSessionsCountMap.get(sub.id) ?? 0,
          })
        }
      })

      setEnabledSubjects(enabledList)

      const catalogList: AvailableCatalogSubject[] = []
      instSubRes.data?.forEach((is: InstitutionSubject) => {
        const sub = subjectsMap.get(is.subject_id)
        if (sub) {
          catalogList.push({
            id: sub.id,
            name: sub.name,
            code: sub.code,
            customCode: is.custom_code,
            courseName: coursesMap.get(sub.course_id) ?? '',
            description: sub.description,
            isAlreadyEnabled: enabledIds.has(sub.id),
          })
        }
      })

      setAvailableCatalog(catalogList)
    } catch (err) {
      console.error('Error al cargar materias del tutor:', err)
      toast.error('Error', 'No fue posible cargar tus materias.')
    } finally {
      setIsLoading(false)
    }
  }, [tutorId, institutionId])

  useEffect(() => {
    void loadTutorSubjects()
  }, [loadTutorSubjects])

  const handleEnableSubject = async (catalogItem: AvailableCatalogSubject) => {
    if (!tutorId || !institutionId) return
    setEnablingSubjectId(catalogItem.id)
    try {
      const { error } = await supabase.from('tutor_subjects').upsert({
        tutor_id: tutorId,
        subject_id: catalogItem.id,
        institution_id: institutionId,
        active: true,
      })

      if (error) throw error

      toast.success(
        t("Materia habilitada"),
        t("Ahora puedes programar tutorías para {name}.", { name: catalogItem.name })
      )

      await loadTutorSubjects()
    } catch (err) {
      console.error('Error al habilitar materia:', err)
      toast.error('Error', err instanceof Error ? err.message : 'Error al habilitar materia.')
    } finally {
      setEnablingSubjectId(null)
    }
  }

  const handleOpenUnlinkModal = (item: EnabledSubjectItem) => {
    setUnlinkModal({
      isOpen: true,
      subject: item,
    })
  }

  const handleCloseUnlinkModal = () => {
    if (isUnlinking) return
    setUnlinkModal({
      isOpen: false,
      subject: null,
    })
  }

  const handleConfirmUnlink = async () => {
    if (!unlinkModal.subject || !tutorId || !institutionId) return
    setIsUnlinking(true)
    try {
      const { count, error: countErr } = await supabase
        .from('tutoring_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('tutor_id', tutorId)
        .eq('subject_id', unlinkModal.subject.id)
        .eq('institution_id', institutionId)

      if (countErr) throw countErr

      if (count && count > 0) {
        toast.error(
          t("No se puede deshabilitar"),
          t("Esta materia tiene tutorías registradas en tu historial.")
        )
        handleCloseUnlinkModal()
        await loadTutorSubjects()
        return
      }

      const { error } = await supabase
        .from('tutor_subjects')
        .delete()
        .eq('id', unlinkModal.subject.tutorSubjectId)

      if (error) throw error

      toast.info(
        t("Materia deshabilitada"),
        t("Has dejado de impartir {name}.", { name: unlinkModal.subject.name })
      )

      handleCloseUnlinkModal()
      await loadTutorSubjects()
    } catch (err) {
      console.error('Error al deshabilitar materia:', err)
      toast.error('Error', err instanceof Error ? err.message : 'Error al deshabilitar materia.')
    } finally {
      setIsUnlinking(false)
    }
  }

  const filteredEnabledSubjects = useMemo(() => {
    if (!searchTerm.trim()) return enabledSubjects
    const term = searchTerm.toLowerCase().trim()
    return enabledSubjects.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.code.toLowerCase().includes(term) ||
        (s.customCode?.toLowerCase().includes(term) ?? false) ||
        s.courseName.toLowerCase().includes(term)
    )
  }, [enabledSubjects, searchTerm])

  const filteredCatalog = useMemo(() => {
    if (!catalogSearchTerm.trim()) return availableCatalog
    const term = catalogSearchTerm.toLowerCase().trim()
    return availableCatalog.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.code.toLowerCase().includes(term) ||
        (s.customCode?.toLowerCase().includes(term) ?? false) ||
        s.courseName.toLowerCase().includes(term)
    )
  }, [availableCatalog, catalogSearchTerm])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-800"
            >
              <ArrowLeft className="h-4 w-4" /> {t("Inicio")}
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            {t("Mis Materias Habilitadas")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("Materias que estás capacitado para impartir en tu institución")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="success"
            onClick={() => setIsCatalogModalOpen(true)}
            className="flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <BookPlus className="h-4 w-4" />
            {t("Habilitar / Deshabilitar Materias")}
          </Button>

          <div className="rounded-lg bg-green-50 px-3.5 py-1.5 border border-green-200">
            <span className="text-xs font-semibold uppercase text-green-700">{t("Habilitadas:")}</span>
            <span className="ml-1.5 text-base font-bold text-green-900">
              {enabledSubjects.length}
            </span>
          </div>
        </div>
      </div>

      <Card>
        <Card.Body>
          <div className="max-w-md">
            <Input
              placeholder={t("Buscar materia por nombre o código...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </Card.Body>
      </Card>

      {isLoading ? (
        <div className="py-12 text-center text-gray-500">{t("Cargando tus materias...")}</div>
      ) : filteredEnabledSubjects.length === 0 ? (
        <Card>
          <Card.Body>
            <div className="text-center py-12 space-y-4 max-w-md mx-auto">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700 mx-auto">
                <BookOpen className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                {enabledSubjects.length === 0
                  ? t("No tienes materias habilitadas todavía.")
                  : t("No se encontraron materias con ese término de búsqueda.")}
              </h3>
              <p className="text-sm text-gray-500">
                {enabledSubjects.length === 0
                  ? t("Explora el catálogo institucional y selecciona las asignaturas que deseas impartir como tutor.")
                  : t("Intenta con otro código o nombre de materia.")}
              </p>
              {enabledSubjects.length === 0 && (
                <Button
                  variant="success"
                  onClick={() => setIsCatalogModalOpen(true)}
                  className="inline-flex items-center gap-2 cursor-pointer"
                >
                  <BookPlus className="h-4 w-4" />
                  {t("Explorar Catálogo Institucional")}
                </Button>
              )}
            </div>
          </Card.Body>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEnabledSubjects.map((subject) => {
            const displayCode = subject.customCode || subject.code

            return (
              <Card
                key={subject.id}
                className="overflow-hidden border-gray-200 shadow-xs hover:border-primary-300 transition-all flex flex-col justify-between"
              >
                <Card.Header className="bg-gray-50/70 border-b border-gray-100 py-3.5 px-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200">
                      {displayCode}
                    </span>
                    <span className="text-xs text-gray-500 truncate max-w-[150px]">
                      {subject.courseName}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mt-2 truncate" title={subject.name}>
                    {subject.name}
                  </h3>
                </Card.Header>

                <Card.Body className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {subject.description || t("Sin descripción disponible para esta materia.")}
                  </p>

                  <div className="rounded-lg bg-primary-50/60 p-3 border border-primary-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-primary-800 text-xs font-medium">
                      <Calendar className="h-4 w-4 text-primary-600" />
                      <span>{t("Sesiones programadas")}:</span>
                    </div>
                    <span className="text-sm font-bold text-primary-900">
                      {subject.sessionsCount}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                    <Link
                      to={`/tutor/materias/${subject.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-700 hover:text-primary-900 hover:underline cursor-pointer"
                    >
                      {t("Ver detalles y tutorías")}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isUnlinking}
                      onClick={() => handleOpenUnlinkModal(subject)}
                      title={
                        subject.totalSessionsCount > 0
                          ? t("Materia con tutorías registradas")
                          : t("Deshabilitar materia")
                      }
                      className={`text-xs px-2.5 py-1 cursor-pointer font-medium ${
                        subject.totalSessionsCount > 0
                          ? 'text-amber-700 hover:text-amber-800 hover:bg-amber-50'
                          : 'text-red-600 hover:text-red-700 hover:bg-red-50'
                      }`}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      {t("Deshabilitar")}
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            )
          })}
        </div>
      )}

      {isCatalogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 text-green-700">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {t("Habilitar o Deshabilitar Materias del Catálogo")}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {t("Selecciona las materias activas de tu institución para habilitar o deshabilitar su impartición.")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCatalogModalOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 border-b border-gray-100">
              <Input
                placeholder={t("Buscar materia por nombre o código...")}
                value={catalogSearchTerm}
                onChange={(e) => setCatalogSearchTerm(e.target.value)}
              />
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1 divide-y divide-gray-100">
              {filteredCatalog.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-500">
                  {t("No se encontraron materias disponibles en tu institución.")}
                </div>
              ) : (
                filteredCatalog.map((item) => {
                  const displayCode = item.customCode || item.code
                  const isEnabling = enablingSubjectId === item.id

                  return (
                    <div
                      key={item.id}
                      className="pt-3 first:pt-0 flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                            {displayCode}
                          </span>
                          <h4 className="text-sm font-semibold text-gray-900 truncate">
                            {item.name}
                          </h4>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {item.courseName}
                          {item.description ? ` — ${item.description}` : ''}
                        </p>
                      </div>

                      {item.isAlreadyEnabled ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {t("Habilitada")}
                          </span>
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={isUnlinking}
                            onClick={() => {
                              const enabledItem = enabledSubjects.find((s) => s.id === item.id)
                              if (enabledItem) {
                                handleOpenUnlinkModal(enabledItem)
                              }
                            }}
                            className="cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            {t("Deshabilitar")}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="success"
                          size="sm"
                          isLoading={isEnabling}
                          onClick={() => handleEnableSubject(item)}
                          className="shrink-0 cursor-pointer"
                        >
                          <BookPlus className="h-3.5 w-3.5 mr-1" />
                          {t("Habilitar para impartir")}
                        </Button>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCatalogModalOpen(false)}
                className="cursor-pointer"
              >
                {t("Cerrar")}
              </Button>
            </div>
          </div>
        </div>
      )}

      <UnlinkSubjectModal
        isOpen={unlinkModal.isOpen}
        subject={unlinkModal.subject}
        isSubmitting={isUnlinking}
        onClose={handleCloseUnlinkModal}
        onConfirm={handleConfirmUnlink}
      />
    </div>
  )
}
