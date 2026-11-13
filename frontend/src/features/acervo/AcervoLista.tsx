import { AsyncBoundary } from '@/components/ui/async-boundary'
import { EmptyState } from '@/components/ui/empty-state'
import { Pagination } from '@/components/ui/pagination'
import { AcervoCabecera, AcervoRegistro } from './AcervoRegistro'
import type { AcervoDocumental } from '@/types/acervo'
import type { PaginationMeta } from '@/types/api'

interface Props {
  registros: AcervoDocumental[]
  loading: boolean
  error: unknown
  onReintentar: () => void
  esModificable: boolean
  eliminando: boolean
  onEditar: (registro: AcervoDocumental) => void
  onEliminar: (registro: AcervoDocumental) => void
  meta?: PaginationMeta
  onPageChange: (pagina: number) => void
}

export function AcervoLista({ registros, loading, error, onReintentar, esModificable, eliminando, onEditar, onEliminar, meta, onPageChange }: Props) {
  return (
    <AsyncBoundary
      data={registros}
      loading={loading}
      error={error}
      onReintentar={onReintentar}
      vacio={registros.length === 0}
      fallbackVacio={<EmptyState titulo="Sin series documentales" descripcion="Agregue una serie desde «Nueva Serie Documental»." />}
    >
      {(filas) => (
        <div className="min-w-0 overflow-hidden rounded-xl border bg-card shadow-sm">
          <table className="w-full table-fixed border-collapse text-left text-xs">
            <AcervoCabecera />
            <tbody className="divide-y">
            {filas.map((registro) => (
              <AcervoRegistro key={registro.id} registro={registro} esModificable={esModificable} eliminando={eliminando} onEditar={onEditar} onEliminar={onEliminar} />
            ))}
            </tbody>
          </table>
          {meta && <Pagination currentPage={meta.current_page} lastPage={meta.last_page} total={meta.total} from={meta.from} to={meta.to} onPageChange={onPageChange} disabled={loading} />}
        </div>
      )}
    </AsyncBoundary>
  )
}
