import { useQuery } from '@tanstack/react-query'

import { useDependenciaActiva } from '@/auth/hooks'
import { cn } from '@/lib/utils'

import { listarDependencias } from './dependencias.service'

/**
 * Selector de dependencia activa (plan §5, E2). Define el `dependencia_id` por
 * defecto de las consultas de anexos. Se alimenta del catálogo
 * (`GET /dependencias?all=true`) y persiste la selección vía el contexto.
 */
export function DependenciaSelector({ className }: { className?: string }) {
  const { dependenciaId, setDependenciaId } = useDependenciaActiva()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dependencias', 'catalogo'],
    queryFn: () => listarDependencias(),
    staleTime: 5 * 60_000,
  })

  if (isError) {
    return (
      <span className="text-xs text-muted-foreground">
        No se pudo cargar el catálogo de dependencias.
      </span>
    )
  }

  return (
    <select
      aria-label="Dependencia activa"
      disabled={isLoading}
      value={dependenciaId ?? ''}
      onChange={(e) =>
        setDependenciaId(e.target.value ? Number(e.target.value) : null)
      }
      className={cn(
        'h-9 w-full max-w-xs rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
        className,
      )}
    >
      <option value="">Todo mi ámbito</option>
      {data?.map((d) => (
        <option key={d.id} value={d.id}>
          {d.codigo} · {d.nombre}
        </option>
      ))}
    </select>
  )
}
