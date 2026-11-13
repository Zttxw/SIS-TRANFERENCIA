import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  FileCheck2,
  Files,
  Folder,
  FolderOpen,
  FolderTree,
  RefreshCw,
  Search,
} from 'lucide-react'

import { Can } from '@/auth/Can'
import { useAuth } from '@/auth/hooks'
import { puedeConsultarActa } from '@/auth/sesion-runtime'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import type {
  DependenciaResumen,
  EntregaItem,
  EstadoEntrega,
} from '@/types/transferencia'
import type { TipoDocumentoFirma } from '@/features/firmaperu/firmaperu.types'
import { construirArbol, type NodoArbol } from './arbol-utils'
import { PanelAnexosDependencia } from './PanelAnexosDependencia'
import { useEntregas } from './use-entregas'

const ANEXOS_HOJA: TipoDocumentoFirma[] = ['anexo02', 'anexo03', 'anexo04', 'anexo05', 'anexo06', 'anexo07']

interface BandejaRevisorViewProps {
  onRevisar: (entrega: EntregaItem) => void
}

export function BandejaRevisorView({ onRevisar }: BandejaRevisorViewProps) {
  const { permisos } = useAuth()
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [busqueda, setBusqueda] = useState<string>('')
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set())
  // Dependencias cuyas hojas de anexo están desplegadas.
  const [anexosAbiertos, setAnexosAbiertos] = useState<Set<number>>(new Set())
  const anexosVisibles = useMemo(
    () => ANEXOS_HOJA.filter((tipo) => tipo !== 'anexo07' || puedeConsultarActa(permisos)),
    [permisos],
  )

  // El árbol necesita todas las entregas del ámbito a la vez (no paginadas); se
  // excluyen las dependencias propias del usuario (no se revisa la propia entrega).
  const { data: resp, isLoading, isError, refetch } = useEntregas({ per_page: 100, excluir_propias: true })

  const entregas = useMemo(() => resp?.data ?? [], [resp?.data])

  // Índice entrega por dependencia (la última de cada dependencia manda el estado).
  const entregaPorDep = useMemo(() => {
    const mapa = new Map<number, EntregaItem>()
    for (const ent of entregas) {
      if (ent.dependencia?.id != null) mapa.set(ent.dependencia.id, ent)
    }
    return mapa
  }, [entregas])

  // Jerarquía de carpetas (como el Anexo 1) a partir de las dependencias con entrega.
  const arbol = useMemo(() => {
    const deps = entregas.map((e) => e.dependencia).filter((d): d is DependenciaResumen => Boolean(d))
    // Deduplicar por id antes de construir el árbol.
    const unicas = Array.from(new Map(deps.map((d) => [d.id, d])).values())
    return construirArbol(unicas)
  }, [entregas])

  const arbolFiltrado = useMemo(
    () => filtrarArbolBandeja(arbol, entregaPorDep, busqueda, filtroEstado),
    [arbol, entregaPorDep, busqueda, filtroEstado],
  )

  // Contadores rápidos (sobre todas las entregas del ámbito).
  const totalEntregas = entregas.length
  const pendientesCount = entregas.filter((e) => (e.estado === 'remitida' || e.estado === 'en_revision') && e.puede_revisar).length
  const consolidadasCount = entregas.filter((e) => e.estado === 'consolidada').length
  const observadasCount = entregas.filter((e) => e.estado === 'observada').length

  const toggleExpandido = (id: number) => {
    setExpandidos((prev) => {
      const nuevo = new Set(prev)
      if (nuevo.has(id)) nuevo.delete(id)
      else nuevo.add(id)
      return nuevo
    })
  }

  const expandirTodos = () => setExpandidos(new Set(entregas.map((e) => e.dependencia?.id).filter((v): v is number => v != null)))
  const colapsarTodos = () => { setExpandidos(new Set()); setAnexosAbiertos(new Set()) }

  const toggleAnexos = (id: number) => {
    setAnexosAbiertos((prev) => {
      const nuevo = new Set(prev)
      if (nuevo.has(id)) nuevo.delete(id)
      else nuevo.add(id)
      return nuevo
    })
  }

  return (
    <div className="space-y-4">
      {/* KPIs del Revisor */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border shadow-xs">
          <CardHeader className="pb-1 pt-4">
            <CardDescription className="text-xs font-medium">Total en Ámbito</CardDescription>
            <CardTitle className="text-2xl font-bold">{totalEntregas}</CardTitle>
          </CardHeader>
          <CardContent className="pb-4 pt-0 text-nota text-muted-foreground">
            Entregas de su subárbol subordinado
          </CardContent>
        </Card>

        <Card className="border border-warning-border bg-warning-soft shadow-xs">
          <CardHeader className="pb-1 pt-4">
            <CardDescription className="text-xs font-medium text-warning-fg">
              Pendientes de Revisar
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-warning-fg">{pendientesCount}</CardTitle>
          </CardHeader>
          <CardContent className="pb-4 pt-0 text-nota text-warning-fg">
            Remitidas a usted para su dictamen
          </CardContent>
        </Card>

        <Card className="border border-success-border bg-success-soft shadow-xs">
          <CardHeader className="pb-1 pt-4">
            <CardDescription className="text-xs font-medium text-success-fg">Consolidadas</CardDescription>
            <CardTitle className="text-2xl font-bold text-success-fg">{consolidadasCount}</CardTitle>
          </CardHeader>
          <CardContent className="pb-4 pt-0 text-nota text-success-fg">Aprobadas e integradas</CardContent>
        </Card>

        <Card className="border border-danger-border bg-danger-soft shadow-xs">
          <CardHeader className="pb-1 pt-4">
            <CardDescription className="text-xs font-medium text-danger-fg">Observadas</CardDescription>
            <CardTitle className="text-2xl font-bold text-danger-fg">{observadasCount}</CardTitle>
          </CardHeader>
          <CardContent className="pb-4 pt-0 text-nota text-danger-fg">En subsanación por el emisor</CardContent>
        </Card>
      </div>

      {/* Barra de Filtros */}
      <Card className="border shadow-xs">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Estado:</span>
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="todos">Todos los estados</option>
                  <option value="remitida">Remitidas (Pendientes)</option>
                  <option value="en_revision">En Revisión</option>
                  <option value="consolidada">Consolidadas</option>
                  <option value="observada">Observadas</option>
                  <option value="borrador">Borrador</option>
                </select>
              </div>

              <Button variant="outline" size="sm" onClick={expandirTodos} className="h-8 text-xs">Expandir Todo</Button>
              <Button variant="outline" size="sm" onClick={colapsarTodos} className="h-8 text-xs">Colapsar Todo</Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
                className="h-8 gap-1.5 text-xs"
              >
                <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>

            <div className="relative min-w-[240px]">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, dependencia o emisor..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-8 text-xs h-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bandeja jerárquica */}
      {isLoading ? (
        <Card className="p-12 text-center">
          <Spinner className="mx-auto h-8 w-8 text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Cargando bandeja de entregas...</p>
        </Card>
      ) : isError ? (
        <Card className="border-destructive/30 p-8 text-center text-destructive">
          <AlertCircle className="mx-auto h-8 w-8 mb-2" />
          <p className="font-semibold text-sm">Error al cargar las entregas</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4">Reintentar</Button>
        </Card>
      ) : arbolFiltrado.length === 0 ? (
        <Card className="border-dashed p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
            <CheckCircle2 className="h-6 w-6 text-success-fg" />
          </div>
          <h3 className="text-base font-semibold">Sin entregas en bandeja</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
            {busqueda || filtroEstado !== 'todos'
              ? 'No hay entregas que coincidan con los criterios seleccionados.'
              : 'No existen entregas de dependencias subordinadas en su ámbito de supervisión.'}
          </p>
        </Card>
      ) : (
        <Card className="border shadow-xs">
          <CardHeader className="pb-3 border-b bg-muted/15">
            <div className="flex items-center gap-2">
              <FolderTree className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">
                Entregas de su subárbol jerárquico
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            <div className="space-y-1">
              {arbolFiltrado.map((nodo) => (
                <ItemNodoEntrega
                  key={nodo.id}
                  nodo={nodo}
                  nivel={0}
                  expandidos={expandidos}
                  anexosAbiertos={anexosAbiertos}
                  anexosVisibles={anexosVisibles}
                  entregaPorDep={entregaPorDep}
                  onToggle={toggleExpandido}
                  onToggleAnexos={toggleAnexos}
                  onRevisar={onRevisar}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/**
 * Filtra el árbol conservando un nodo si él o algún descendiente coincide con la
 * búsqueda y el filtro de estado. Los nodos intermedios sin entrega propia se
 * mantienen como carpetas si tienen descendientes visibles.
 */
function filtrarArbolBandeja(
  nodos: NodoArbol[],
  entregaPorDep: Map<number, EntregaItem>,
  busqueda: string,
  filtroEstado: string,
): NodoArbol[] {
  const q = busqueda.toLowerCase().trim()
  const resultado: NodoArbol[] = []

  for (const nodo of nodos) {
    const entrega = entregaPorDep.get(nodo.id)
    const hijos = filtrarArbolBandeja(nodo.hijos, entregaPorDep, busqueda, filtroEstado)

    const coincideBusqueda = !q
      || nodo.codigo.toLowerCase().includes(q)
      || nodo.nombre.toLowerCase().includes(q)
      || (entrega?.emisor?.name?.toLowerCase().includes(q) ?? false)

    const coincideEstado = filtroEstado === 'todos' || entrega?.estado === filtroEstado

    const propioVisible = Boolean(entrega) && coincideBusqueda && coincideEstado

    if (propioVisible || hijos.length > 0) {
      resultado.push({ ...nodo, hijos })
    }
  }

  return resultado
}

interface ItemNodoEntregaProps {
  nodo: NodoArbol
  nivel: number
  expandidos: Set<number>
  anexosAbiertos: Set<number>
  anexosVisibles: TipoDocumentoFirma[]
  entregaPorDep: Map<number, EntregaItem>
  onToggle: (id: number) => void
  onToggleAnexos: (id: number) => void
  onRevisar: (entrega: EntregaItem) => void
}

function ItemNodoEntrega({
  nodo,
  nivel,
  expandidos,
  anexosAbiertos,
  anexosVisibles,
  entregaPorDep,
  onToggle,
  onToggleAnexos,
  onRevisar,
}: ItemNodoEntregaProps) {
  const tieneHijos = nodo.hijos.length > 0
  const estaExpandido = expandidos.has(nodo.id)
  const entrega = entregaPorDep.get(nodo.id)
  const anexosVisible = anexosAbiertos.has(nodo.id)
  const puedeRevisar = Boolean(entrega?.puede_revisar) && (entrega?.estado === 'remitida' || entrega?.estado === 'en_revision')

  const fechaRemitida = entrega?.remitida_en
    ? format(new Date(entrega.remitida_en), "dd/MM/yyyy HH:mm", { locale: es })
    : null

  const FolderIcon = estaExpandido && tieneHijos ? FolderOpen : Folder

  return (
    <div className="select-none">
      <div
        className={`group flex flex-wrap items-center justify-between gap-2 rounded-lg p-2 text-xs transition-colors ${
          puedeRevisar ? 'bg-warning-soft/40 border border-warning-border' : 'hover:bg-muted/50 border border-transparent'
        }`}
        style={{ paddingLeft: `${nivel * 20 + 8}px` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {tieneHijos ? (
            <button
              type="button"
              onClick={() => onToggle(nodo.id)}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={estaExpandido ? 'Colapsar' : 'Expandir'}
            >
              {estaExpandido ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          ) : (
            <div className="h-5 w-5 shrink-0" />
          )}

          <FolderIcon className={`h-4 w-4 shrink-0 ${entrega ? 'text-primary' : 'text-muted-foreground'}`} />

          <span className="font-mono text-nota font-semibold px-1.5 py-0.5 rounded bg-muted">{nodo.codigo}</span>
          <span className="truncate text-foreground font-medium">{nodo.nombre}</span>

          {entrega ? <BadgeEstado estado={entrega.estado} /> : (
            <span className="text-nota text-muted-foreground italic">Dependencia intermedia</span>
          )}

          {fechaRemitida && (
            <span className="hidden md:inline text-nota text-muted-foreground">· Remitida {fechaRemitida}</span>
          )}
          {entrega?.emisor?.name && (
            <span className="hidden lg:inline text-nota text-muted-foreground">· Por: {entrega.emisor.name}</span>
          )}
        </div>

        {entrega && (
          <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className={`h-7 px-2 text-nota gap-1 ${anexosVisible ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => onToggleAnexos(nodo.id)}
              aria-expanded={anexosVisible}
            >
              <Files className="h-3 w-3" />
              Anexos
              {anexosVisible ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>

            {puedeRevisar && (
              <Can permiso="entregas.revisar">
                <Button
                  size="sm"
                  className="h-7 px-2 text-nota gap-1 bg-warning-soft hover:bg-warning-soft/90 text-warning-fg"
                  onClick={() => onRevisar(entrega)}
                >
                  <FileCheck2 className="h-3 w-3" />
                  Dictaminar
                </Button>
              </Can>
            )}
          </div>
        )}
      </div>

      {/* Zona desplegada: datos adicionales + descargar todo + hojas (perezoso). */}
      {entrega && anexosVisible && (
        <PanelAnexosDependencia
          entrega={entrega}
          dependenciaId={nodo.id}
          anexos={anexosVisibles}
          nivel={nivel}
        />
      )}

      {tieneHijos && estaExpandido && (
        <div className="space-y-1 mt-0.5">
          {nodo.hijos.map((hijo) => (
            <ItemNodoEntrega
              key={hijo.id}
              nodo={hijo}
              nivel={nivel + 1}
              expandidos={expandidos}
              anexosAbiertos={anexosAbiertos}
              anexosVisibles={anexosVisibles}
              entregaPorDep={entregaPorDep}
              onToggle={onToggle}
              onToggleAnexos={onToggleAnexos}
              onRevisar={onRevisar}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function BadgeEstado({ estado }: { estado: EstadoEntrega }) {
  switch (estado) {
    case 'borrador':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-nota font-medium text-foreground dark:bg-foreground dark:text-muted-foreground">
          Borrador
        </span>
      )
    case 'remitida':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-nota font-semibold text-warning-fg">
          <Clock className="h-3 w-3" /> Remitida (Pendiente)
        </span>
      )
    case 'en_revision':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-info-soft px-2 py-0.5 text-nota font-semibold text-info-fg">
          <RefreshCw className="h-3 w-3" /> En Revisión
        </span>
      )
    case 'observada':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2 py-0.5 text-nota font-semibold text-danger-fg">
          <AlertCircle className="h-3 w-3" /> Observada
        </span>
      )
    case 'consolidada':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-nota font-semibold text-success-fg">
          <CheckCircle2 className="h-3 w-3" /> Consolidada
        </span>
      )
    default:
      return <span className="text-nota text-muted-foreground">{estado}</span>
  }
}
