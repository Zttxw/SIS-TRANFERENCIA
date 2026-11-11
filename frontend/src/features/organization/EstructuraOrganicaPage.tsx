import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Boxes,
  Check,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  FolderTree,
  List,
  Package,
  Printer,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

import { useAuth, useDependenciaActiva } from '@/auth/hooks'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { construirArbol, filtrarArbol, obtenerAncestrosIds, type NodoArbol } from './arbol-utils'
import { useCatalogoDependencias } from './use-organization'

/**
 * Anexo 01 — Relación de Centros de Costo y Estructura Orgánica.
 * Muestra el catálogo oficial de dependencias de la entidad (Directiva N.° 001-2026-MDSJ/A §7).
 *
 * Todos los usuarios consultan la misma relación institucional, pero su centro de costo
 * o despacho asignado se resalta en verde para su inmediata identificación.
 */
export function EstructuraOrganicaPage() {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const { dependenciaId, setDependenciaId } = useDependenciaActiva()
  const { data: dependencias, isLoading, isError, refetch } = useCatalogoDependencias()

  const miDespachoId = dependenciaId ?? usuario?.servidor?.dependencia_id ?? null

  const [vista, setVista] = useState<'arbol' | 'tabla'>('arbol')
  const [busqueda, setBusqueda] = useState('')
  const [nodoSeleccionado, setNodoSeleccionado] = useState<NodoArbol | null>(null)

  // Catálogo depurado (excluir registros 'NULL', sin nombre o anómalos de migraciones SGD)
  const dependenciasValidas = useMemo(() => {
    if (!dependencias) return []
    return dependencias.filter(
      (d) =>
        Boolean(d.nombre) &&
        d.nombre.trim() !== '' &&
        d.nombre.trim().toUpperCase() !== 'NULL' &&
        d.nombre.trim().toUpperCase() !== 'NONE',
    )
  }, [dependencias])

  // Nodos expandidos por defecto (incluye la ruta hacia el despacho asignado del usuario)
  const ancestrosUsuario = useMemo(() => {
    if (!dependenciasValidas.length || !miDespachoId) return []
    return obtenerAncestrosIds(dependenciasValidas, miDespachoId)
  }, [dependenciasValidas, miDespachoId])

  const [nodosExpandidosManuales, setNodosExpandidosManuales] = useState<Set<number>>(new Set())
  const [nodosColapsadosManuales, setNodosColapsadosManuales] = useState<Set<number>>(new Set())

  const nodosExpandidos = useMemo(() => {
    const set = new Set<number>([1, 48, ...ancestrosUsuario])
    if (miDespachoId) set.add(miDespachoId)
    nodosExpandidosManuales.forEach((id) => set.add(id))
    nodosColapsadosManuales.forEach((id) => set.delete(id))
    return set
  }, [ancestrosUsuario, miDespachoId, nodosExpandidosManuales, nodosColapsadosManuales])

  // Construir el árbol jerárquico
  const arbolCompleto = useMemo(() => {
    return dependenciasValidas.length ? construirArbol(dependenciasValidas) : []
  }, [dependenciasValidas])

  // Filtrar el árbol reactivamente
  const arbolFiltrado = useMemo(() => {
    return filtrarArbol(arbolCompleto, busqueda)
  }, [arbolCompleto, busqueda])

  // Lista plana filtrada para la vista tabular oficial
  const tablaFiltrada = useMemo(() => {
    if (!dependenciasValidas.length) return []
    if (!busqueda.trim()) return dependenciasValidas
    const q = busqueda.toLowerCase().trim()
    return dependenciasValidas.filter(
      (d) =>
        d.codigo.toLowerCase().includes(q) ||
        d.nombre.toLowerCase().includes(q) ||
        (d.encargado &&
          `${d.encargado.nombres} ${d.encargado.apellidos}`.toLowerCase().includes(q)),
    )
  }, [dependenciasValidas, busqueda])

  // Nodo seleccionado o activo
  const nodoEfectivo = useMemo(() => {
    if (nodoSeleccionado) return nodoSeleccionado
    if (dependenciasValidas.length === 0) return null
    if (miDespachoId) {
      const match = dependenciasValidas.find((d) => d.id === miDespachoId)
      if (match) return match as unknown as NodoArbol
    }
    return arbolCompleto[0] ?? null
  }, [nodoSeleccionado, miDespachoId, dependenciasValidas, arbolCompleto])

  const toggleExpandido = (id: number) => {
    if (nodosExpandidos.has(id)) {
      setNodosColapsadosManuales((prev) => new Set(prev).add(id))
      setNodosExpandidosManuales((prev) => {
        const n = new Set(prev)
        n.delete(id)
        return n
      })
    } else {
      setNodosExpandidosManuales((prev) => new Set(prev).add(id))
      setNodosColapsadosManuales((prev) => {
        const n = new Set(prev)
        n.delete(id)
        return n
      })
    }
  }

  const expandirTodos = () => {
    if (!dependencias) return
    setNodosColapsadosManuales(new Set())
    setNodosExpandidosManuales(new Set(dependencias.map((d) => d.id)))
  }

  const colapsarTodos = () => {
    if (!dependencias) return
    setNodosExpandidosManuales(new Set())
    setNodosColapsadosManuales(new Set(dependencias.map((d) => d.id)))
  }

  const handleSeleccionarDespacho = (nodo: NodoArbol) => {
    setDependenciaId(nodo.id)
    toast.success(`Despacho activo establecido: [${nodo.codigo}] ${nodo.nombre}`)
  }

  const handleAbrirDashboard = (nodo: NodoArbol) => {
    setDependenciaId(nodo.id)
    navigate('/')
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[450px] flex-col items-center justify-center gap-3">
        <Spinner className="h-8 w-8 text-primary" />
        <p className="text-xs text-muted-foreground font-medium">
          Cargando catálogo oficial de centros de costo...
        </p>
      </div>
    )
  }

  if (isError || !dependencias) {
    return (
      <Card className="border-destructive/30 p-8 text-center bg-destructive/5">
        <p className="font-semibold text-sm text-foreground">
          No se pudo cargar la relación de centros de costo.
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-3 text-xs gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Reintentar
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabecera oficial del Anexo 01 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded">
              Anexo 01
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Relación de Centros de Costo
            </h1>
            <Badge variant="outline" className="text-xs font-semibold border-primary/30 text-primary bg-primary/5">
              {dependencias.length} Centros de Costo
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Estructura institucional aprobada · Directiva N.° 001-2026-MDSJ/A §7
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Vista: Árbol vs Tabla */}
          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setVista('arbol')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-all ${
                vista === 'arbol'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FolderTree className="h-3.5 w-3.5" />
              Árbol Orgánico
            </button>
            <button
              type="button"
              onClick={() => setVista('tabla')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-all ${
                vista === 'tabla'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              Tabla Oficial
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="h-8 gap-1.5 text-xs shadow-xs"
          >
            <Printer className="h-3.5 w-3.5" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <Card className="border shadow-xs print:hidden">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por código (ej. 00025) o denominación..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-8 text-xs h-8 bg-muted/50"
              />
            </div>

            {vista === 'arbol' && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={expandirTodos}
                  className="h-8 text-xs cursor-pointer"
                >
                  Expandir todo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={colapsarTodos}
                  className="h-8 text-xs cursor-pointer"
                >
                  Colapsar todo
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* VISTA 1: ÁRBOL ORGÁNICO CON PANEL INSPECTOR */}
      {vista === 'arbol' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-7 xl:col-span-8 border shadow-xs">
            <CardHeader className="py-3 px-4 border-b border-border bg-muted/20">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FolderTree className="h-4 w-4 text-primary" />
                  Estructura Orgánica Institucional
                </span>
                <span className="text-nota font-normal text-muted-foreground">
                  Su despacho se resalta en verde
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 max-h-[680px] overflow-y-auto">
              {arbolFiltrado.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No se encontraron centros de costo que coincidan con la búsqueda.
                </div>
              ) : (
                <div className="space-y-1">
                  {arbolFiltrado.map((nodo) => (
                    <CarpetaNodoItem
                      key={nodo.id}
                      nodo={nodo}
                      nivel={0}
                      nodosExpandidos={nodosExpandidos}
                      onToggle={toggleExpandido}
                      miDespachoId={miDespachoId}
                      nodoSeleccionadoId={nodoEfectivo?.id ?? null}
                      onSeleccionarNodo={(n) => setNodoSeleccionado(n)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ficha inspectora lateral */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-4">
            {nodoEfectivo ? (
              <Card className="border shadow-xs sticky top-20">
                <CardHeader className="p-4 border-b border-border bg-muted/30">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-mini font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                        [{nodoEfectivo.codigo}]
                      </span>
                      <h3 className="text-sm font-bold text-foreground mt-1.5 leading-snug">
                        {nodoEfectivo.nombre}
                      </h3>
                    </div>
                    <Badge variant="outline" className="text-mini shrink-0 font-semibold bg-background">
                      Nivel {nodoEfectivo.nivel}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-4 text-xs">
                  {/* Resaltado si es el despacho asignado */}
                  {nodoEfectivo.id === miDespachoId ? (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-semibold">
                      <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Este es su Centro de Costo asignado</span>
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleSeleccionarDespacho(nodoEfectivo)}
                      variant="outline"
                      className="w-full h-8 text-xs font-medium cursor-pointer"
                    >
                      Seleccionar como centro de costo activo
                    </Button>
                  )}

                  {/* Metadatos institucionales */}
                  <div className="space-y-2.5 border-t border-border pt-3">
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>Código formal:</span>
                      <span className="font-mono font-semibold text-foreground">
                        {nodoEfectivo.codigo}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>Unidades dependientes:</span>
                      <span className="font-semibold text-foreground">
                        {nodoEfectivo.hijos?.length || 0} subunidades
                      </span>
                    </div>

                    <div className="flex justify-between items-start text-muted-foreground">
                      <span>Responsable / Titular:</span>
                      <div className="text-right">
                        {nodoEfectivo.encargado ? (
                          <>
                            <div className="font-semibold text-foreground">
                              {nodoEfectivo.encargado.nombres} {nodoEfectivo.encargado.apellidos}
                            </div>
                            <div className="text-mini text-muted-foreground">
                              {nodoEfectivo.encargado.cargo || 'Responsable'}
                            </div>
                          </>
                        ) : (
                          <span className="italic text-muted-foreground">Sin asignar</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Acciones directas sobre este centro de costo */}
                  <div className="space-y-2 border-t border-border pt-3">
                    <span className="text-nota font-bold text-muted-foreground uppercase tracking-wider block">
                      Gestión del Centro de Costo
                    </span>

                    <div className="grid grid-cols-1 gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAbrirDashboard(nodoEfectivo)}
                        className="h-8 justify-start text-xs gap-2 font-medium cursor-pointer"
                      >
                        <Boxes className="h-3.5 w-3.5 text-primary" />
                        <span>Abrir Dashboard de este centro</span>
                        <ArrowRight className="h-3 w-3 ml-auto text-muted-foreground" />
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDependenciaId(nodoEfectivo.id)
                          navigate('/patrimonio')
                        }}
                        className="h-8 justify-start text-xs gap-2 font-medium cursor-pointer"
                      >
                        <Package className="h-3.5 w-3.5 text-primary" />
                        <span>Ver Anexo 04 (Patrimonio SIGA)</span>
                        <ArrowRight className="h-3 w-3 ml-auto text-muted-foreground" />
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDependenciaId(nodoEfectivo.id)
                          navigate('/personal')
                        }}
                        className="h-8 justify-start text-xs gap-2 font-medium cursor-pointer"
                      >
                        <Users className="h-3.5 w-3.5 text-primary" />
                        <span>Ver Anexo 05 (Personal a cargo)</span>
                        <ArrowRight className="h-3 w-3 ml-auto text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed p-8 text-center text-xs text-muted-foreground">
                Seleccione un centro de costo en el árbol para inspeccionar sus datos.
              </Card>
            )}
          </div>
        </div>
      )}

      {/* VISTA 2: TABLA OFICIAL ANEXO 01 (DIRECTIVA N.° 001-2026-MDSJ/A) */}
      {vista === 'tabla' && (
        <Card className="border shadow-xs overflow-hidden">
          <CardHeader className="py-3 px-4 border-b border-border bg-muted/20">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Formato Oficial Anexo 01: Relación de Centros de Costo</span>
              <span className="font-mono text-nota font-normal text-muted-foreground">
                Fuente: CEPLAN / POI / ROF
              </span>
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted text-muted-foreground uppercase text-mini font-semibold border-b border-border">
                <tr>
                  <th className="px-4 py-2.5 w-24">Código</th>
                  <th className="px-4 py-2.5">Descripción del Centro de Costo</th>
                  <th className="px-4 py-2.5 text-center w-28">Nivel</th>
                  <th className="px-4 py-2.5 w-40">Titular / Encargado</th>
                  <th className="px-4 py-2.5 text-center w-24">Estado</th>
                  <th className="px-4 py-2.5 text-right w-24 print:hidden">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tablaFiltrada.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No se encontraron centros de costo.
                    </td>
                  </tr>
                ) : (
                  tablaFiltrada.map((dep) => {
                    const esMiDespacho = dep.id === miDespachoId
                    return (
                      <tr
                        key={dep.id}
                        className={`transition-colors ${
                          esMiDespacho
                            ? 'bg-emerald-500/10 font-medium text-foreground border-l-4 border-l-emerald-600 dark:border-l-emerald-500'
                            : 'hover:bg-muted/30 text-foreground'
                        }`}
                      >
                        <td className="px-4 py-2.5 font-mono font-bold text-primary">
                          [{dep.codigo}]
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span>{dep.nombre}</span>
                            {esMiDespacho && (
                              <span className="px-1.5 py-0.5 rounded text-mini font-mono font-bold bg-emerald-600 text-white shrink-0">
                                Su Despacho
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-center font-mono">
                          Nivel {dep.nivel}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {dep.encargado
                            ? `${dep.encargado.nombres} ${dep.encargado.apellidos}`
                            : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="inline-block px-2 py-0.5 rounded text-mini font-mono font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                            Activo
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right print:hidden">
                          <button
                            type="button"
                            onClick={() => {
                              setDependenciaId(dep.id)
                              navigate('/')
                            }}
                            className="font-medium text-primary hover:underline text-xs"
                          >
                            Abrir
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

/**
 * Componente recursivo que renderiza una carpeta del árbol orgánico
 */
interface CarpetaNodoItemProps {
  nodo: NodoArbol
  nivel: number
  nodosExpandidos: Set<number>
  onToggle: (id: number) => void
  miDespachoId: number | null
  nodoSeleccionadoId: number | null
  onSeleccionarNodo: (nodo: NodoArbol) => void
}

function CarpetaNodoItem({
  nodo,
  nivel,
  nodosExpandidos,
  onToggle,
  miDespachoId,
  nodoSeleccionadoId,
  onSeleccionarNodo,
}: CarpetaNodoItemProps) {
  const tieneHijos = Boolean(nodo.hijos && nodo.hijos.length > 0)
  const estaExpandido = nodosExpandidos.has(nodo.id)
  const esMiDespacho = nodo.id === miDespachoId
  const esSeleccionado = nodoSeleccionadoId === nodo.id

  return (
    <div className="select-none">
      <div
        onClick={() => onSeleccionarNodo(nodo)}
        className={`group flex items-center gap-1.5 py-1.5 px-2 rounded-lg cursor-pointer text-xs transition-all ${
          esMiDespacho
            ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-950 dark:text-emerald-100 font-bold ring-1 ring-emerald-500/30'
            : esSeleccionado
            ? 'bg-primary/15 text-primary font-semibold ring-1 ring-primary/30'
            : 'hover:bg-muted text-foreground'
        }`}
        style={{ paddingLeft: `${nivel * 16 + 8}px` }}
      >
        {/* Toggle para expandir/colapsar */}
        {tieneHijos ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggle(nodo.id)
            }}
            className="h-4 w-4 flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
          >
            {estaExpandido ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}

        {/* Ícono de Carpeta */}
        {tieneHijos ? (
          estaExpandido ? (
            <FolderOpen
              className={`h-4 w-4 shrink-0 ${
                esMiDespacho ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'
              }`}
            />
          ) : (
            <Folder
              className={`h-4 w-4 shrink-0 ${
                esMiDespacho ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'
              }`}
            />
          )
        ) : (
          <Folder
            className={`h-3.5 w-3.5 shrink-0 ${
              esMiDespacho ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
            }`}
          />
        )}

        {/* Código y Nombre */}
        <span
          className={`font-mono text-nota shrink-0 ${
            esMiDespacho ? 'text-emerald-700 dark:text-emerald-300 font-bold' : 'text-muted-foreground'
          }`}
        >
          [{nodo.codigo}]
        </span>
        <span className="truncate flex-1">{nodo.nombre}</span>

        {/* Insignia en Verde si es el Centro de Costo asignado del usuario */}
        {esMiDespacho && (
          <span className="px-2 py-0.5 rounded text-mini font-mono font-bold bg-emerald-600 text-white shrink-0">
            Su Despacho
          </span>
        )}

        {/* Cantidad de subdependencias */}
        {tieneHijos && (
          <span className="text-mini text-muted-foreground font-mono shrink-0">
            ({nodo.hijos.length})
          </span>
        )}
      </div>

      {/* Subcarpetas anidadas recursivas */}
      {tieneHijos && estaExpandido && (
        <div className="border-l border-border ml-3 pl-1 space-y-0.5">
          {nodo.hijos.map((hijo) => (
            <CarpetaNodoItem
              key={hijo.id}
              nodo={hijo}
              nivel={nivel + 1}
              nodosExpandidos={nodosExpandidos}
              onToggle={onToggle}
              miDespachoId={miDespachoId}
              nodoSeleccionadoId={nodoSeleccionadoId}
              onSeleccionarNodo={onSeleccionarNodo}
            />
          ))}
        </div>
      )}
    </div>
  )
}
