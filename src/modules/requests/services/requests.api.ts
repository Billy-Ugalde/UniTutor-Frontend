import { supabase } from '@/lib/supabase'
import type { SessionModality, SessionStatus, TutoringRequestStatus } from '@/types/database.types'

export interface RequestReview {
  id: string
  rating: number
  comment: string | null
  created_at: string
}

export interface RequestRow {
  id: string
  session_id: string
  status: TutoringRequestStatus
  message: string | null
  created_at: string
  student_name: string
  tutor_name: string
  tutor_id?: string
  subject_name: string
  subject_code: string
  title: string
  session_date: string
  start_time: string
  end_time: string
  modality: SessionModality
  session_status: SessionStatus
  location_or_link: string | null
  review?: RequestReview | null
}

export async function loadRequests(asTutor: boolean): Promise<RequestRow[]> {
  const { data, error } = await supabase.rpc('get_my_tutoring_requests', { p_as_tutor: asTutor })
  if (error) throw error
  return (data ?? []) as RequestRow[]
}

export async function respondToRequest(id: string, status: 'aceptada' | 'rechazada'): Promise<void> {
  const { data, error } = await supabase.rpc('respond_tutoring_request', {
    p_request_id: id, p_status: status,
  })
  if (error) throw error
  if (!data?.success) throw new Error('No se pudo guardar la respuesta.')
}

export async function cancelRequest(id: string): Promise<void> {
  const { data, error } = await supabase.rpc('cancel_tutoring_request', {
    p_request_id: id,
  })

  if (error) {
    const code = typeof error === 'object' && 'code' in error ? error.code : undefined
    if (code === 'PGRST202' || code === '42883') {
      const { data: updated, error: updateError } = await supabase
        .from('tutoring_requests')
        .update({ status: 'cancelada' })
        .eq('id', id)
        .eq('status', 'pendiente')
        .select('id')
        .maybeSingle()

      if (updateError) throw updateError
      if (!updated) throw new Error('La solicitud ya fue respondida o cancelada.')
      return
    }
    throw error
  }

  if (!data?.success) throw new Error('No se pudo cancelar la solicitud.')
}

export async function submitReview(
  sessionId: string,
  rating: number,
  comment?: string,
): Promise<{ success: boolean; id: string; rating: number; comment: string | null }> {
  const { data, error } = await supabase.rpc('submit_tutoring_review', {
    p_session_id: sessionId,
    p_rating: rating,
    p_comment: comment || null,
  })
  if (error) throw error
  if (!data?.success) throw new Error('No se pudo guardar la calificación.')
  return data
}
