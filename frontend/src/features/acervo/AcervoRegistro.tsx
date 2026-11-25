import { Fragment, useState } from 'react'
import { ChevronDown, Pencil, Trash2 } from 'lucide-react'

import { Can } from '@/auth/Can'
import { UsuarioRegistro } from '@/components/anexos/UsuarioRegistro'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { DocumentosSgdPanel } from './DocumentosSgdPanel'
import type { AcervoDocumental } from '@/types/acervo'

interface Props {
  registro: AcervoDocumental
  esModificable: boolean
  eliminando?: boolean
  /** Solo las series físicas (Anexo 03-A) se editan y eliminan. */
  onEditar?: (registro: AcervoDocumental) => void
  onEliminar?: (registro: AcervoDocumental) => void
}

const COLUMNAS = 7

interface CabeceraProps {
  /** Rótulo de la columna de volumen: folios (03-A) o documentos (03-B). */
  etiquetaCantidad: string
}

export function AcervoCabecera({ etiquetaCantidad }: CabeceraProps) {
  return (
    <thead className="border-b bg-muted/40 text-left text-xs font-medium text-muted-foreground">
      <tr>
        <th className="p-3">Serie documental</th>
        <th className="hidden w-16 p-3 sm:table-cell">Año</th>
        <th className="w-24 p-3 text-right">{etiquetaCantidad}</th>
        <th className="hidden w-[18%] p-3 md:table-cell">Tipo de unidad</th>
        <th className="hidden w-[20%] p-3 lg:table-cell">Ubicación</th>
        <th className="hidden w-[16%] p-3 xl:table-cell">Registrado por</th>
        <th className="w-28 p-3 text-right sm:w-36">Acción</th>
      </tr>
    </thead>
  )
}

/**
 * Fila del acervo. Las series del SGD (Anexo 03-B) son de solo lectura y
 * despliegan sus documentos en vivo; las físicas (Anexo 03-A) se editan.
 */
export function AcervoRegistro({ registro, esModificable, eliminando, onEditar, onEliminar }: Props) {
  const [abierto, setAbierto] = useState(false)
  const delSgd = registro.fuente === 'sgd'
  const detalleId = `acervo-detalle-${registro.id}`
  const cantidad = delSgd ? registro.numero_documentos : registro.folios

  return (
    <Fragment>
      <tr className={cn('align-top transition-colors', abierto ? 'bg-muted/30' : 'hover:bg-muted/20')}>
        <td className="p-3 [overflow-wrap:anywhere]">
          {delSgd ? (
            <button type="button" className="text-left text-xs font-medium text-foreground hover:text-primary" onClick={() => setAbierto(!abierto)} aria-expanded={abierto} aria-controls={detalleId}>
              {registro.serie_documental}
            </button>
          ) : (
            <span className="text-xs font-medium text-foreground">{registro.serie_documental}</span>
          )}
          <p className="mt-1 text-mini text-muted-foreground sm:hidden">{registro.anio ?? 'Sin año'}</p>
        </td>
        <td className="hidden p-3 text-xs text-muted-foreground sm:table-cell">{registro.anio ?? '—'}</td>
        <td className="p-3 text-right text-xs">
          <span className="font-mono font-medium text-muted-foreground">{cantidad ?? '—'}</span>
          <span className="block text-mini text-muted-foreground">{delSgd ? 'documentos' : 'folios'}</span>
        </td>
        <td className="hidden p-3 text-xs text-muted-foreground [overflow-wrap:anywhere] md:table-cell">{registro.unidad_conservacion}</td>
        <td className="hidden p-3 text-xs text-muted-foreground [overflow-wrap:anywhere] lg:table-cell">{registro.ubicacion || '—'}</td>
        <td className="hidden p-3 [overflow-wrap:anywhere] xl:table-cell">
          <UsuarioRegistro usuario={registro.registrado_por} fecha={registro.created_at} fuente={registro.fuente} />
        </td>
        <td className="p-3">
          <div className="flex items-center justify-end gap-1">
            {delSgd ? (
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => setAbierto(!abierto)} aria-expanded={abierto} aria-controls={detalleId} aria-label={abierto ? 'Ocultar documentos' : 'Ver documentos'}>
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', abierto && 'rotate-180')} />
              </Button>
            ) : onEditar && onEliminar && (
              <Can permiso="anexos.registrar">
                <Button type="button" size="sm" className="h-8 gap-1.5 border border-primary bg-primary px-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover sm:px-3" disabled={!esModificable} onClick={() => onEditar(registro)} aria-label={`Editar ${registro.serie_documental}`}>
                  <Pencil className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Editar</span>
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" disabled={!esModificable || eliminando} onClick={() => onEliminar(registro)} aria-label={`Eliminar ${registro.serie_documental}`}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </Can>
            )}
          </div>
        </td>
      </tr>
      {delSgd && abierto && (
        <tr id={detalleId} className="border-b bg-muted/20">
          <td colSpan={COLUMNAS} className="p-0">
            <DocumentosSgdPanel acervoId={registro.id} serie={registro.serie_documental} />
          </td>
        </tr>
      )}
    </Fragment>
  )
}
