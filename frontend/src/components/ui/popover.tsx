import * as React from 'react'

import { cn } from '@/lib/utils'
import { useDismiss } from '@/hooks/use-dismiss'

type Lado = 'top' | 'bottom' | 'left' | 'right'

interface PopoverProps {
  /** Elemento disparador (botón, ícono). Se clona con el handler de apertura. */
  trigger: React.ReactElement
  children: React.ReactNode
  lado?: Lado
  className?: string
}

const posiciones: Record<Lado, string> = {
  top: 'bottom-full left-0 mb-1.5',
  bottom: 'top-full left-0 mt-1.5',
  left: 'right-full top-0 mr-1.5',
  right: 'left-full top-0 ml-1.5',
}

/**
 * Popover controlado por clic (contenido más rico que un tooltip). Se cierra al
 * clicar fuera o con Escape. Para ayuda contextual de una frase, preferir
 * `HelpTooltip`; este es para contenido interactivo.
 */
export function Popover({ trigger, children, lado = 'bottom', className }: PopoverProps) {
  const [abierto, setAbierto] = React.useState(false)
  const ref = useDismiss(abierto, () => setAbierto(false))

  const disparador = React.cloneElement(trigger, {
    onClick: (e: React.MouseEvent) => {
      ;(trigger.props as { onClick?: (e: React.MouseEvent) => void }).onClick?.(e)
      setAbierto((v) => !v)
    },
    'aria-expanded': abierto,
    'aria-haspopup': 'dialog',
  } as Record<string, unknown>)

  return (
    <span ref={ref} className="relative inline-flex">
      {disparador}
      {abierto && (
        <div
          role="dialog"
          className={cn(
            'absolute z-50 min-w-[14rem] max-w-sm rounded-md border bg-popover p-3 text-sm text-popover-foreground shadow-md',
            posiciones[lado],
            className,
          )}
        >
          {children}
        </div>
      )}
    </span>
  )
}
