import * as React from 'react'
import { Check, ChevronsUpDown, Search } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useDismiss } from '@/hooks/use-dismiss'

export interface SelectOption<V extends string | number = string> {
  value: V
  label: string
  /** Deshabilita la opción individual. */
  disabled?: boolean
}

interface SelectProps<V extends string | number> {
  options: SelectOption<V>[]
  value: V | null | undefined
  onChange: (value: V) => void
  placeholder?: string
  /** Muestra un campo de búsqueda dentro del menú (útil con muchas opciones). */
  buscable?: boolean
  disabled?: boolean
  id?: string
  className?: string
  'aria-invalid'?: boolean
  'aria-labelledby'?: string
}

/**
 * Select accesible, tematizado y navegable por teclado (sin dependencias
 * externas). Reemplaza los `<select>` HTML crudos. Con `buscable` filtra las
 * opciones por texto — base para listas medianas.
 */
export function Select<V extends string | number = string>({
  options,
  value,
  onChange,
  placeholder = 'Seleccione…',
  buscable = false,
  disabled = false,
  id,
  className,
  'aria-invalid': ariaInvalid,
  'aria-labelledby': ariaLabelledby,
}: SelectProps<V>) {
  const [abierto, setAbierto] = React.useState(false)
  const [filtro, setFiltro] = React.useState('')
  const [activo, setActivo] = React.useState(0)
  const ref = useDismiss(abierto, () => setAbierto(false))
  const listaRef = React.useRef<HTMLUListElement>(null)
  const inputBusquedaRef = React.useRef<HTMLInputElement>(null)

  const opcionesFiltradas = React.useMemo(() => {
    if (!buscable || !filtro.trim()) return options
    const q = filtro.toLowerCase()
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, filtro, buscable])

  const seleccionada = options.find((o) => o.value === value) ?? null

  React.useEffect(() => {
    if (abierto) {
      setFiltro('')
      const i = opcionesFiltradas.findIndex((o) => o.value === value)
      setActivo(i >= 0 ? i : 0)
      if (buscable) requestAnimationFrame(() => inputBusquedaRef.current?.focus())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  const elegir = (opt: SelectOption<V>) => {
    if (opt.disabled) return
    onChange(opt.value)
    setAbierto(false)
  }

  const alTeclaDisparador = (e: React.KeyboardEvent) => {
    if (disabled) return
    if (!abierto && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      setAbierto(true)
      return
    }
    if (!abierto) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActivo((i) => Math.min(i + 1, opcionesFiltradas.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActivo((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const opt = opcionesFiltradas[activo]
      if (opt) elegir(opt)
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActivo(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setActivo(opcionesFiltradas.length - 1)
    }
  }

  React.useEffect(() => {
    const el = listaRef.current?.children[activo] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [activo])

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-invalid={ariaInvalid}
        aria-labelledby={ariaLabelledby}
        onClick={() => !disabled && setAbierto((v) => !v)}
        onKeyDown={alTeclaDisparador}
        className={cn(
          'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          ariaInvalid && 'border-destructive ring-destructive/30',
        )}
      >
        <span className={cn('truncate', !seleccionada && 'text-muted-foreground')}>
          {seleccionada?.label ?? placeholder}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
      </button>

      {abierto && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
          {buscable && (
            <div className="flex items-center gap-2 border-b px-2.5 py-1.5">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                ref={inputBusquedaRef}
                value={filtro}
                onChange={(e) => {
                  setFiltro(e.target.value)
                  setActivo(0)
                }}
                onKeyDown={alTeclaDisparador}
                placeholder="Buscar…"
                className="h-7 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          )}
          <ul ref={listaRef} role="listbox" className="max-h-60 overflow-auto p-1">
            {opcionesFiltradas.length === 0 ? (
              <li className="px-2 py-3 text-center text-xs text-muted-foreground">
                Sin coincidencias
              </li>
            ) : (
              opcionesFiltradas.map((opt, i) => {
                const sel = opt.value === value
                return (
                  <li
                    key={String(opt.value)}
                    role="option"
                    aria-selected={sel}
                    onMouseEnter={() => setActivo(i)}
                    onClick={() => elegir(opt)}
                    className={cn(
                      'flex cursor-pointer items-center justify-between gap-2 rounded px-2 py-1.5 text-sm',
                      i === activo && 'bg-accent text-accent-foreground',
                      opt.disabled && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    {sel && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </li>
                )
              })
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
