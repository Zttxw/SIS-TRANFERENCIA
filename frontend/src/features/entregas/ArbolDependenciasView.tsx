import { useMemo, useState } from 'react'
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Eye,
  FolderTree,
  Search,
  UserCheck,
} from 'lucide-react'
import { toast } from 'sonner'

import { useDependenciaActiva } from '@/auth/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import type { DependenciaResumen } from '@/types/transferencia'
import { construirArbol, filtrarArbol, type NodoArbol } from './arbol-utils'
import { useCatalogoDependencias } from './use-entregas'

interface ArbolDependenciasViewProps {
  onVerDetalle: (dependencia: DependenciaResumen) => void
}

export function ArbolDependenciasView({ onVerDetalle }: ArbolDependenciasViewProps) {
  const { dependenciaId, setDependenciaId } = useDependenciaActiva()
  const { data: dependencias, isLoading, isError, refetch } = useCatalogoDependencias()

  const [busqueda, setBusqueda] = useState('')
  const [nodosExpandidos, setNodosExpandidos] = useState<Set<number>>(new Set([1])) // Raíz expandida por defecto

  // Construir y filtrar el árbol
  const arbolCompleto = useMemo(() => {
    return dependencias ? construirArbol(dependencias) : []
  }, [dependencias])

  const arbolFiltrado = useMemo(() => {
    return filtrarArbol(arbolCompleto, busqueda)
  }, [arbolCompleto, busqueda])

  const toggleExpandido = (id: number) => {
    setNodosExpandidos((prev) => {
      const nuevo = new Set(prev)
      if (nuevo.has(id)) {
        nuevo.delete(id)
      } else {
        nuevo.add(id)
      }
      return nuevo
    })
  }

  const expandirTodos = () => {
    if (!dependencias) return
    setNodosExpandidos(new Set(dependencias.map((d) => d.id)))
  }

  const colapsarTodos = () => {
    setNodosExpandidos(new Set())
  }

  const handleSeleccionar = (nodo: NodoArbol) => {
    setDependenciaId(nodo.id)
    toast.success(`Centro de costo activo: ${nodo.codigo} · ${nodo.nombre}`)
  }

  if (isLoading) {
    return (
      <Card className="p-12 text-center">
        <Spinner className="mx-auto h-8 w-8 text-primary" />
        <p className="mt-2 text-sm text-muted-foreground">Cargando árbol organizacional...</p>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card className="p-8 text-center text-destructive border-destructive/30">
        <p className="font-semibold text-sm">No se pudo cargar la jerarquía de dependencias.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4">
          Reintentar
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Barra de Filtros y Acciones del Árbol */}
      <Card className="border shadow-xs">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por código (ej. 01.03) o nombre de oficina..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-8 text-xs h-8"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={expandirTodos}
                className="h-8 text-xs"
              >
                Expandir Todo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={colapsarTodos}
                className="h-8 text-xs"
              >
                Colapsar Todo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visualización del Árbol */}
      <Card className="border shadow-xs">
        <CardHeader className="pb-3 border-b bg-muted/15">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderTree className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">
                Estructura Organizacional Institucional ({dependencias?.length ?? 0} centros de costo)
              </CardTitle>
            </div>
            <span className="text-xs text-muted-foreground">
              Directiva N.° 001-2026-MDSJ/A · Jerarquía de Transferencia
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          {arbolFiltrado.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No se encontraron dependencias que coincidan con la búsqueda.
            </div>
          ) : (
            <div className="space-y-1">
              {arbolFiltrado.map((nodo) => (
                <ItemNodoArbol
                  key={nodo.id}
                  nodo={nodo}
                  nivelProfundidad={0}
                  expandidos={nodosExpandidos}
                  dependenciaActivaId={dependenciaId}
                  onToggle={toggleExpandido}
                  onVerDetalle={onVerDetalle}
                  onSeleccionar={handleSeleccionar}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface ItemNodoArbolProps {
  nodo: NodoArbol
  nivelProfundidad: number
  expandidos: Set<number>
  dependenciaActivaId: number | null
  onToggle: (id: number) => void
  onVerDetalle: (dependencia: DependenciaResumen) => void
  onSeleccionar: (nodo: NodoArbol) => void
}

function ItemNodoArbol({
  nodo,
  nivelProfundidad,
  expandidos,
  dependenciaActivaId,
  onToggle,
  onVerDetalle,
  onSeleccionar,
}: ItemNodoArbolProps) {
  const tieneHijos = nodo.hijos.length > 0
  const estaExpandido = expandidos.has(nodo.id)
  const esActiva = dependenciaActivaId === nodo.id

  const getBadgeNivel = (codigo: string) => {
    const segmentos = codigo.split('.').length
    switch (segmentos) {
      case 1:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
      case 2:
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
      case 3:
        return 'bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300'
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
    }
  }

  return (
    <div className="select-none">
      <div
        className={`group flex flex-wrap items-center justify-between gap-2 rounded-lg p-2 text-xs transition-colors ${
          esActiva
            ? 'bg-primary/10 border border-primary/40 font-medium'
            : 'hover:bg-muted/50 border border-transparent'
        }`}
        style={{ paddingLeft: `${nivelProfundidad * 20 + 8}px` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {tieneHijos ? (
            <button
              type="button"
              onClick={() => onToggle(nodo.id)}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {estaExpandido ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>
          ) : (
            <div className="h-5 w-5 shrink-0 flex items-center justify-center">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
            </div>
          )}

          <span
            className={`font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded ${getBadgeNivel(
              nodo.codigo,
            )}`}
          >
            {nodo.codigo}
          </span>

          <span className="truncate text-foreground font-medium">{nodo.nombre}</span>

          {nodo.encargado && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <UserCheck className="h-3 w-3 text-emerald-600" />
              {nodo.encargado.nombres} {nodo.encargado.apellidos}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
            onClick={() => onVerDetalle(nodo)}
          >
            <Eye className="h-3 w-3" />
            Estado
          </Button>

          <Button
            size="sm"
            variant={esActiva ? 'default' : 'outline'}
            className="h-7 px-2 text-[11px] gap-1"
            onClick={() => onSeleccionar(nodo)}
          >
            <Building2 className="h-3 w-3" />
            {esActiva ? 'Activo' : 'Seleccionar'}
          </Button>
        </div>
      </div>

      {tieneHijos && estaExpandido && (
        <div className="space-y-1 mt-0.5">
          {nodo.hijos.map((hijo) => (
            <ItemNodoArbol
              key={hijo.id}
              nodo={hijo}
              nivelProfundidad={nivelProfundidad + 1}
              expandidos={expandidos}
              dependenciaActivaId={dependenciaActivaId}
              onToggle={onToggle}
              onVerDetalle={onVerDetalle}
              onSeleccionar={onSeleccionar}
            />
          ))}
        </div>
      )}
    </div>
  )
}

