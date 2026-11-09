import * as React from 'react'
import { Copy, Plus, Trash2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from './button'
import { Select, type SelectOption } from './select'

/** Fila genérica: número de orden opcional + celdas de texto/número. */
export type FilaEditable = { n?: number } & Record<string, string | number | undefined>

export interface ColumnaEditable<T extends FilaEditable> {
  /** Clave del campo dentro de la fila. */
  campo: keyof T & string
  titulo: string
  placeholder?: string
  /** Tipo de control de celda. */
  tipo?: 'texto' | 'textarea' | 'numero' | 'select'
  /** Opciones cuando `tipo = 'select'` (autocompletado de catálogo). */
  opciones?: SelectOption<string>[]
  /** Ancho relativo (grid fr). Por defecto 1. */
  ancho?: number
  requerido?: boolean
}

interface EditableTableProps<T extends FilaEditable> {
  columnas: ColumnaEditable<T>[]
  filas: T[]
  /** Fila nueva vacía al agregar. */
  filaVacia: () => T
  onChange: (filas: T[]) => void
  disabled?: boolean
  etiquetaAgregar?: string
  /** Mensaje de error de la sección. */
  error?: string
  /** Ancho mínimo del contenedor con scroll horizontal. */
  minWidth?: string
}

/**
 * Editor de filas repetibles para captura rápida tipo tabla: agregar, duplicar y
 * eliminar fila; edición en línea; celdas de texto/número/select con
 * autocompletado de catálogo; navegación por teclado (Enter agrega fila desde la
 * última celda). Es la primitiva que habilita los formularios de anexos tipo
 * tabla (02, 03, 06). Generaliza el `SeccionFilas` del Anexo 02.
 */
export function EditableTable<T extends FilaEditable>({
  columnas,
  filas,
  filaVacia,
  onChange,
  disabled = false,
  etiquetaAgregar = 'Agregar fila',
  error,
  minWidth = '640px',
}: EditableTableProps<T>) {
  const actualizarCelda = (indice: number, campo: string, valor: string) => {
    onChange(filas.map((fila, i) => (i === indice ? { ...fila, [campo]: valor } : fila)))
  }

  const agregarFila = () => onChange([...filas, filaVacia()])

  const duplicarFila = (indice: number) => {
    const copia = { ...filas[indice] }
    delete copia.n
    const siguiente = [...filas]
    siguiente.splice(indice + 1, 0, copia)
    onChange(siguiente)
  }

  const eliminarFila = (indice: number) => onChange(filas.filter((_, i) => i !== indice))

  const alTeclaCelda = (e: React.KeyboardEvent, fila: number, col: number) => {
    // Enter en la última celda de la última fila agrega una fila nueva.
    if (e.key === 'Enter' && !e.shiftKey && col === columnas.length - 1) {
      const esUltimaFila = fila === filas.length - 1
      const celdaActual = columnas[col]
      if (celdaActual.tipo !== 'textarea') {
        e.preventDefault()
        if (esUltimaFila) agregarFila()
      }
    }
  }

  const gridCols = ['2.5rem', ...columnas.map((c) => `${c.ancho ?? 1}fr`), '4.5rem'].join(' ')

  const claseCeldaBase =
    'w-full rounded-md border border-input bg-background px-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <div style={{ minWidth }}>
          <div
            className="grid items-center gap-2 border-b pb-1.5 text-nota font-medium uppercase tracking-wide text-muted-foreground"
            style={{ gridTemplateColumns: gridCols }}
          >
            <span className="text-center">N°</span>
            {columnas.map((col) => (
              <span key={col.campo}>
                {col.titulo}
                {col.requerido && <span className="text-destructive"> *</span>}
              </span>
            ))}
            <span className="pr-1 text-right">Acciones</span>
          </div>

          {filas.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Sin filas. Use «{etiquetaAgregar}» para registrar la primera.
            </p>
          ) : (
            filas.map((fila, indice) => (
              <div
                key={indice}
                className="grid items-start gap-2 border-b border-border/50 py-1.5"
                style={{ gridTemplateColumns: gridCols }}
              >
                <span className="pt-2 text-center text-xs font-medium text-muted-foreground">
                  {indice + 1}
                </span>

                {columnas.map((col, colIdx) => {
                  const valor = String(fila[col.campo] ?? '')
                  if (col.tipo === 'select') {
                    return (
                      <Select
                        key={col.campo}
                        options={col.opciones ?? []}
                        value={valor || null}
                        onChange={(v) => actualizarCelda(indice, col.campo, String(v))}
                        placeholder={col.placeholder ?? 'Seleccione…'}
                        disabled={disabled}
                        buscable={(col.opciones?.length ?? 0) > 8}
                      />
                    )
                  }
                  if (col.tipo === 'textarea') {
                    return (
                      <textarea
                        key={col.campo}
                        rows={2}
                        value={valor}
                        disabled={disabled}
                        placeholder={col.placeholder}
                        className={cn(claseCeldaBase, 'py-1.5')}
                        onChange={(e) => actualizarCelda(indice, col.campo, e.target.value)}
                        onKeyDown={(e) => alTeclaCelda(e, indice, colIdx)}
                      />
                    )
                  }
                  return (
                    <input
                      key={col.campo}
                      type={col.tipo === 'numero' ? 'number' : 'text'}
                      value={valor}
                      disabled={disabled}
                      placeholder={col.placeholder}
                      className={cn(claseCeldaBase, 'h-9 py-1')}
                      onChange={(e) => actualizarCelda(indice, col.campo, e.target.value)}
                      onKeyDown={(e) => alTeclaCelda(e, indice, colIdx)}
                    />
                  )
                })}

                <div className="flex items-center justify-end gap-0.5 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    disabled={disabled}
                    title="Duplicar fila"
                    onClick={() => duplicarFila(indice)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    disabled={disabled}
                    title="Eliminar fila"
                    onClick={() => eliminarFila(indice)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-destructive">{error ?? ''}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={disabled}
          onClick={agregarFila}
        >
          <Plus className="h-4 w-4" />
          {etiquetaAgregar}
        </Button>
      </div>
    </div>
  )
}
