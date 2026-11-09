import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck2,
  RefreshCw,
  Search,
} from 'lucide-react'

import { Can } from '@/auth/Can'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Spinner } from '@/components/ui/spinner'
import type {
  DependenciaResumen,
  EntregaItem,
  EstadoEntrega,
} from '@/types/transferencia'
import { useEntregas } from './use-entregas'

interface BandejaRevisorViewProps {
  onRevisar: (entrega: EntregaItem) => void
  onVerDetalle: (dependencia: DependenciaResumen) => void
}

export function BandejaRevisorView({ onRevisar, onVerDetalle }: BandejaRevisorViewProps) {
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [busqueda, setBusqueda] = useState<string>('')
  const [pagina, setPagina] = useState<number>(1)

  const { data: resp, isLoading, isError, refetch } = useEntregas({
    estado: filtroEstado !== 'todos' ? (filtroEstado as EstadoEntrega) : undefined,
    page: pagina,
    per_page: 15,
  })

  const entregas = resp?.data ?? []
  const meta = resp?.meta

  const rawList = resp?.data
  const entregasFiltradas = useMemo(() => {
    const list = rawList ?? []
    if (!busqueda.trim()) return list
    const q = busqueda.toLowerCase().trim()
    return list.filter((ent) => {
      const depNombre = ent.dependencia?.nombre?.toLowerCase() || ''
      const depCodigo = ent.dependencia?.codigo?.toLowerCase() || ''
      const emisor = ent.emisor?.name?.toLowerCase() || ''
      const comentario = ent.comentario?.toLowerCase() || ''
      return depNombre.includes(q) || depCodigo.includes(q) || emisor.includes(q) || comentario.includes(q)
    })
  }, [rawList, busqueda])

  // Contadores rápidos
  const totalEntregas = meta?.total ?? entregas.length
  const pendientesCount = entregas.filter((e) => e.estado === 'remitida' || e.estado === 'en_revision').length
  const consolidadasCount = entregas.filter((e) => e.estado === 'consolidada').length
  const observadasCount = entregas.filter((e) => e.estado === 'observada').length

  const renderBadgeEstado = (estado: EstadoEntrega) => {
    switch (estado) {
      case 'borrador':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground dark:bg-foreground dark:text-muted-foreground">
            Borrador
          </span>
        )
      case 'remitida':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-semibold text-warning-fg">
            <Clock className="h-3 w-3" />
            Remitida (Pendiente)
          </span>
        )
      case 'en_revision':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-info-soft px-2.5 py-0.5 text-xs font-semibold text-info-fg">
            <RefreshCw className="h-3 w-3" />
            En Revisión
          </span>
        )
      case 'observada':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2.5 py-0.5 text-xs font-semibold text-danger-fg">
            <AlertCircle className="h-3 w-3" />
            Observada
          </span>
        )
      case 'consolidada':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-semibold text-success-fg">
            <CheckCircle2 className="h-3 w-3" />
            Consolidada
          </span>
        )
      default:
        return <span className="text-xs text-muted-foreground">{estado}</span>
    }
  }

  return (
    <div className="space-y-4">
      {/* Tarjetas de Resumen Cuantitativo (KPIs del Revisor) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border shadow-xs">
          <CardHeader className="pb-1 pt-4">
            <CardDescription className="text-xs font-medium">Total en Ámbito</CardDescription>
            <CardTitle className="text-2xl font-bold">{totalEntregas}</CardTitle>
          </CardHeader>
          <CardContent className="pb-4 pt-0 text-nota text-muted-foreground">
            Entregas del subárbol asignado
          </CardContent>
        </Card>

        <Card className="border border-warning-border bg-warning-soft shadow-xs">
          <CardHeader className="pb-1 pt-4">
            <CardDescription className="text-xs font-medium text-warning-fg">
              Pendientes de Revisar
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-warning-fg">
              {pendientesCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 pt-0 text-nota text-warning-fg">
            Remitidas para su dictamen
          </CardContent>
        </Card>

        <Card className="border border-success-border bg-success-soft shadow-xs">
          <CardHeader className="pb-1 pt-4">
            <CardDescription className="text-xs font-medium text-success-fg">
              Consolidadas
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-success-fg">
              {consolidadasCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 pt-0 text-nota text-success-fg">
            Aprobadas e integradas
          </CardContent>
        </Card>

        <Card className="border border-danger-border bg-danger-soft shadow-xs">
          <CardHeader className="pb-1 pt-4">
            <CardDescription className="text-xs font-medium text-danger-fg">
              Observadas
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-danger-fg">
              {observadasCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 pt-0 text-nota text-danger-fg">
            En subsanación por el emisor
          </CardContent>
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
                  onChange={(e) => {
                    setFiltroEstado(e.target.value)
                    setPagina(1)
                  }}
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

      {/* Listado de Entregas Recibidas */}
      {isLoading ? (
        <Card className="p-12 text-center">
          <Spinner className="mx-auto h-8 w-8 text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Cargando bandeja de entregas...</p>
        </Card>
      ) : isError ? (
        <Card className="border-destructive/30 p-8 text-center text-destructive">
          <AlertCircle className="mx-auto h-8 w-8 mb-2" />
          <p className="font-semibold text-sm">Error al cargar las entregas</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4">
            Reintentar
          </Button>
        </Card>
      ) : entregasFiltradas.length === 0 ? (
        <Card className="border-dashed p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
            <CheckCircle2 className="h-6 w-6 text-success-fg" />
          </div>
          <h3 className="text-base font-semibold">Sin entregas pendientes en bandeja</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
            {busqueda || filtroEstado !== 'todos'
              ? 'No hay entregas que coincidan con los criterios de búsqueda seleccionados.'
              : 'No existen entregas pendientes de revisión en su ámbito de supervisión jerárquico.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {entregasFiltradas.map((entrega) => {
            const puedeRevisar = entrega.estado === 'remitida' || entrega.estado === 'en_revision'

            const fechaRemitida = entrega.remitida_en
              ? format(new Date(entrega.remitida_en), "dd/MM/yyyy 'a las' HH:mm", { locale: es })
              : null

            const fechaRevisada = entrega.revisada_en
              ? format(new Date(entrega.revisada_en), "dd/MM/yyyy HH:mm", { locale: es })
              : null

            return (
              <Card
                key={entrega.id}
                className={`border transition-shadow hover:shadow-xs ${
                  puedeRevisar ? 'border-warning-border bg-card' : 'bg-muted/15'
                }`}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col gap-3">
                    {/* Fila Superior */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted">
                          {entrega.dependencia?.codigo}
                        </span>
                        <span className="font-semibold text-sm text-foreground">
                          {entrega.dependencia?.nombre}
                        </span>
                        {renderBadgeEstado(entrega.estado)}
                      </div>

                      <div className="text-right text-xs text-muted-foreground">
                        {fechaRemitida && <span>Remitida el {fechaRemitida}</span>}
                        {entrega.emisor?.name && (
                          <span className="block font-medium text-foreground">
                            Por: {entrega.emisor.name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Fila Intermedia: Destino & Comentarios */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <span className="font-medium text-muted-foreground">Destino Jerárquico:</span>
                        <div className="flex items-center gap-1.5 text-foreground">
                          {entrega.dependencia_destino ? (
                            <span>
                              {entrega.dependencia_destino.codigo} · {entrega.dependencia_destino.nombre}
                            </span>
                          ) : (
                            <span className="font-semibold text-primary">
                              Equipo Técnico de Transferencia Saliente (ETTS Institucional)
                            </span>
                          )}
                        </div>
                      </div>

                      {entrega.comentario && (
                        <div className="space-y-1">
                          <span className="font-medium text-muted-foreground">
                            Comentario / Sustento de remisión:
                          </span>
                          <p className="rounded bg-background/80 border p-2 text-foreground italic">
                            "{entrega.comentario}"
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Dictamen si fue revisada */}
                    {fechaRevisada && entrega.receptor?.name && (
                      <div className="rounded border bg-muted/30 p-2.5 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          Revisada el {fechaRevisada} por {entrega.receptor.name}
                        </span>
                      </div>
                    )}

                    {/* Fila Inferior: Botones de Acción */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onVerDetalle(entrega.dependencia)}
                        className="h-8 gap-1.5 text-xs"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Examinar Anexos
                      </Button>

                      <div className="flex items-center gap-2">
                        {puedeRevisar && (
                          <Can permiso="entregas.revisar">
                            <Button
                              size="sm"
                              onClick={() => onRevisar(entrega)}
                              className="h-8 gap-1.5 text-xs bg-warning-soft hover:bg-warning-soft/90 text-warning-fg"
                            >
                              <FileCheck2 className="h-3.5 w-3.5" />
                              Dictaminar / Revisar
                            </Button>
                          </Can>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}

          {/* Paginación */}
          {meta && meta.last_page > 1 && (
            <div className="pt-2">
              <Pagination
                currentPage={meta.current_page}
                lastPage={meta.last_page}
                total={meta.total}
                from={meta.from}
                to={meta.to}
                onPageChange={(p) => setPagina(p)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
