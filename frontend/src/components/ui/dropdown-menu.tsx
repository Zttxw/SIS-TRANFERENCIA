import * as React from 'react'

import { cn } from '@/lib/utils'
import { useDismiss } from '@/hooks/use-dismiss'

type Alineacion = 'start' | 'end'

interface DropdownMenuContextValue {
  cerrar: () => void
  registrar: (el: HTMLButtonElement | null) => void
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null)

const alineaciones: Record<Alineacion, string> = {
  start: 'left-0',
  end: 'right-0',
}

interface DropdownMenuProps {
  /**
   * Elemento disparador (botón, ícono). Se clona con el handler de apertura y
   * los atributos ARIA (`aria-haspopup="menu"`, `aria-expanded`).
   */
  trigger: React.ReactElement
  children: React.ReactNode
  /** Borde por el que se alinea el panel respecto al disparador. */
  align?: Alineacion
  className?: string
}

/**
 * Menú desplegable accesible construido sobre el patrón de `popover.tsx` (misma
 * base `useDismiss`). Agrupa acciones secundarias detrás de un disparador.
 *
 * Accesibilidad: el panel tiene `role="menu"` y sus ítems `role="menuitem"`.
 * Navegable por teclado — flechas arriba/abajo mueven el foco (saltando ítems
 * deshabilitados), Home/End van al primero/último, Enter/Espacio activan, Escape
 * cierra y devuelve el foco al disparador. Se cierra al elegir un ítem o al
 * clicar fuera.
 */
export function DropdownMenu({ trigger, children, align = 'start', className }: DropdownMenuProps) {
  const [abierto, setAbierto] = React.useState(false)
  const ref = useDismiss(abierto, () => setAbierto(false))
  const panelRef = React.useRef<HTMLDivElement>(null)
  const disparadorRef = React.useRef<HTMLElement | null>(null)
  const itemsRef = React.useRef<HTMLButtonElement[]>([])

  const cerrar = React.useCallback(() => {
    setAbierto(false)
    disparadorRef.current?.focus()
  }, [])

  const registrar = React.useCallback((el: HTMLButtonElement | null) => {
    if (el && !itemsRef.current.includes(el)) {
      itemsRef.current.push(el)
    }
  }, [])

  // Al abrir, resetear el registro de ítems y enfocar el primero habilitado.
  React.useEffect(() => {
    if (!abierto) {
      itemsRef.current = []
      return
    }
    const primero = itemsRef.current.find((el) => !el.disabled)
    primero?.focus()
  }, [abierto])

  const moverFoco = (desde: number, direccion: 1 | -1) => {
    const items = itemsRef.current
    const total = items.length
    if (total === 0) return
    let i = desde
    for (let intentos = 0; intentos < total; intentos++) {
      i = (i + direccion + total) % total
      if (!items[i].disabled) {
        items[i].focus()
        return
      }
    }
  }

  const alTeclaPanel = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const items = itemsRef.current
    const actual = items.indexOf(document.activeElement as HTMLButtonElement)
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        moverFoco(actual, 1)
        break
      case 'ArrowUp':
        e.preventDefault()
        moverFoco(actual, -1)
        break
      case 'Home':
        e.preventDefault()
        moverFoco(-1, 1)
        break
      case 'End':
        e.preventDefault()
        moverFoco(0, -1)
        break
    }
  }

  const trigO = trigger.props as { onClick?: (e: React.MouseEvent) => void; ref?: React.Ref<HTMLElement> }
  const disparador = React.cloneElement(trigger, {
    onClick: (e: React.MouseEvent) => {
      trigO.onClick?.(e)
      setAbierto((v) => !v)
    },
    ref: (el: HTMLElement | null) => {
      disparadorRef.current = el
      const r = trigO.ref
      if (typeof r === 'function') r(el)
      else if (r && typeof r === 'object') (r as React.MutableRefObject<HTMLElement | null>).current = el
    },
    'aria-haspopup': 'menu',
    'aria-expanded': abierto,
  } as Record<string, unknown>)

  return (
    <DropdownMenuContext.Provider value={{ cerrar, registrar }}>
      <span ref={ref} className="relative inline-flex">
        {disparador}
        {abierto && (
          <div
            ref={panelRef}
            role="menu"
            onKeyDown={alTeclaPanel}
            className={cn(
              'absolute top-full z-50 mt-1.5 min-w-[12rem] overflow-hidden rounded-md border bg-popover p-1 text-sm text-popover-foreground shadow-md',
              alineaciones[align],
              className,
            )}
          >
            {children}
          </div>
        )}
      </span>
    </DropdownMenuContext.Provider>
  )
}

interface DropdownMenuItemProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  /** Ícono opcional a la izquierda del texto. */
  icon?: React.ReactNode
  /** Variante destructiva (acciones peligrosas). */
  danger?: boolean
  /** El menú se cierra automáticamente tras ejecutar el handler. */
  onSelect?: (e: React.MouseEvent<HTMLButtonElement>) => void
}

/** Ítem de un `DropdownMenu` (`role="menuitem"`). Cierra el menú al activarse. */
export function DropdownMenuItem({
  icon,
  danger = false,
  onSelect,
  disabled,
  className,
  children,
  ...props
}: DropdownMenuItemProps) {
  const ctx = React.useContext(DropdownMenuContext)

  return (
    <button
      type="button"
      role="menuitem"
      ref={ctx?.registrar}
      disabled={disabled}
      tabIndex={-1}
      onClick={(e) => {
        onSelect?.(e)
        ctx?.cerrar()
      }}
      className={cn(
        'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left transition-colors',
        'focus-visible:outline-none focus:bg-accent focus:text-accent-foreground',
        'hover:bg-accent hover:text-accent-foreground',
        'disabled:pointer-events-none disabled:opacity-50',
        danger && 'text-destructive focus:bg-destructive/10 hover:bg-destructive/10',
        className,
      )}
      {...props}
    >
      {icon && <span className="flex h-4 w-4 shrink-0 items-center justify-center">{icon}</span>}
      <span className="flex-1 truncate">{children}</span>
    </button>
  )
}

/** Separador visual entre grupos de ítems. */
export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div role="separator" className={cn('-mx-1 my-1 h-px bg-border', className)} />
}

/** Encabezado no interactivo para rotular un grupo de ítems. */
export function DropdownMenuLabel({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('px-2 py-1.5 text-xs font-medium text-muted-foreground', className)}>
      {children}
    </div>
  )
}
