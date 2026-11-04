import { Star } from 'lucide-react'

interface StarRatingProps {
  rating: number
  maxStars?: number
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showScore?: boolean
  className?: string
}

const sizeClasses = {
  xs: 'h-3.5 w-3.5',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-7 w-7',
}

export function StarRating({
  rating,
  maxStars = 5,
  size = 'sm',
  showScore = false,
  className = '',
}: StarRatingProps) {
  const iconSize = sizeClasses[size]
  const roundedRating = Math.round(rating * 2) / 2

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <div
        className="inline-flex items-center gap-0.5"
        role="img"
        aria-label={`${rating} de ${maxStars} estrellas`}
      >
        {Array.from({ length: maxStars }, (_, i) => {
          const starValue = i + 1
          const isFull = roundedRating >= starValue
          const isHalf = !isFull && roundedRating >= starValue - 0.5

          return (
            <div key={starValue} className="relative inline-flex items-center justify-center">
              <Star className={`${iconSize} text-gray-300`} />
              {isFull && (
                <Star className={`${iconSize} fill-amber-400 text-amber-500 absolute inset-0`} />
              )}
              {isHalf && (
                <div className="absolute inset-0 overflow-hidden w-1/2">
                  <Star className={`${iconSize} fill-amber-400 text-amber-500`} />
                </div>
              )}
            </div>
          )
        })}
      </div>
      {showScore && (
        <span className="text-xs font-bold text-gray-800">
          {rating % 1 === 0 ? rating.toFixed(0) : rating.toFixed(1)}/{maxStars}
        </span>
      )}
    </div>
  )
}

