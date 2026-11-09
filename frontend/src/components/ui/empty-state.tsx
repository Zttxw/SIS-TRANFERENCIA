import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'

import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icono?: LucideIcon
  titulo: string
  /** Descripción corta que orienta a la acción correcta. */
  descripcion?: string
  /** Acción primaria accionable (botón). */
  accion?: React.ReactNode
  className?: string
}

/**
 * Estado vacío accionable: ícono + título + descripción breve + acción primaria.
 * Reemplaza los «sin registros» sueltos por un vacío que invita a la acción
 * correcta («Registrar el primer bien», «Importar desde SIGA»).
 */
export function EmptyState({
  icono: Icono = Inbox,
  titulo,
  descripcion,
  accion,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-10 text-center',
        className,
      )}
    >
      <Icono className="h-10 w-10 text-muted-foreground/50" />
      <h3 className="mt-3 text-sm font-semibold text-foreground">{titulo}</h3>
      {descripcion && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{descripcion}</p>
      )}
      {accion && <div className="mt-4">{accion}</div>}
    </div>
  )
}
