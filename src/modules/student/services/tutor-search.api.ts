import { supabase } from '@/lib/supabase'
import type { TutorSearchRow, TutorSlotRow } from '@/types/database.types'

/** Extrae el mensaje de un error de Supabase/Postgres (puede no ser una instancia de Error). */
export function backendErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
    return err.message
  }
  return ''
}

export interface TutorSearchFilters {
  query?: string
  institutionId?: string
  courseId?: string
  subjectId?: string
  onlyAvailable?: boolean
  tutorId?: string
}

export interface CatalogInstitution {
  id: string
  name: string
}

export interface CatalogArea {
  id: string
  name: string
  careerName: string
}

export interface CatalogSubject {
  id: string
  name: string
  code: string
  courseId: string
}

export interface CatalogOffer {
  institutionId: string
  subjectId: string
  customCode: string | null
}

export interface SearchCatalog {
  institutions: CatalogInstitution[]
  areas: CatalogArea[]
  subjects: CatalogSubject[]
  offers: CatalogOffer[]
}

export async function searchTutors(filters: TutorSearchFilters): Promise<TutorSearchRow[]> {
  const { data, error } = await supabase.rpc('search_tutors', {
    p_query: filters.query?.trim() || null,
    p_institution_id: filters.institutionId || null,
    p_course_id: filters.courseId || null,
    p_subject_id: filters.subjectId || null,
    p_only_available: filters.onlyAvailable ?? false,
    p_tutor_id: filters.tutorId || null,
  })
  if (error) throw error
  return (data ?? []) as TutorSearchRow[]
}

export async function getTutorAvailability(
  tutorId: string,
  institutionId?: string,
  subjectId?: string,
): Promise<TutorSlotRow[]> {
  const { data, error } = await supabase.rpc('get_tutor_availability', {
    p_tutor_id: tutorId,
    p_institution_id: institutionId || null,
    p_subject_id: subjectId || null,
  })
  if (error) throw error
  return (data ?? []) as TutorSlotRow[]
}

export async function createTutoringRequest(sessionId: string, message: string): Promise<void> {
  const { error } = await supabase.rpc('create_tutoring_request', {
    p_session_id: sessionId,
    p_message: message.trim() || null,
  })
  if (error) throw error
}

export async function loadSearchCatalog(): Promise<SearchCatalog> {
  const [institutionsRes, coursesRes, subjectsRes, offersRes] = await Promise.all([
    supabase.from('institutions').select('id, name').eq('active', true).order('name'),
    supabase.from('courses').select('id, name, careers(name)').eq('active', true).order('name'),
    supabase.from('subjects').select('id, name, code, course_id').eq('active', true).order('name'),
    supabase
      .from('institution_subjects')
      .select('institution_id, subject_id, custom_code')
      .eq('active', true),
  ])

  if (institutionsRes.error) throw institutionsRes.error
  if (coursesRes.error) throw coursesRes.error
  if (subjectsRes.error) throw subjectsRes.error
  if (offersRes.error) throw offersRes.error

  return {
    institutions: (institutionsRes.data ?? []).map((row) => ({ id: row.id, name: row.name })),
    areas: (coursesRes.data ?? []).map((row) => {
      const career = row.careers as unknown as { name: string } | null
      return { id: row.id, name: row.name, careerName: career?.name ?? '' }
    }),
    subjects: (subjectsRes.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      courseId: row.course_id,
    })),
    offers: (offersRes.data ?? []).map((row) => ({
      institutionId: row.institution_id,
      subjectId: row.subject_id,
      customCode: row.custom_code,
    })),
  }
}
