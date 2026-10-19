import { useTranslations } from '@/i18n/useTranslations'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  CalendarX2,
  CheckCircle2,
  Clock,
  Hourglass,
  MapPin,
  UserX,
  Users,
  Video,
} from 'lucide-react'
import { Card } from '@/shared/components/ui/Card'
import { Button } from '@/shared/components/ui/Button'
import { toast } from '@/shared/store/toast.store'
import type { TutorSearchRow, TutorSlotRow } from '@/types/database.types'
import { AvailabilityCalendar } from '../components/AvailabilityCalendar'
import { TutorAvatar } from '../components/TutorAvatar'
import { TutoringRequestModal } from '../components/TutoringRequestModal'
import { getTutorAvailability, searchTutors } from '../services/tutor-search.api'
import { formatTime, parseISODate } from '../utils/date-utils'

/** La disponibilidad se refresca sola para reflejar cupos tomados por otros estudiantes. */
const REFRESH_INTERVAL_MS = 30_000

export function TutorProfilePage() {
  const { t, locale } = useTranslations()
  const { tutorId } = useParams<{ tutorId: string }>()
  const [searchParams] = useSearchParams()
  const institutionId = searchParams.get('institucion') ?? undefined

  const [tutor, setTutor] = useState<TutorSearchRow | null>(null)
  const [slots, setSlots] = useState<TutorSlotRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [subjectFilter, setSubjectFilter] = useState('')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [requestSlot, setRequestSlot] = useState<TutorSlotRow | null>(null)

  const loadSlots = useCallback(async () => {
    if (!tutorId) return
    const rows = await getTutorAvailability(tutorId, institutionId)
    setSlots(rows)
  }, [tutorId, institutionId])

  useEffect(() => {
    if (!tutorId) return
    let cancelled = false
    const load = async () => {
      setIsLoading(true)
      try {
        const [tutors, rows] = await Promise.all([
          searchTutors({ tutorId, institutionId }),
          getTutorAvailability(tutorId, institutionId),
        ])
        if (cancelled) return
        if (tutors.length === 0) {
          setNotFound(true)
          return
        }
        setTutor(tutors[0])
        setSlots(rows)
      } catch (err) {
        console.error('Error al cargar el perfil del tutor:', err)
        if (!cancelled) {
          setNotFound(true)
          toast.error(t("Error"), t("No fue posible cargar los horarios del tutor."))
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
    // `t` solo cambia con el idioma; no debe recargar el perfil.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorId, institutionId])

  // Refresco periódico y al volver a la pestaña.
  useEffect(() => {
    if (!tutor) return
    const refresh = () => {
      if (document.visibilityState === 'visible') void loadSlots().catch(() => undefined)
    }
    const interval = setInterval(refresh, REFRESH_INTERVAL_MS)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [tutor, loadSlots])

  const visibleSlots = useMemo(
    () => (subjectFilter ? slots.filter((slot) => slot.subject_id === subjectFilter) : slots),
    [slots, subjectFilter],
  )

  // Si el día elegido ya no tiene horarios, se elige el primero disponible.
  useEffect(() => {
    if (visibleSlots.length === 0) {
      setSelectedDate(null)
      return
    }
    if (!selectedDate || !visibleSlots.some((slot) => slot.session_date === selectedDate)) {
      const firstFree = visibleSlots.find((slot) => slot.available_spots > 0 && !slot.my_request_status)
      setSelectedDate((firstFree ?? visibleSlots[0]).session_date)
    }
  }, [visibleSlots, selectedDate])

  const slotsOfSelectedDay = useMemo(
    () => visibleSlots.filter((slot) => slot.session_date === selectedDate),
    [visibleSlots, selectedDate],
  )

  const tutorName = tutor ? `${tutor.first_name} ${tutor.last_name}`.trim() : ''

  const handleRequestDone = async () => {
    setRequestSlot(null)
    try {
      await loadSlots()
    } catch (err) {
      console.error('Error al recargar la disponibilidad:', err)
    }
  }

  const renderModality = (modality: TutorSlotRow['modality']) => {
    if (modality === 'presencial') {
      return (
        <span className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
          <MapPin className="h-3 w-3" />
          {t("Presencial")}
        </span>
      )
    }
    return (
      <span
        className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium ${
          modality === 'virtual'
            ? 'border-blue-200 bg-blue-50 text-blue-700'
            : 'border-amber-200 bg-amber-50 text-amber-700'
        }`}
      >
        <Video className="h-3 w-3" />
        {modality === 'virtual' ? t("Virtual") : t("Híbrida")}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-3 py-24 text-sm text-gray-500" role="status">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        {t("Cargando horarios del tutor...")}
      </div>
    )
  }

  if (notFound || !tutor) {
    return (
      <Card className="mx-auto max-w-lg p-12 text-center">
        <UserX className="mx-auto h-12 w-12 text-gray-300" />
        <h1 className="mt-4 text-base font-semibold text-gray-900">{t("No encontramos a este tutor")}</h1>
        <p className="mt-2 text-sm text-gray-500">
          {t("Es posible que ya no esté disponible o que el enlace sea incorrecto.")}
        </p>
        <Link
          to="/tutores"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:text-primary-800"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("Volver a la búsqueda")}
        </Link>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Link
        to="/tutores"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-primary-700"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("Volver a la búsqueda")}
      </Link>

      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <TutorAvatar
            firstName={tutor.first_name}
            lastName={tutor.last_name}
            avatarUrl={tutor.avatar_url}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{tutorName}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
              <Building2 className="h-4 w-4 text-gray-400" />
              {tutor.institution_name}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tutor.subjects.map((subject) => (
                <span
                  key={subject.id}
                  title={subject.course_name ?? undefined}
                  className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-800"
                >
                  {subject.code} · {subject.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{t("Horarios disponibles")}</h2>
          <p className="text-sm text-gray-500">
            {t("Elige un día del calendario y selecciona el horario que prefieras.")}
          </p>
        </div>

        {tutor.subjects.length > 1 && (
          <div className="w-full sm:w-64">
            <label htmlFor="profile-subject-filter" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600">
              {t("Materia")}
            </label>
            <select
              id="profile-subject-filter"
              value={subjectFilter}
              onChange={(event) => setSubjectFilter(event.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-300"
            >
              <option value="">{t("Todas las materias")}</option>
              {tutor.subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.code} - {subject.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {visibleSlots.length === 0 ? (
        <Card className="p-12 text-center">
          <CalendarX2 className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-base font-semibold text-gray-900">
            {t("Este tutor no tiene horarios disponibles")}
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
            {t("Vuelve a revisar más tarde o busca otro tutor para la misma materia.")}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <AvailabilityCalendar
              slots={visibleSlots}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          </div>

          <div className="space-y-3 lg:col-span-3">
            {selectedDate && (
              <h3 className="text-sm font-semibold capitalize text-gray-700">
                {parseISODate(selectedDate).toLocaleDateString(locale, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </h3>
            )}

            {slotsOfSelectedDay.map((slot) => {
              const isFull = slot.available_spots <= 0
              return (
                <Card key={slot.session_id} className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-base font-bold text-gray-900">
                          <Clock className="h-4 w-4 text-primary-600" />
                          {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                        </span>
                        {renderModality(slot.modality)}
                      </div>
                      <p className="truncate text-sm font-medium text-gray-800">{slot.title}</p>
                      <p className="truncate text-xs text-gray-500">
                        {slot.subject_code} · {slot.subject_name}
                      </p>
                      {slot.description && (
                        <p className="line-clamp-2 text-xs text-gray-500">{slot.description}</p>
                      )}
                      <p className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                        <Users className="h-3.5 w-3.5 text-gray-400" />
                        {slot.available_spots === 1
                          ? t("1 cupo disponible")
                          : t("{count} cupos disponibles", { count: Math.max(slot.available_spots, 0) })}
                      </p>
                    </div>

                    <div className="shrink-0">
                      {slot.my_request_status === 'pendiente' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                          <Hourglass className="h-4 w-4" />
                          {t("Solicitud pendiente")}
                        </span>
                      ) : slot.my_request_status === 'aceptada' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-800">
                          <CheckCircle2 className="h-4 w-4" />
                          {t("Solicitud aceptada")}
                        </span>
                      ) : isFull ? (
                        <span className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500">
                          {t("Sin cupos")}
                        </span>
                      ) : (
                        <Button onClick={() => setRequestSlot(slot)}>{t("Solicitar tutoría")}</Button>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {requestSlot && (
        <TutoringRequestModal
          slot={requestSlot}
          tutorName={tutorName}
          onClose={() => setRequestSlot(null)}
          onDone={handleRequestDone}
        />
      )}
    </div>
  )
}
