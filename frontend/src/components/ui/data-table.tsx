import * as React from 'react'

import { cn } from '@/lib/utils'
import { AsyncBoundary } from './async-boundary'
import { EmptyState } from './empty-state'
import { Pagination } from './pagination'
import type { PaginationMeta } from '@/types/api'

export interface ColumnaTabla<T> {
  /** Clave estable de la columna. */
  id: string
  /** Encabezado. */
  header: React.ReactNode
  /** Render de celda. */
  cell: (fila: T, indice: number) => React.ReactNode
  /** Alineación del contenido. */
  align?: 'left' | 'center' | 'right'
  /** Clase extra para la celda (ancho, etc.). */
  className?: string
  /** Oculta la columna en móvil. */
  ocultarEnMovil?: boolean
}

interface DataTableProps<T> {
  columnas: ColumnaTabla<T>[]
  filas: T[] | undefined
  /** Clave única por fila. */
  rowKey: (fila: T) => string | number
  loading?: boolean
  error?: unknown
  onReintentar?: () => void
  /** Estado vacío accionable. */
  vacio?: { titulo: string; descripcion?: string; accion?: React.ReactNode }
  /** Metadatos de paginación server-side; omitir para no paginar. */
  meta?: PaginationMeta
  onPageChange?: (page: number) => void
  /** Click de fila (opcional). */
  onRowClick?: (fila: T) => void
  className?: string
}

/**
 * Tabla genérica tipada con estados de carga/vacío/error integrados
 * (`AsyncBoundary` + `EmptyState`), scroll horizontal controlado y paginación
 * opcional conectada a la `<Pagination>` existente. Las páginas pasan columnas y
 * datos; dejan de reimplementar el markup de tabla.
 */
export function DataTable<T>({
  columnas,
  filas,
  rowKey,
  loading = false,
  error,
  onReintentar,
  vacio,
  meta,
  onPageChange,
  onRowClick,
  className,
}: DataTableProps<T>) {
  const alinear = (a?: 'left' | 'center' | 'right') =>
    a === 'center' ? 'text-center' : a === 'right' ? 'text-right' : 'text-left'

  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      <AsyncBoundary
        loading={loading}
        error={error}
        data={filas}
        vacio={filas?.length === 0}
        onReintentar={onReintentar}
        fallbackVacio={
          vacio ? (
            <EmptyState
              titulo={vacio.titulo}
              descripcion={vacio.descripcion}
              accion={vacio.accion}
              className="border-0"
            />
          ) : undefined
        }
      >
        {(datos) => (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {columnas.map((col) => (
                      <th
                        key={col.id}
                        className={cn(
                          'px-3 py-2.5 font-medium',
                          alinear(col.align),
                          col.ocultarEnMovil && 'hidden sm:table-cell',
                          col.className,
                        )}
                      >
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {datos.map((fila, i) => (
                    <tr
                      key={rowKey(fila)}
                      onClick={onRowClick ? () => onRowClick(fila) : undefined}
                      className={cn(
                        'border-b border-border/50 transition-colors last:border-0',
                        onRowClick && 'cursor-pointer hover:bg-muted/40',
                      )}
                    >
                      {columnas.map((col) => (
                        <td
                          key={col.id}
                          className={cn(
                            'px-3 py-2.5 align-middle',
                            alinear(col.align),
                            col.ocultarEnMovil && 'hidden sm:table-cell',
                            col.className,
                          )}
                        >
                          {col.cell(fila, i)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {meta && onPageChange && (
              <Pagination
                currentPage={meta.current_page}
                lastPage={meta.last_page}
                total={meta.total}
                from={meta.from}
                to={meta.to}
                onPageChange={onPageChange}
                disabled={loading}
              />
            )}
          </>
        )}
      </AsyncBoundary>
    </div>
  )
}
