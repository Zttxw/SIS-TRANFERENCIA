import * as React from 'react'
import { Check, ChevronsUpDown, Search, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useDismiss } from '@/hooks/use-dismiss'
import { Spinner } from './spinner'

export interface ComboboxOption<V extends string | number = string> {
  value: V
  label: string
  /** Texto secundario opcional (p. ej. código de dependencia, DNI). */
  descripcion?: string
}

interface ComboboxProps<V extends string | number> {
  options: ComboboxOption<V>[]
  value: V | null | undefined
  onChange: (value: V | null) => void
  placeholder?: string
  /** Texto cuando no hay coincidencias. */
  vacioTexto?: string
  disabled?: boolean
  /** Permite limpiar la selección. */
  clearable?: boolean
  /** Indica carga (p. ej. búsqueda server-side). */
  loading?: boolean
  /** Notifica el texto de búsqueda (para filtrado server-side). */
  onBuscar?: (texto: string) => void
  id?: string
  className?: string
  'aria-invalid'?: boolean
}

/**
 * Combobox/Autocomplete accesible con búsqueda por texto. Pensado para catálogos
 * medianos/grandes (dependencias, servidores). Filtra en cliente por defecto; si
 * se pasa `onBuscar`, delega el filtrado al consumidor (búsqueda server-side).
 */
export function Combobox<V extends string | number = string>({
  options,
  value,
  onChange,
  placeholder = 'Buscar y seleccionar…',
  vacioTexto = 'Sin coincidencias',
  disabled = false,
  clearable = true,
  loading = false,
  onBuscar,
  id,
  className,
  'aria-invalid': ariaInvalid,
}: ComboboxProps<V>) {
  const [abierto, setAbierto] = React.useState(false)
  const [texto, setTexto] = React.useState('')
  const [activo, setActivo] = React.useState(0)
  const ref = useDismiss(abierto, () => setAbierto(false))
  const inputRef = React.useRef<HTMLInputElement>(null)
  const listaRef = React.useRef<HTMLUListElement>(null)

  const filtradas = React.useMemo(() => {
    if (onBuscar || !texto.trim()) return options
    const q = texto.toLowerCase()
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.descripcion?.toLowerCase().includes(q) ?? false),
    )
  }, [options, texto, onBuscar])

  const seleccionada = options.find((o) => o.value === value) ?? null

  const abrir = () => {
    if (disabled) return
    setAbierto(true)
    setTexto('')
    setActivo(0)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  const elegir = (opt: ComboboxOption<V>) => {
    onChange(opt.value)
    setAbierto(false)
    setTexto('')
  }

  const limpiar = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
  }

  const alTecla = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActivo((i) => Math.min(i + 1, filtradas.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActivo((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const opt = filtradas[activo]
      if (opt) elegir(opt)
    } else if (e.key === 'Escape') {
      setAbierto(false)
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
        onClick={() => (abierto ? setAbierto(false) : abrir())}
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
        <span className="flex shrink-0 items-center gap-1">
          {clearable && seleccionada && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Limpiar selección"
              onClick={limpiar}
              className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </span>
      </button>

      {abierto && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
          <div className="flex items-center gap-2 border-b px-2.5 py-1.5">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              ref={inputRef}
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value)
                setActivo(0)
                onBuscar?.(e.target.value)
              }}
              onKeyDown={alTecla}
              placeholder="Escriba para filtrar…"
              className="h-7 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {loading && <Spinner className="h-3.5 w-3.5" />}
          </div>
          <ul ref={listaRef} role="listbox" className="max-h-64 overflow-auto p-1">
            {filtradas.length === 0 ? (
              <li className="px-2 py-3 text-center text-xs text-muted-foreground">
                {loading ? 'Buscando…' : vacioTexto}
              </li>
            ) : (
              filtradas.map((opt, i) => {
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
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{opt.label}</span>
                      {opt.descripcion && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {opt.descripcion}
                        </span>
                      )}
                    </span>
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
