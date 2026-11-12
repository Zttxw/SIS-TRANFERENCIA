import { useState, type ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronDown } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { DocumentoFirmaDetalle } from '@/features/firmaperu/DocumentoFirmaDetalle'
import { MiniEstadoFirma } from '@/features/firmaperu/MiniEstadoFirma'
import type { TipoDocumentoFirma } from '@/features/firmaperu/firmaperu.types'
import { cn } from '@/lib/utils'

export interface FilaAnexo {
  id: string
  tipoFirma?: TipoDocumentoFirma
  codigo: string
  nombre: string
  icono: ComponentType<{ className?: string }>
  fuente: string
  resumen: string
  detalle: string
  ruta: string
  accion: string
  estado: string
  completado: boolean
  esPatrimonio?: boolean
  avance?: number
}

interface Props {
  filas: FilaAnexo[]
  dependenciaId: number
  /** `true` cuando la entrega está consolidada (habilita la firma del acta). */
  entregaConsolidada: boolean
}

// Paleta de badges por estado de LLENADO del anexo (independiente del PDF/firma).
// Disponible=azul · Completado/Verificado=verde · Registrado=turquesa ·
// Pendiente=ámbar · Sin registros/Bloqueado=gris.
function clasesEstado(estado: string): string {
  const e = estado.toLowerCase()
  if (e.includes('completado') || e.includes('verificado') || e.includes('consolidada')) {
    return 'border-success-border bg-success-soft text-success-fg'
  }
  if (e.includes('registrado')) {
    return 'border-[color:var(--secondary)]/30 bg-[color:var(--secondary)]/10 text-[color:var(--secondary)]'
  }
  if (e.includes('disponible')) {
    return 'border-info-border bg-info-soft text-info-fg'
  }
  if (e.includes('pendiente') || e.includes('borrador')) {
    return 'border-warning-border bg-warning-soft text-warning-fg'
  }
  return 'border-border bg-muted text-muted-foreground'
}

// Fuentes: color sobrio y consistente, sin competir con la tabla.
function clasesFuente(fuente: string): string {
  const f = fuente.toLowerCase()
  if (f.includes('siga')) return 'bg-success-soft text-success-fg border-success-border'
  if (f.includes('sgd') || f.includes('rof')) return 'bg-info-soft text-info-fg border-info-border'
  if (f.includes('sistema') || f.includes('consolidado')) return 'bg-primary/10 text-primary border-primary/25'
  return 'bg-muted text-muted-foreground border-border'
}

export function TablaAnexos({ filas, dependenciaId, entregaConsolidada }: Props) {
  const [expandida, setExpandida] = useState<string | null>(null)

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Cabecera de la tabla (solo escritorio) */}
      <div className="hidden grid-cols-[2.5rem_minmax(0,1fr)_7.5rem_6rem_minmax(0,1fr)_7rem] items-center gap-3 border-b border-border bg-muted/40 px-4 py-2.5 text-mini font-semibold uppercase tracking-wider text-muted-foreground sm:grid">
        <span className="text-center">N.º</span>
        <span>Anexo</span>
        <span>Estado</span>
        <span>Fuente</span>
        <span>Información</span>
        <span className="text-right">Acciones</span>
      </div>

      <ul className="divide-y divide-border">
        {filas.map((anexo, indice) => {
          const Icono = anexo.icono
          const abierta = expandida === anexo.id
          const puedeExpandir = Boolean(anexo.tipoFirma)

          return (
            <li key={anexo.id} className={cn('transition-colors', abierta ? 'bg-muted/30' : 'hover:bg-muted/20')}>
              {/* ---- Fila principal ---- */}
              <div
                className={cn(
                  'grid items-center gap-3 px-4 py-3',
                  'grid-cols-[2.5rem_1fr] sm:grid-cols-[2.5rem_minmax(0,1fr)_7.5rem_6rem_minmax(0,1fr)_7rem]',
                  puedeExpandir && 'cursor-pointer',
                )}
                onClick={puedeExpandir ? () => setExpandida(abierta ? null : anexo.id) : undefined}
              >
                {/* N.º */}
                <span className="text-center text-sm font-mono font-semibold text-muted-foreground">
                  {String(indice + 1).padStart(2, '0')}
                </span>

                {/* Anexo: icono + nombre + descripción */}
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icono className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{anexo.nombre}</p>
                    <div className="flex items-center gap-2">
                      <p className="truncate text-nota text-muted-foreground">{anexo.detalle}</p>
                      {anexo.tipoFirma && (
                        <MiniEstadoFirma tipoDocumento={anexo.tipoFirma} dependenciaId={dependenciaId} />
                      )}
                    </div>
                  </div>
                </div>

                {/* Estado (llenado) */}
                <div className="hidden sm:block">
                  <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-mini font-semibold', clasesEstado(anexo.estado))}>
                    {anexo.estado}
                  </span>
                </div>

                {/* Fuente */}
                <div className="hidden sm:block">
                  <span className={cn('inline-block rounded border px-2 py-0.5 font-mono text-mini font-semibold', clasesFuente(anexo.fuente))}>
                    {anexo.fuente}
                  </span>
                </div>

                {/* Información + barra de avance patrimonio */}
                <div className="hidden min-w-0 sm:block">
                  <p className="truncate text-xs text-foreground">{anexo.resumen}</p>
                  {anexo.esPatrimonio && typeof anexo.avance === 'number' && (
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-success transition-all" style={{ width: `${anexo.avance}%` }} />
                      </div>
                      <span className="font-mono text-mini font-bold text-success-fg">{anexo.avance}%</span>
                    </div>
                  )}
                </div>

                {/* Acción principal (única) + chevron para expandir documento */}
                <div className="col-start-2 flex items-center justify-end gap-1 sm:col-start-auto" onClick={(e) => e.stopPropagation()}>
                  <Link
                    to={anexo.ruta}
                    className={buttonVariants({
                      variant: 'outline',
                      size: 'sm',
                      className: 'h-7 gap-1 border-primary/30 px-2.5 text-xs font-medium text-primary hover:bg-primary/10',
                    })}
                  >
                    <span>{anexo.accion}</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                  {puedeExpandir && (
                    <button
                      type="button"
                      aria-label={abierta ? 'Ocultar documento' : 'Ver documento'}
                      aria-expanded={abierta}
                      onClick={() => setExpandida(abierta ? null : anexo.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <ChevronDown className={cn('h-4 w-4 transition-transform', abierta && 'rotate-180')} />
                    </button>
                  )}
                </div>

                {/* En móvil: estado + mini-pastilla debajo del nombre */}
                <div className="col-start-2 flex flex-wrap items-center gap-1.5 sm:hidden">
                  <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-mini font-semibold', clasesEstado(anexo.estado))}>
                    {anexo.estado}
                  </span>
                  <span className={cn('inline-block rounded border px-1.5 py-0.5 font-mono text-mini font-semibold', clasesFuente(anexo.fuente))}>
                    {anexo.fuente}
                  </span>
                </div>
              </div>

              {/* ---- Detalle expandible: documento + firma ---- */}
              {abierta && anexo.tipoFirma && (
                <div className="border-t border-border bg-muted/20 px-4 py-3 sm:pl-[3.75rem]">
                  <DocumentoFirmaDetalle
                    tipoDocumento={anexo.tipoFirma}
                    dependenciaId={dependenciaId}
                    bloqueado={anexo.tipoFirma === 'anexo07' && !entregaConsolidada}
                    notaBloqueo="El acta se firma una vez consolidada la entrega."
                  />
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
