import type { ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
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

export function TablaAnexos({ filas, dependenciaId }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Cabecera de la tabla (solo escritorio) */}
      <div className="hidden grid-cols-[2.5rem_minmax(0,1fr)_7.5rem_minmax(0,1fr)_10rem] items-center gap-3 rounded-t-xl border-b border-border bg-muted/40 px-4 py-2.5 text-mini font-semibold uppercase tracking-wider text-muted-foreground sm:grid">
        <span className="text-center">N.º</span>
        <span>Anexo</span>
        <span>Estado</span>
        <span>Información</span>
        <span className="text-right">Acciones</span>
      </div>

      <ul className="divide-y divide-border">
        {filas.map((anexo, indice) => {
          const Icono = anexo.icono

          return (
            <li key={anexo.id} className="transition-colors hover:bg-muted/20">
              {/* ---- Fila principal ---- */}
              <div
                className="grid items-center gap-3 px-4 py-3 grid-cols-[2.5rem_1fr] sm:grid-cols-[2.5rem_minmax(0,1fr)_7.5rem_minmax(0,1fr)_10rem]"
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
                  <span className={cn('inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] leading-tight font-medium', clasesEstado(anexo.estado))}>
                    {anexo.estado}
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

                {/* Acceso al registro del anexo. Los documentos se gestionan en PDF y firma. */}
                <div className="col-start-2 flex flex-wrap items-center justify-end gap-1 sm:col-start-auto">
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
                </div>

                {/* En móvil: estado + mini-pastilla debajo del nombre */}
                <div className="col-start-2 flex flex-wrap items-center gap-1.5 sm:hidden">
                  <span className={cn('inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] leading-tight font-medium', clasesEstado(anexo.estado))}>
                    {anexo.estado}
                  </span>
                </div>
              </div>

            </li>
          )
        })}
      </ul>
    </div>
  )
}
