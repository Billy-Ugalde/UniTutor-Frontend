import { useTranslations } from '@/i18n/useTranslations'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, CalendarClock, CalendarX2, Building2, SearchX, ArrowRight } from 'lucide-react'
import { Card } from '@/shared/components/ui/Card'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Pagination } from '@/shared/components/ui/Pagination'
import { toast } from '@/shared/store/toast.store'
import type { TutorSearchRow } from '@/types/database.types'
import { TutorAvatar } from '../components/TutorAvatar'
import {
  backendErrorMessage,
  loadSearchCatalog,
  searchTutors,
  type SearchCatalog,
} from '../services/tutor-search.api'

const PAGE_SIZE = 9
const MAX_VISIBLE_SUBJECTS = 4
const SELECT_CLASS =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-300'

export function TutorSearchPage() {
  const { t } = useTranslations()
  const [catalog, setCatalog] = useState<SearchCatalog | null>(null)
  const filtersReady = catalog !== null

  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  const [institutionId, setInstitutionId] = useState('')
  const [courseId, setCourseId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [onlyAvailable, setOnlyAvailable] = useState(false)

  const [results, setResults] = useState<TutorSearchRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const requestCounter = useRef(0)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data = await loadSearchCatalog()
        if (!cancelled) setCatalog(data)
      } catch (err) {
        console.error('Error al cargar el catálogo de búsqueda:', err)
        if (!cancelled) {
          setCatalog({ institutions: [], areas: [], subjects: [], offers: [] })
          toast.error(t("Error"), t("No fue posible cargar los filtros de búsqueda."))
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(queryInput)
      setPage(1)
    }, 350)
    return () => clearTimeout(timer)
  }, [queryInput])

  useEffect(() => {
    if (!filtersReady) return
    const requestId = ++requestCounter.current
    const run = async () => {
      setIsLoading(true)
      try {
        const rows = await searchTutors({
          query,
          institutionId,
          courseId,
          subjectId,
          onlyAvailable,
        })
        if (requestId === requestCounter.current) setResults(rows)
      } catch (err) {
        console.error('Error al buscar tutores:', err)
        if (requestId === requestCounter.current) {
          setResults([])
          const backendMessage = backendErrorMessage(err)
          toast.error(
            t("Error"),
            backendMessage ? t(backendMessage as Parameters<typeof t>[0]) : t("No fue posible buscar tutores."),
          )
        }
      } finally {
        if (requestId === requestCounter.current) setIsLoading(false)
      }
    }
    void run()
    // `t` cambia solo con el idioma; no debe relanzar la búsqueda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersReady, query, institutionId, courseId, subjectId, onlyAvailable])

  const offeredBySelectedInstitution = useMemo(() => {
    if (!catalog || !institutionId) return null
    return new Map(
      catalog.offers
        .filter((offer) => offer.institutionId === institutionId)
        .map((offer) => [offer.subjectId, offer.customCode] as const),
    )
  }, [catalog, institutionId])

  const areaOptions = useMemo(() => {
    if (!catalog) return []
    return catalog.areas.filter((area) =>
      catalog.subjects.some(
        (subject) =>
          subject.courseId === area.id &&
          (!offeredBySelectedInstitution || offeredBySelectedInstitution.has(subject.id)),
      ),
    )
  }, [catalog, offeredBySelectedInstitution])

  const subjectOptions = useMemo(() => {
    if (!catalog) return []
    return catalog.subjects
      .filter(
        (subject) =>
          (!offeredBySelectedInstitution || offeredBySelectedInstitution.has(subject.id)) &&
          (!courseId || subject.courseId === courseId),
      )
      .map((subject) => ({
        id: subject.id,
        label: `${offeredBySelectedInstitution?.get(subject.id) || subject.code} - ${subject.name}`,
      }))
  }, [catalog, offeredBySelectedInstitution, courseId])

  const hasActiveFilters = Boolean(
    queryInput.trim() || courseId || subjectId || onlyAvailable || institutionId,
  )

  const clearFilters = () => {
    setQueryInput('')
    setQuery('')
    setCourseId('')
    setSubjectId('')
    setOnlyAvailable(false)
    setInstitutionId('')
    setPage(1)
  }

  const pagedResults = useMemo(
    () => results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [results, page],
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t("Buscar Tutores")}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {t("Encuentra tutores por materia, área e institución y solicita una tutoría en sus horarios libres.")}
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            type="search"
            id="tutor-search-query"
            aria-label={t("Buscar por nombre del tutor, materia o código")}
            placeholder={t("Buscar por nombre del tutor, materia o código...")}
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <label htmlFor="tutor-search-institution" className="text-xs font-semibold uppercase tracking-wider text-gray-600">
              {t("Institución")}
            </label>
            <select
              id="tutor-search-institution"
              value={institutionId}
              onChange={(e) => {
                setInstitutionId(e.target.value)
                setCourseId('')
                setSubjectId('')
                setPage(1)
              }}
              className={SELECT_CLASS}
            >
              <option value="">{t("Todas las instituciones")}</option>
              {catalog?.institutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="tutor-search-area" className="text-xs font-semibold uppercase tracking-wider text-gray-600">
              {t("Área")}
            </label>
            <select
              id="tutor-search-area"
              value={courseId}
              onChange={(e) => {
                setCourseId(e.target.value)
                setSubjectId('')
                setPage(1)
              }}
              className={SELECT_CLASS}
            >
              <option value="">{t("Todas las áreas")}</option>
              {areaOptions.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                  {area.careerName ? ` · ${area.careerName}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="tutor-search-subject" className="text-xs font-semibold uppercase tracking-wider text-gray-600">
              {t("Materia")}
            </label>
            <select
              id="tutor-search-subject"
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value)
                setPage(1)
              }}
              className={SELECT_CLASS}
            >
              <option value="">{t("Todas las materias")}</option>
              {subjectOptions.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => {
                setOnlyAvailable(e.target.checked)
                setPage(1)
              }}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            {t("Solo tutores con horarios disponibles")}
          </label>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              {t("Limpiar filtros")}
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-3 py-16 text-sm text-gray-500" role="status">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
          {t("Buscando tutores...")}
        </div>
      ) : results.length === 0 ? (
        <Card className="p-12 text-center">
          <SearchX className="mx-auto h-12 w-12 text-gray-300" />
          <h2 className="mt-4 text-base font-semibold text-gray-900">{t("No se encontraron tutores")}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
            {t("Prueba con otros filtros o amplía la búsqueda a todas las instituciones.")}
          </p>
          {hasActiveFilters && (
            <div className="mt-6 flex justify-center">
              <Button variant="secondary" onClick={clearFilters}>
                {t("Limpiar filtros")}
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500" aria-live="polite">
            {t("Tutores encontrados: {count}", { count: results.length })}
          </p>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {pagedResults.map((tutor) => {
              const visibleSubjects = tutor.subjects.slice(0, MAX_VISIBLE_SUBJECTS)
              const hiddenCount = tutor.subjects.length - visibleSubjects.length
              const hasSlots = tutor.upcoming_slots > 0
              return (
                <Card
                  key={`${tutor.tutor_id}-${tutor.institution_id}`}
                  className="flex flex-col overflow-hidden transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-1 flex-col gap-4 p-5">
                    <div className="flex items-center gap-3">
                      <TutorAvatar
                        firstName={tutor.first_name}
                        lastName={tutor.last_name}
                        avatarUrl={tutor.avatar_url}
                        size="md"
                      />
                      <div className="min-w-0">
                        <h2 className="truncate text-base font-bold text-gray-900">
                          {`${tutor.first_name} ${tutor.last_name}`.trim()}
                        </h2>
                        <p className="flex items-center gap-1.5 truncate text-xs text-gray-500">
                          <Building2 className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                          <span className="truncate">{tutor.institution_name}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {visibleSubjects.map((subject) => (
                        <span
                          key={subject.id}
                          title={subject.course_name ?? undefined}
                          className="max-w-full truncate rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-800"
                        >
                          {subject.code} · {subject.name}
                        </span>
                      ))}
                      {hiddenCount > 0 && (
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                          {t("+{count} más", { count: hiddenCount })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/70 px-5 py-3">
                    {hasSlots ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700">
                        <CalendarClock className="h-4 w-4" />
                        {tutor.upcoming_slots === 1
                          ? t("1 horario disponible")
                          : t("{count} horarios disponibles", { count: tutor.upcoming_slots })}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500">
                        <CalendarX2 className="h-4 w-4" />
                        {t("Sin horarios disponibles")}
                      </span>
                    )}

                    <Link
                      to={`/tutores/${tutor.tutor_id}?institucion=${tutor.institution_id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 transition-colors hover:text-primary-800"
                    >
                      {t("Ver horarios")}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </Card>
              )
            })}
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200">
            <Pagination
              currentPage={page}
              totalItems={results.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </div>
        </div>
      )}
    </div>
  )
}
