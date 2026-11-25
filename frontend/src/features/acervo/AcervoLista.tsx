import { AsyncBoundary } from '@/components/ui/async-boundary'
import { EmptyState } from '@/components/ui/empty-state'
import { Pagination } from '@/components/ui/pagination'
import { AcervoCabecera, AcervoRegistro } from './AcervoRegistro'
import type { AnexoAcervo } from './anexos-acervo'
import type { AcervoDocumental } from '@/types/acervo'
import type { PaginationMeta } from '@/types/api'

interface Props {
  anexo: AnexoAcervo
  registros: AcervoDocumental[]
  loading: boolean
  error: unknown
  onReintentar: () => void
  esModificable: boolean
  eliminando?: boolean
  /** Solo el Anexo 03-A (físico) edita y elimina series. */
  onEditar?: (registro: AcervoDocumental) => void
  onEliminar?: (registro: AcervoDocumental) => void
  meta?: PaginationMeta
  onPageChange: (pagina: number) => void
  descripcionVacio: string
}

export function AcervoLista({ anexo, registros, loading, error, onReintentar, esModificable, eliminando = false, onEditar, onEliminar, meta, onPageChange, descripcionVacio }: Props) {
  return (
    <AsyncBoundary
      data={registros}
      loading={loading}
      error={error}
      onReintentar={onReintentar}
      vacio={registros.length === 0}
      fallbackVacio={<EmptyState titulo="Sin series documentales" descripcion={descripcionVacio} />}
    >
      {(filas) => (
        <div className="min-w-0 overflow-hidden rounded-xl border bg-card shadow-sm">
          <table className="w-full table-fixed border-collapse text-left text-xs">
            <AcervoCabecera etiquetaCantidad={anexo.etiquetaCantidad} />
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
