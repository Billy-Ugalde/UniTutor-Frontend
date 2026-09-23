import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './Button'

interface PaginationProps {
  currentPage: number
  totalItems: number
  pageSize?: number
  onPageChange: (page: number) => void
}

export function Pagination({
  currentPage,
  totalItems,
  pageSize = 10,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  if (totalItems === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-gray-200 bg-white px-6 py-3 text-xs text-gray-500">
      <div>
        Mostrando <span className="font-semibold text-gray-700">{startItem}</span> a{' '}
        <span className="font-semibold text-gray-700">{endItem}</span> de{' '}
        <span className="font-semibold text-gray-700">{totalItems}</span> registros
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="h-7 px-2 text-xs"
            title="Página anterior"
          >
            <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
            Anterior
          </Button>

          <div className="flex items-center gap-1 px-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              if (
                totalPages > 7 &&
                page !== 1 &&
                page !== totalPages &&
                Math.abs(page - currentPage) > 1
              ) {
                if (Math.abs(page - currentPage) === 2) {
                  return (
                    <span key={page} className="px-1 text-gray-400">
                      ...
                    </span>
                  )
                }
                return null
              }

              const isActive = page === currentPage
              return (
                <button
                  key={page}
                  type="button"
                  onClick={() => onPageChange(page)}
                  className={`h-7 min-w-7 rounded px-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-600 text-white font-semibold'
                      : 'border border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {page}
                </button>
              )
            })}
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="h-7 px-2 text-xs"
            title="Página siguiente"
          >
            Siguiente
            <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
          </Button>
        </div>
      ) : (
        <div className="text-xs text-gray-400">
          Página 1 de 1 (10 registros por página)
        </div>
      )}
    </div>
  )
}

