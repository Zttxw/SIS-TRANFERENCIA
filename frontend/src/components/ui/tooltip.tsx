import * as React from 'react'
import { HelpCircle } from 'lucide-react'

import { cn } from '@/lib/utils'

type Lado = 'top' | 'bottom' | 'left' | 'right'

interface TooltipProps {
  /** Contenido de la burbuja. */
  content: React.ReactNode
  children: React.ReactElement
  lado?: Lado
  className?: string
}

const posiciones: Record<Lado, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
  left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
  right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
}

/**
 * Tooltip accesible que aparece al pasar el cursor o al enfocar con teclado.
 * El disparador recibe `aria-describedby`; usar con controles enfocables.
 */
export function Tooltip({ content, children, lado = 'top', className }: TooltipProps) {
  const [visible, setVisible] = React.useState(false)
  const id = React.useId()

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {React.cloneElement(children, { 'aria-describedby': visible ? id : undefined } as Record<string, unknown>)}
      {visible && (
        <span
          role="tooltip"
          id={id}
          className={cn(
            'absolute z-50 w-max max-w-xs rounded-md bg-foreground px-2.5 py-1.5 text-xs text-background shadow-md',
            'pointer-events-none',
            posiciones[lado],
            className,
          )}
        >
          {content}
        </span>
      )}
    </span>
  )
}

/**
 * Ícono de ayuda «?» que revela una explicación breve en un tooltip. Base de la
 * ayuda contextual bajo demanda (F4): un dato `hint` por campo, nunca un muro de
 * texto.
 */
export function HelpTooltip({
  children,
  lado = 'top',
  className,
}: {
  children: React.ReactNode
  lado?: Lado
  className?: string
}) {
  return (
    <Tooltip content={children} lado={lado}>
      <button
        type="button"
        aria-label="Ayuda"
        className={cn(
          'inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className,
        )}
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
    </Tooltip>
  )
}
