import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface PaginationProps {
  currentPage: number
  lastPage: number
  total: number
  from?: number
  to?: number
  onPageChange: (page: number) => void
  disabled?: boolean
}

export function Pagination({
  currentPage,
  lastPage,
  total,
  from,
  to,
  onPageChange,
  disabled = false,
}: PaginationProps) {
  if (total === 0 || lastPage <= 1) {
    if (total === 0) return null
    return (
      <div className="flex items-center justify-between px-2 py-3 text-xs text-muted-foreground border-t">
        <span>Mostrando {total} registro{total !== 1 ? 's' : ''}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-3 text-xs text-muted-foreground border-t">
      <div>
        Mostrando <span className="font-semibold text-foreground">{from ?? 1}</span> a{' '}
        <span className="font-semibold text-foreground">{to ?? total}</span> de{' '}
        <span className="font-semibold text-foreground">{total}</span> registros
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1 text-xs"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={disabled || currentPage <= 1}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Anterior
        </Button>

        <span className="px-2 font-medium text-foreground">
          Página {currentPage} de {lastPage}
        </span>

        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1 text-xs"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={disabled || currentPage >= lastPage}
        >
          Siguiente
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
