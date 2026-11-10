import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Compass, X } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { EstadoEntrega } from '@/types/transferencia'

/** Un anexo pendiente candidato a sugerencia (subconjunto de lo que ya calcula el dashboard). */
export interface AnexoPendiente {
  nombre: string
  ruta: string
  completado: boolean
}

interface QueSigueCardProps {
  estadoEntrega: EstadoEntrega
  /** El usuario puede editar/llenar (borrador/observada/subsanada). */
  esEditable: boolean
  anexos: AnexoPendiente[]
  /** Ruta del acta (Anexo 07) cuando la entrega está consolidada. */
  rutaActa?: string
  className?: string
}

interface Sugerencia {
  titulo: string
  descripcion: string
  ruta: string
  cta: string
}

/**
 * «¿Qué sigue?» contextual del dashboard (F4, plan §2.3 / §4). Deriva **una sola**
 * sugerencia prioritaria del estado real de la entrega y los anexos; es
 * descartable y no intrusiva (nada de tours). Filosofía «intuitivo, no saturado»:
 * una brújula, no un instructivo.
 */
export function QueSigueCard({
  estadoEntrega,
  esEditable,
  anexos,
  rutaActa = '/acta',
  className,
}: QueSigueCardProps) {
  const [oculto, setOculto] = useState(false)

  const sugerencia = resolverSugerencia(estadoEntrega, esEditable, anexos, rutaActa)
  if (!sugerencia || oculto) return null

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border border-info-border bg-info-soft p-4',
        className,
      )}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-info-soft text-info">
        <Compass className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-info-fg">¿Qué sigue? · {sugerencia.titulo}</p>
        <p className="mt-0.5 text-sm text-info-fg/90">{sugerencia.descripcion}</p>
        <Link
          to={sugerencia.ruta}
          className={buttonVariants({
            size: 'sm',
            className: 'mt-2.5 gap-1.5',
          })}
        >
          {sugerencia.cta}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <button
        type="button"
        aria-label="Descartar sugerencia"
        onClick={() => setOculto(true)}
        className="shrink-0 rounded p-1 text-info-fg/70 transition-colors hover:bg-info-soft hover:text-info-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

function resolverSugerencia(
  estado: EstadoEntrega,
  esEditable: boolean,
  anexos: AnexoPendiente[],
  rutaActa: string,
): Sugerencia | null {
  // Entrega devuelta con observaciones: lo urgente es subsanar.
  if (estado === 'observada') {
    return {
      titulo: 'Atienda las observaciones',
      descripcion:
        'La entrega fue devuelta para subsanación. Revise las observaciones de cada anexo, corrija y responda el sustento.',
      ruta: '/observaciones',
      cta: 'Ver observaciones',
    }
  }

  // Ya remitida / en revisión: no hay acción del emisor; no se sugiere nada.
  if (estado === 'remitida' || estado === 'en_revision' || estado === 'subsanada') {
    return null
  }

  // Consolidada: emitir el acta de cierre.
  if (estado === 'consolidada') {
    return {
      titulo: 'Emita el Acta de Transferencia',
      descripcion:
        'La entrega está consolidada. Genere el Acta (Anexo 07) para la firma y el cierre formal del proceso.',
      ruta: rutaActa,
      cta: 'Ir al Acta',
    }
  }

  // Borrador editable: señalar el primer anexo incompleto; si todo está, remitir.
  if (esEditable) {
    const pendiente = anexos.find((a) => !a.completado)
    if (pendiente) {
      return {
        titulo: `Complete ${pendiente.nombre}`,
        descripcion: `Es el siguiente anexo con información pendiente. Termínelo para avanzar hacia la remisión de la entrega.`,
        ruta: pendiente.ruta,
        cta: `Ir a ${pendiente.nombre}`,
      }
    }
    return {
      titulo: 'Remita su entrega',
      descripcion:
        'Todos los anexos tienen información registrada. Revise y remita la entrega al nivel superior para su consolidación.',
      ruta: '/entregas',
      cta: 'Ir a remitir',
    }
  }

  return null
}
