import { useEffect, useState } from 'react'
import { Star, X, Calendar, Clock, BookOpen, User } from 'lucide-react'
import { useTranslations } from '@/i18n/useTranslations'
import { supabase } from '@/lib/supabase'
import { Button } from '@/shared/components/ui/Button'
import { StarRating } from '@/shared/components/StarRating'
import type { TutoringSession } from '@/types/database.types'

export interface SessionReviewDetailItem {
  id: string
  rating: number
  comment: string | null
  created_at: string
  student_name: string
  student_avatar: string | null
}

interface SessionReviewsModalProps {
  isOpen: boolean
  onClose: () => void
  session: (TutoringSession & { subjectName?: string; subjectCode?: string }) | null
}

export function SessionReviewsModal({ isOpen, onClose, session }: SessionReviewsModalProps) {
  const { t, locale } = useTranslations()
  const [reviews, setReviews] = useState<SessionReviewDetailItem[]>([])
  const [averageRating, setAverageRating] = useState<number>(0)
  const [totalReviews, setTotalReviews] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!isOpen || !session?.id) {
      setReviews([])
      setAverageRating(0)
      setTotalReviews(0)
      return
    }

    let isMounted = true
    setIsLoading(true)

    const fetchReviews = async () => {
      try {
        const { data, error } = await supabase.rpc('get_session_reviews', {
          p_session_id: session.id,
        })

        if (error) throw error

        if (isMounted && data) {
          setAverageRating(Number(data.average_rating) || 0)
          setTotalReviews(Number(data.total_reviews) || 0)
          setReviews((data.reviews ?? []) as SessionReviewDetailItem[])
        }
      } catch (err) {
        console.error('Error al cargar reseñas de la sesión:', err)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void fetchReviews()

    return () => {
      isMounted = false
    }
  }, [isOpen, session?.id])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !session) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-reviews-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl border border-gray-200 max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200">
                {session.subjectCode || t("Materia")}
              </span>
              <h2 id="session-reviews-modal-title" className="text-xl font-bold text-gray-900">
                {t("Calificaciones de la tutoría")}
              </h2>
            </div>
            <p className="mt-1 text-sm font-semibold text-gray-800 break-words">
              {session.title}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 font-medium">
              <span className="inline-flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5 text-gray-400" />
                {session.subjectName}
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                {session.date}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-gray-400" />
                {session.start_time.substring(0, 5)} - {session.end_time.substring(0, 5)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t("Cerrar")}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="my-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <Star className="h-6 w-6 fill-amber-400" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-900">
                {t("Promedio de la sesión")}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-2xl font-extrabold text-gray-900">
                  {averageRating > 0 ? averageRating.toFixed(1) : '—'}
                </span>
                <StarRating rating={averageRating} size="md" />
              </div>
            </div>
          </div>

          <div className="text-center sm:text-right">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-700">
              {t("Total de opiniones")}
            </p>
            <p className="text-xl font-bold text-gray-800 mt-0.5">
              {totalReviews} {totalReviews === 1 ? t("calificación") : t("calificaciones")}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-center text-gray-700" role="status">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
              <span className="text-sm font-medium text-gray-600">{t("Cargando calificaciones...")}</span>
            </div>
          ) : reviews.length === 0 ? (
            <div className="py-10 text-center rounded-xl border border-gray-100 bg-gray-50/70 p-6">
              <Star className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm font-semibold text-gray-800">
                {t("Sin calificaciones aún")}
              </p>
              <p className="mt-1 text-xs text-gray-700 font-medium">
                {t("Esta tutoría aún no tiene calificaciones registradas.")}
              </p>
            </div>
          ) : (
            reviews.map((rev) => (
              <div key={rev.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {rev.student_avatar ? (
                      <img
                        src={rev.student_avatar}
                        alt={rev.student_name}
                        className="h-8 w-8 rounded-full object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-primary-100 text-primary-900 font-bold flex items-center justify-center text-xs">
                        <User className="h-4 w-4 text-primary-700" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{rev.student_name}</p>
                      <p className="text-[11px] text-gray-700 font-medium">
                        {new Date(rev.created_at).toLocaleDateString(locale, {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  <StarRating rating={rev.rating} size="sm" showScore />
                </div>

                {rev.comment && (
                  <p className="mt-3 text-xs italic text-gray-700 bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                    "{rev.comment}"
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        <div className="mt-4 border-t border-gray-100 pt-3 flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            {t("Cerrar")}
          </Button>
        </div>
      </div>
    </div>
  )
}

