import { CheckCircle2, CircleDashed, Lock, PencilLine, Send } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import type { EstadoEntrega } from '@/types/transferencia'

interface EstadoAnexoChipProps {
  estadoEntrega?: EstadoEntrega | null
  /** El anexo admite edición (borrador/observada): matiza el borrador vacío. */
  esModificable?: boolean
}

type Estilo = {
  label: string
  icono: LucideIcon
  clases: string
}

/**
 * Chip de estado de la entrega del anexo (F3 — «el sistema guía el qué sigue»,
 * plan §3.3 / §4 F3). Traduce el `EstadoEntrega` a un indicador compacto y
 * tematizado, reutilizando los tokens semánticos de F2. Vive junto al título
 * para que el usuario vea de un vistazo si puede editar o no.
 */
export function EstadoAnexoChip({ estadoEntrega, esModificable = true }: EstadoAnexoChipProps) {
  const estilo = resolverEstilo(estadoEntrega, esModificable)
  if (!estilo) return null

  const { label, icono: Icono, clases } = estilo
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-mini font-semibold ${clases}`}
    >
      <Icono className="h-3.5 w-3.5" />
      {label}
    </span>
  )
}

function resolverEstilo(
  estado: EstadoEntrega | null | undefined,
  esModificable: boolean,
): Estilo | null {
  switch (estado) {
    case 'remitida':
      return {
        label: 'Remitida',
        icono: Send,
        clases: 'border-info-border bg-info-soft text-info-fg',
      }
    case 'en_revision':
      return {
        label: 'En revisión',
        icono: Lock,
        clases: 'border-info-border bg-info-soft text-info-fg',
      }
    case 'observada':
      return {
        label: 'Observada',
        icono: PencilLine,
        clases: 'border-warning-border bg-warning-soft text-warning-fg',
      }
    case 'subsanada':
      return {
        label: 'Subsanada',
        icono: CheckCircle2,
        clases: 'border-info-border bg-info-soft text-info-fg',
      }
    case 'consolidada':
      return {
        label: 'Consolidada',
        icono: CheckCircle2,
        clases: 'border-success-border bg-success-soft text-success-fg',
      }
    case 'borrador':
    case null:
    case undefined:
      return {
        label: esModificable ? 'En edición' : 'Borrador',
        icono: CircleDashed,
        clases: 'border-border bg-muted/40 text-muted-foreground',
      }
    default:
      return null
  }
}
