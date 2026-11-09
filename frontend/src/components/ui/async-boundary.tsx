import * as React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

import { ApiError } from '@/types/api'
import { Button } from './button'
import { Skeleton } from './skeleton'
import { Spinner } from './spinner'

interface AsyncBoundaryProps<T> {
  /** Estado cargando (p. ej. `query.isLoading`). */
  loading: boolean
  /** Error de la query (o `null`). */
  error?: unknown
  /** Datos ya cargados. */
  data: T | undefined | null
  /** `true` si `data` representa un conjunto vacío. */
  vacio?: boolean
  /** Reintento (p. ej. `query.refetch`). */
  onReintentar?: () => void
  /** Vista de carga personalizada (por defecto, skeleton de filas). */
  fallbackCarga?: React.ReactNode
  /** Vista de vacío personalizada (por defecto, texto simple). */
  fallbackVacio?: React.ReactNode
  children: (data: T) => React.ReactNode
}

/** Traduce un error de query a un mensaje en español accionable. */
function mensajeDeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.esNoAutorizado) return 'Su sesión caducó. Vuelva a iniciar sesión.'
    if (error.esProhibido) return 'No tiene acceso a esta información (fuera de su ámbito).'
    if (error.isNetworkError) return 'No se pudo conectar con el servidor. Revise su conexión.'
    return error.message
  }
  if (error instanceof Error) return error.message
  return 'Ocurrió un error al cargar la información.'
}

/**
 * Contrato único de carga / error / vacío / contenido para TanStack Query.
 * Evita que cada página reimplemente spinners y vacíos con markup distinto.
 */
export function AsyncBoundary<T>({
  loading,
  error,
  data,
  vacio,
  onReintentar,
  fallbackCarga,
  fallbackVacio,
  children,
}: AsyncBoundaryProps<T>) {
  if (loading) {
    return (
      <>
        {fallbackCarga ?? (
          <div className="space-y-2" aria-busy="true" aria-label="Cargando">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}
      </>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-10 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="mt-3 text-sm font-medium text-foreground">No se pudo cargar</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{mensajeDeError(error)}</p>
        {onReintentar && (
          <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={onReintentar}>
            <RefreshCw className="h-3.5 w-3.5" />
            Reintentar
          </Button>
        )}
      </div>
    )
  }

  if (data == null || vacio) {
    return (
      <>
        {fallbackVacio ?? (
          <p className="py-8 text-center text-sm text-muted-foreground">Sin información para mostrar.</p>
        )}
      </>
    )
  }

  return <>{children(data)}</>
}

/** Spinner centrado reutilizable para cargas en bloque. */
export function CargaBloque({ texto }: { texto?: string }) {
  return (
    <div className="flex h-48 flex-col items-center justify-center gap-3">
      <Spinner className="h-7 w-7 text-primary" />
      {texto && <p className="text-sm text-muted-foreground">{texto}</p>}
    </div>
  )
}
