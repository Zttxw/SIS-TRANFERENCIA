import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Boxes,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  FolderTree,
  Package,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'

import { useAuth, useDependenciaActiva } from '@/auth/hooks'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { construirArbol, filtrarArbol, type NodoArbol } from './arbol-utils'
import { useCatalogoDependencias } from './use-organization'
import { DespachoPersonalView } from './DespachoPersonalView'

export function EstructuraOrganicaPage() {
  const { usuario } = useAuth()
  const esGlobal = usuario?.es_global === true

  // Si el usuario no tiene visión global (es Jefe de Oficina o Servidor),
  // se le presenta directamente la vista operativa de su despacho y sus trabajadores.
  if (!esGlobal) {
    return <DespachoPersonalView />
  }

  return <ArbolOrganicoAdminView />
}

function ArbolOrganicoAdminView() {
  const navigate = useNavigate()
  const { dependenciaId, setDependenciaId } = useDependenciaActiva()
  const { data: dependencias, isLoading, isError, refetch } = useCatalogoDependencias()

  const [busqueda, setBusqueda] = useState('')
  const [nodoSeleccionado, setNodoSeleccionado] = useState<NodoArbol | null>(null)
  const [nodosExpandidos, setNodosExpandidos] = useState<Set<number>>(new Set([1, 48])) // Expandir raíz y primeros niveles

  // Construir el árbol jerárquico
  const arbolCompleto = useMemo(() => {
    return dependencias ? construirArbol(dependencias) : []
  }, [dependencias])

  // Filtrar el árbol reactivamente
  const arbolFiltrado = useMemo(() => {
    return filtrarArbol(arbolCompleto, busqueda)
  }, [arbolCompleto, busqueda])

  // Buscar el nodo actualmente activo o seleccionado por defecto
  const nodoEfectivo = useMemo(() => {
    if (nodoSeleccionado) return nodoSeleccionado
    if (!dependencias || dependencias.length === 0) return null
    if (dependenciaId) {
      const match = dependencias.find((d) => d.id === dependenciaId)
      if (match) return match as unknown as NodoArbol
    }
    return arbolCompleto[0] ?? null
  }, [nodoSeleccionado, dependenciaId, dependencias, arbolCompleto])

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
          Cargando estructura orgánica institucional...
        </p>
      </div>
    )
  }

  if (isError || !dependencias) {
    return (
      <Card className="border-destructive/30 p-8 text-center bg-destructive/5">
        <p className="font-semibold text-sm text-foreground">
          No se pudo cargar la jerarquía de dependencias.
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
      {/* ========================================================
          CABECERA DEL MÓDULO
          ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded">
              Anexo 01
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Relación de Centros de Costo y Estructura Orgánica
            </h1>
            <Badge variant="outline" className="text-xs font-semibold border-primary/30 text-primary bg-primary/5">
              {dependencias.length} Unidades
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Carga y homologación del organigrama municipal · Directiva N.° 001-2026-MDSJ/GM
          </p>
        </div>

        {/* Aviso de homologación con SGD */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-warning-soft border border-warning-border text-warning-fg text-xs font-medium">
          <Sparkles className="h-3.5 w-3.5 text-warning-fg shrink-0" />
          <span>Homologación con SGD activa</span>
        </div>
      </div>

      {/* ========================================================
          BARRA DE HERRAMIENTAS Y BÚSQUEDA DEL ÁRBOL
          ======================================================== */}
      <Card className="border shadow-xs">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por código (ej. 01.03) o nombre de oficina..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-8 text-xs h-8 bg-muted"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={expandirTodos}
                className="h-8 text-xs cursor-pointer"
              >
                Expandir carpetas
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={colapsarTodos}
                className="h-8 text-xs cursor-pointer"
              >
                Colapsar todas
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================
          PANEL PRINCIPAL: ÁRBOL DE CARPETAS + FICHA DE DETALLE
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ÁRBOL ESTILO CARPETAS (8 COLUMNAS) */}
        <Card className="lg:col-span-7 xl:col-span-8 border shadow-xs">
          <CardHeader className="py-3 px-4 border-b border-border bg-muted/20">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FolderTree className="h-4 w-4 text-primary" />
                Explorador de Carpetas Orgánicas
              </span>
              <span className="text-nota font-normal text-muted-foreground">
                Directorio Institucional MDSJ
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 max-h-[680px] overflow-y-auto">
            {arbolFiltrado.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No se encontraron unidades orgánicas que coincidan con la búsqueda.
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
                    nodoActivoId={dependenciaId}
                    nodoSeleccionadoId={nodoEfectivo?.id ?? null}
                    onSeleccionarNodo={(n) => setNodoSeleccionado(n)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* FICHA INSPECTORA DE LA UNIDAD ORGÁNICA (4 COLUMNAS) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4">
          {nodoEfectivo ? (
            <Card className="border shadow-xs sticky top-20">
              <CardHeader className="p-4 border-b border-border bg-muted">
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
                {/* Indicador de Despacho Activo */}
                {nodoEfectivo.id === dependenciaId ? (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-success-soft border border-success-border text-success-fg font-semibold">
                    <Check className="h-4 w-4 text-success-fg shrink-0" />
                    <span>Esta unidad es actualmente su despacho activo</span>
                  </div>
                ) : (
                  <Button
                    onClick={() => handleSeleccionarDespacho(nodoEfectivo)}
                    className="w-full h-8 text-xs bg-primary hover:bg-primary-hover text-white font-medium cursor-pointer"
                  >
                    Establecer como despacho activo
                  </Button>
                )}

                {/* Metadatos institucionales */}
                <div className="space-y-2.5 border-t border-border pt-3">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Identificador interno:</span>
                    <span className="font-mono font-semibold text-foreground">#{nodoEfectivo.id}</span>
                  </div>

                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Unidades subordinadas:</span>
                    <span className="font-semibold text-foreground">
                      {nodoEfectivo.hijos?.length || 0} subcarpetas
                    </span>
                  </div>

                  <div className="flex justify-between items-start text-muted-foreground">
                    <span>Titular / Encargado:</span>
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

                {/* Enlaces Rápidos a Anexos de este despacho */}
                <div className="space-y-2 border-t border-border pt-3">
                  <span className="text-nota font-bold text-muted-foreground uppercase tracking-wider block">
                    Acciones de Auditoría
                  </span>

                  <div className="grid grid-cols-1 gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAbrirDashboard(nodoEfectivo)}
                      className="h-8 justify-start text-xs gap-2 font-medium cursor-pointer"
                    >
                      <Boxes className="h-3.5 w-3.5 text-primary" />
                      <span>Abrir Dashboard de esta oficina</span>
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
                        navigate('/documentos')
                      }}
                      className="h-8 justify-start text-xs gap-2 font-medium cursor-pointer"
                    >
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      <span>Ver Asuntos Pendientes (SGD)</span>
                      <ArrowRight className="h-3 w-3 ml-auto text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed p-8 text-center text-xs text-muted-foreground">
              Seleccione una carpeta en el árbol para inspeccionar sus datos.
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Componente recursivo que renderiza una carpeta y sus subcarpetas anidadas
 */
interface CarpetaNodoItemProps {
  nodo: NodoArbol
  nivel: number
  nodosExpandidos: Set<number>
  onToggle: (id: number) => void
  nodoActivoId: number | null
  nodoSeleccionadoId: number | null
  onSeleccionarNodo: (nodo: NodoArbol) => void
}

function CarpetaNodoItem({
  nodo,
  nivel,
  nodosExpandidos,
  onToggle,
  nodoActivoId,
  nodoSeleccionadoId,
  onSeleccionarNodo,
}: CarpetaNodoItemProps) {
  const tieneHijos = Boolean(nodo.hijos && nodo.hijos.length > 0)
  const estaExpandido = nodosExpandidos.has(nodo.id)
  const esActivo = nodoActivoId === nodo.id
  const esSeleccionado = nodoSeleccionadoId === nodo.id

  return (
    <div className="select-none">
      <div
        onClick={() => onSeleccionarNodo(nodo)}
        className={`group flex items-center gap-1.5 py-1.5 px-2 rounded-lg cursor-pointer text-xs transition-all ${
          esSeleccionado
            ? 'bg-primary/15 text-primary font-semibold ring-1 ring-primary/30'
            : esActivo
            ? 'bg-success-soft text-success-fg font-semibold'
            : 'hover:bg-muted text-foreground'
        }`}
        style={{ paddingLeft: `${nivel * 16 + 8}px` }}
      >
        {/* Toggle Flecha para expandir/colapsar */}
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
            <FolderOpen className="h-4 w-4 text-warning fill-amber-500/20 shrink-0" />
          ) : (
            <Folder className="h-4 w-4 text-warning fill-amber-500/10 shrink-0" />
          )
        ) : (
          <Folder className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}

        {/* Código y Nombre */}
        <span className="font-mono text-nota text-muted-foreground font-normal shrink-0">
          [{nodo.codigo}]
        </span>
        <span className="truncate flex-1">{nodo.nombre}</span>

        {/* Insignia si es Despacho Activo */}
        {esActivo && (
          <span className="px-1.5 py-0.2 rounded-full text-mini font-bold bg-success text-white shrink-0">
            Activo
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
              nodoActivoId={nodoActivoId}
              nodoSeleccionadoId={nodoSeleccionadoId}
              onSeleccionarNodo={onSeleccionarNodo}
            />
          ))}
        </div>
      )}
    </div>
  )
}
