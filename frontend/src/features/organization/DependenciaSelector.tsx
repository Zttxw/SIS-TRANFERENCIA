import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Building2, UserCheck } from 'lucide-react'

import { useAuth, useDependenciaActiva } from '@/auth/hooks'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import { listarDependencias } from './dependencias.service'

/**
 * Selector o indicador de dependencia activa según la jerarquía del usuario (plan §5, E2).
 * - Superjefes (Admin / ETTS): Monitoreo global y selector de todas las dependencias.
 * - Jefes de Dependencia / Servidores: Chip fijo con su despacho oficial asignado,
 *   sin posibilidad de alternar a dependencias no autorizadas.
 */
export function DependenciaSelector({ className }: { className?: string }) {
  const { usuario } = useAuth()
  const { dependenciaId, setDependenciaId } = useDependenciaActiva()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dependencias', 'catalogo'],
    queryFn: () => listarDependencias(),
    staleTime: 5 * 60_000,
  })

  const listaDependencias = useMemo(() => {
    return (
      data?.filter(
        (d) =>
          Boolean(d.nombre) &&
          d.nombre.trim() !== '' &&
          d.nombre.trim().toUpperCase() !== 'NULL' &&
          d.nombre.trim().toUpperCase() !== 'NONE',
      ) ?? []
    )
  }, [data])

  if (isError) {
    return (
      <span className="text-xs text-muted-foreground">
        No se pudo cargar el catálogo de dependencias.
      </span>
    )
  }

  const esGlobal = usuario?.es_global === true
  const esJefe =
    Boolean(usuario?.servidor?.es_responsable) ||
    Boolean(
      usuario?.roles?.some(
        (r) =>
          r.rol === 'responsable_centro_costo' ||
          r.rol === 'responsable_equipo',
      ),
    )

  // Dependencia actualmente activa encontrada en los datos o en el perfil
  const dependenciaActual =
    listaDependencias.find((d) => d.id === dependenciaId) ??
    (usuario?.servidor?.dependencia ? {
      id: usuario.servidor.dependencia.id,
      codigo: usuario.servidor.dependencia.codigo,
      nombre: usuario.servidor.dependencia.nombre,
      nivel: usuario.servidor.dependencia.nivel,
    } : null)

  // Caso 1: Usuario con ámbito restringido a una única dependencia (Jefe de OTI o Servidor)
  if (!esGlobal && listaDependencias.length <= 1) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs text-foreground shadow-sm max-w-md',
          className,
        )}
        title={dependenciaActual?.nombre ?? 'Despacho asignado'}
      >
        <Building2 className="h-4 w-4 shrink-0 text-primary" />
        <div className="flex items-center gap-1.5 truncate">
          {dependenciaActual ? (
            <>
              <span className="font-mono text-nota font-bold text-primary shrink-0">
                [{dependenciaActual.codigo}]
              </span>
              <span className="truncate font-semibold uppercase tracking-tight text-foreground">
                {dependenciaActual.nombre}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground italic">Cargando despacho...</span>
          )}
        </div>
        {esJefe ? (
          <Badge
            variant="outline"
            className="ml-auto shrink-0 border-secondary/40 bg-secondary/15 text-secondary text-mini font-bold px-1.5 py-0 uppercase"
          >
            <UserCheck className="mr-1 h-3 w-3" />
            Jefatura
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="ml-auto shrink-0 border-border bg-muted text-muted-foreground text-mini font-medium px-1.5 py-0 uppercase"
          >
            Servidor
          </Badge>
        )}
      </div>
    )
  }

  // Caso 2: Usuario responsable de múltiples unidades subordinadas (subárbol)
  if (!esGlobal && listaDependencias.length > 1) {
    return (
      <div className={cn('relative flex items-center', className)}>
        <select
          aria-label="Dependencia subordinada activa"
          disabled={isLoading}
          value={dependenciaId ?? listaDependencias[0]?.id ?? ''}
          onChange={(e) => setDependenciaId(Number(e.target.value))}
          className="h-9 w-full max-w-sm rounded-lg border border-primary/30 bg-background px-3 text-xs font-medium text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {listaDependencias.map((d) => (
            <option key={d.id} value={d.id}>
              [{d.codigo}] · {d.nombre}
            </option>
          ))}
        </select>
      </div>
    )
  }

  // Caso 3: Superjefe / Administrador / ETTS (Ámbito institucional completo)
  return (
    <div className={cn('relative flex items-center', className)}>
      <select
        aria-label="Dependencia institucional activa"
        disabled={isLoading}
        value={dependenciaId ?? ''}
        onChange={(e) =>
          setDependenciaId(e.target.value ? Number(e.target.value) : null)
        }
        className="h-9 w-full max-w-sm rounded-lg border border-input bg-background px-3 text-xs font-medium text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
      >
        <option value="" className="font-semibold text-primary">
          Monitoreo Global (Todo el Municipio)
        </option>
        {listaDependencias.map((d) => (
          <option key={d.id} value={d.id}>
            [{d.codigo}] · {d.nombre}
          </option>
        ))}
      </select>
    </div>
  )
}
