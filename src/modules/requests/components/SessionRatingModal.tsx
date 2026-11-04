import { useEffect, useState, type FormEvent } from 'react'
import { Star, X } from 'lucide-react'
import { useTranslations } from '@/i18n/useTranslations'
import { Button } from '@/shared/components/ui/Button'
import { toast } from '@/shared/store/toast.store'
import { backendErrorMessage } from '@/modules/student/services/tutor-search.api'
import { submitReview } from '../services/requests.api'

interface Props {
  isOpen: boolean
  onClose: () => void
  sessionId: string
  tutorName: string
  sessionTitle: string
  initialRating?: number
  initialComment?: string | null
  onSuccess: (review: { id: string; rating: number; comment: string | null }) => void
}

export function SessionRatingModal({
  isOpen,
  onClose,
  sessionId,
  tutorName,
  sessionTitle,
  initialRating = 0,
  initialComment = '',
  onSuccess,
}: Props) {
  const { t } = useTranslations()
  const [rating, setRating] = useState<number>(initialRating)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [comment, setComment] = useState<string>(initialComment ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setRating(initialRating)
      setHoverRating(0)
      setComment(initialComment ?? '')
      setIsSubmitting(false)
    }
  }, [isOpen, initialRating, initialComment])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSubmitting, onClose])

  if (!isOpen) return null

  const activeRating = hoverRating || rating

  const getRatingLabel = (score: number) => {
    switch (score) {
      case 5:
        return t('Excelente')
      case 4:
        return t('Muy buena')
      case 3:
        return t('Buena')
      case 2:
        return t('Regular')
      case 1:
        return t('Deficiente')
      default:
        return ''
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (rating < 1 || rating > 5) {
      toast.warning(t('Calificación requerida'), t('Selecciona una puntuación de 1 a 5 estrellas.'))
      return
    }

    setIsSubmitting(true)
    try {
      const res = await submitReview(sessionId, rating, comment.trim())
      toast.success(t('¡Gracias por tu opinión!'), t('Tu reseña ha sido registrada exitosamente.'))
      onSuccess(res)
      onClose()
    } catch (err) {
      const msg = backendErrorMessage(err)
      toast.error(t('Error al guardar la calificación'), msg ? t(msg as Parameters<typeof t>[0]) : t('Inténtalo nuevamente.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rating-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={() => {
          if (!isSubmitting) onClose()
        }}
      />

      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-gray-200">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h2 id="rating-modal-title" className="text-xl font-bold text-gray-900">
              {t('Calificar tutoría')}
            </h2>
            <p className="mt-1 text-sm text-gray-700 font-medium">
              {sessionTitle} · <span className="font-semibold text-primary-900">{tutorName}</span>
            </p>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            aria-label={t('Cerrar')}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div className="text-center space-y-2">
            <label id="stars-label" className="block text-sm font-semibold text-gray-800">
              {t('Tu calificación')}
            </label>
            <div
              role="radiogroup"
              aria-labelledby="stars-label"
              className="inline-flex items-center gap-1.5"
            >
              {[1, 2, 3, 4, 5].map((starValue) => {
                const isFilled = starValue <= activeRating
                return (
                  <button
                    key={starValue}
                    type="button"
                    role="radio"
                    aria-checked={rating === starValue}
                    aria-label={`${starValue} ${starValue === 1 ? t('estrella') : t('estrellas')}`}
                    disabled={isSubmitting}
                    onClick={() => setRating(starValue)}
                    onMouseEnter={() => setHoverRating(starValue)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="group rounded-md p-1 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-8 w-8 transition-colors ${
                        isFilled
                          ? 'fill-amber-400 text-amber-500'
                          : 'text-gray-300 group-hover:text-amber-300'
                      }`}
                    />
                  </button>
                )
              })}
            </div>
            <p className="h-5 text-sm font-semibold text-primary-900" aria-live="polite">
              {getRatingLabel(activeRating)}
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="review-comment" className="text-sm font-semibold text-gray-800">
                {t('Comentario sobre la tutoría')}
              </label>
              <span className="text-xs text-gray-700 font-medium">
                {t('{count}/500 caracteres', { count: comment.length })}
              </span>
            </div>
            <textarea
              id="review-comment"
              rows={4}
              maxLength={500}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('Escribe tu experiencia con el tutor (opcional)...')}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-gray-300 p-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-700 font-medium">
              {t('Cuéntanos tu experiencia para orientar a otros estudiantes')}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 pt-4">
            <Button
              type="button"
              variant="secondary"
              disabled={isSubmitting}
              onClick={onClose}
            >
              {t('Cancelar')}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || rating === 0}
              isLoading={isSubmitting}
            >
              {t('Enviar calificación')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

