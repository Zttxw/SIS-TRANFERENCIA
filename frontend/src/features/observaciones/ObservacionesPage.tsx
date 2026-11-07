import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  AlertCircle,
  Archive,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  MessageSquareWarning,
  Package,
  PackageOpen,
  Plus,
  RefreshCw,
  Search,
  Users,
  XCircle,
} from 'lucide-react'

import { Can } from '@/auth/Can'
import { useDependenciaActiva } from '@/auth/hooks'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Spinner } from '@/components/ui/spinner'
import {
  ANEXOS_OBSERVABLES_CONFIG,
  type ClaveAnexoObservable,
  type EstadoObservacion,
  formatearDetalleObservable,
  type Observacion,
  resolverAnexoDesdeTipo,
} from '@/types/observaciones'
import { RegistrarObservacionModal } from './RegistrarObservacionModal'
import { SubsanarObservacionModal } from './SubsanarObservacionModal'
import { useDesestimarObservacion, useObservaciones } from './use-observaciones'

export function ObservacionesPage() {
  const { dependenciaId } = useDependenciaActiva()

  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [filtroAnexo, setFiltroAnexo] = useState<string>('todos')
  const [busqueda, setBusqueda] = useState<string>('')
  const [pagina, setPagina] = useState<number>(1)
  const [filtrarPorDependenciaActiva, setFiltrarPorDependenciaActiva] = useState<boolean>(
    Boolean(dependenciaId),
  )

  // Modales
  const [modalRegistroAbierto, setModalRegistroAbierto] = useState(false)
  const [observacionASubsanar, setObservacionASubsanar] = useState<Observacion | null>(null)
  const [observacionADesestimar, setObservacionADesestimar] = useState<Observacion | null>(null)

  const desestimarMut = useDesestimarObservacion()

  const depFiltro = filtrarPorDependenciaActiva && dependenciaId ? dependenciaId : undefined

  const { data: resp, isLoading, isError, refetch } = useObservaciones({
    dependencia_id: depFiltro,
    anexo: filtroAnexo !== 'todos' ? (filtroAnexo as ClaveAnexoObservable) : undefined,
    estado: filtroEstado !== 'todos' ? (filtroEstado as EstadoObservacion) : undefined,
    page: pagina,
    per_page: 15,
  })

  const observaciones = resp?.data ?? []
  const meta = resp?.meta

  // Filtrado local adicional por término de búsqueda (descripción, nombre, observable)
  const rawList = resp?.data
  const observacionesFiltradas = useMemo(() => {
    const list = rawList ?? []
    if (!busqueda.trim()) return list
    const q = busqueda.toLowerCase().trim()
    return list.filter((obs) => {
      const desc = obs.descripcion.toLowerCase()
      const autor = obs.autor?.name?.toLowerCase() || ''
      const respTxt = obs.respuesta_subsanacion?.toLowerCase() || ''
      const detalle = formatearDetalleObservable(obs).toLowerCase()
      return desc.includes(q) || autor.includes(q) || respTxt.includes(q) || detalle.includes(q)
    })
  }, [rawList, busqueda])

  // Contadores para métricas rápidas basados en los datos visibles o totales
  const totalObs = meta?.total ?? observaciones.length
  const abiertasCount = observaciones.filter((o) => o.estado === 'abierta').length
  const subsanadasCount = observaciones.filter((o) => o.estado === 'subsanada').length
  const desestimadasCount = observaciones.filter((o) => o.estado === 'desestimada').length

  const handleConfirmarDesestimar = () => {
    if (!observacionADesestimar) return
    desestimarMut.mutate(observacionADesestimar.id, {
      onSuccess: () => {
        setObservacionADesestimar(null)
      },
    })
  }

  const renderIconoAnexo = (clave: ClaveAnexoObservable) => {
    switch (clave) {
      case 'documento':
        return <FileText className="h-3.5 w-3.5 text-blue-600" />
      case 'gestion':
        return <AlertCircle className="h-3.5 w-3.5 text-indigo-600" />
      case 'acervo':
        return <Archive className="h-3.5 w-3.5 text-amber-600" />
      case 'patrimonio':
        return <Package className="h-3.5 w-3.5 text-emerald-600" />
      case 'personal':
        return <Users className="h-3.5 w-3.5 text-purple-600" />
      case 'nopatrimonial':
        return <PackageOpen className="h-3.5 w-3.5 text-rose-600" />
      default:
        return <FileText className="h-3.5 w-3.5" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
              Directiva N.° 001-2026-MDSJ/A · §7.9
            </span>
            <span className="text-xs text-muted-foreground">Ciclo de Control y Subsanación</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Bandeja General de Observaciones
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitoreo, registro, subsanación y re-remisión de observaciones técnicas sobre los
            anexos de la transferencia.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>

          <Can permiso="observaciones.registrar">
            <Button
              size="sm"
              onClick={() => setModalRegistroAbierto(true)}
              className="gap-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Formular Observación
            </Button>
          </Can>
        </div>
      </div>

      {/* Tarjetas de Resumen Cuantitativo (KPIs) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border shadow-xs">
          <CardHeader className="pb-1 pt-4">
            <CardDescription className="text-xs font-medium">Total en Bandeja</CardDescription>
            <CardTitle className="text-2xl font-bold">{totalObs}</CardTitle>
          </CardHeader>
          <CardContent className="pb-4 pt-0 text-[11px] text-muted-foreground">
            {filtrarPorDependenciaActiva ? 'En centro de costo activo' : 'Ámbito institucional'}
          </CardContent>
        </Card>

        <Card className="border border-amber-500/20 bg-amber-500/5 shadow-xs">
          <CardHeader className="pb-1 pt-4">
            <CardDescription className="text-xs font-medium text-amber-700 dark:text-amber-400">
              Pendientes / Abiertas
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-700 dark:text-amber-400">
              {abiertasCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 pt-0 text-[11px] text-amber-600/80 dark:text-amber-400/80">
            Requieren sustento de subsanación
          </CardContent>
        </Card>

        <Card className="border border-emerald-500/20 bg-emerald-500/5 shadow-xs">
          <CardHeader className="pb-1 pt-4">
            <CardDescription className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Subsanadas
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {subsanadasCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 pt-0 text-[11px] text-emerald-600/80 dark:text-emerald-400/80">
            Con respuesta técnica aceptada
          </CardContent>
        </Card>

        <Card className="border border-slate-500/20 bg-slate-500/5 shadow-xs">
          <CardHeader className="pb-1 pt-4">
            <CardDescription className="text-xs font-medium text-slate-700 dark:text-slate-400">
              Desestimadas
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-700 dark:text-slate-400">
              {desestimadasCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 pt-0 text-[11px] text-slate-600/80 dark:text-slate-400/80">
            Cerradas sin subsanación
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <Card className="border shadow-xs">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Filtro Estado */}
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
                  <option value="abierta">Abiertas / Pendientes</option>
                  <option value="en_subsanacion">En subsanación</option>
                  <option value="subsanada">Subsanadas</option>
                  <option value="desestimada">Desestimadas</option>
                </select>
              </div>

              {/* Filtro Anexo */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Anexo:</span>
                <select
                  value={filtroAnexo}
                  onChange={(e) => {
                    setFiltroAnexo(e.target.value)
                    setPagina(1)
                  }}
                  className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="todos">Todos los anexos</option>
                  {Object.values(ANEXOS_OBSERVABLES_CONFIG).map((cfg) => (
                    <option key={cfg.clave} value={cfg.clave}>
                      {cfg.nombreCorto}
                    </option>
                  ))}
                </select>
              </div>

              {/* Toggle de acotación a centro de costo activo */}
              {dependenciaId && (
                <button
                  type="button"
                  onClick={() => {
                    setFiltrarPorDependenciaActiva(!filtrarPorDependenciaActiva)
                    setPagina(1)
                  }}
                  className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                    filtrarPorDependenciaActiva
                      ? 'border-primary/50 bg-primary/10 text-primary font-medium'
                      : 'border-input bg-background text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  <Filter className="h-3 w-3" />
                  {filtrarPorDependenciaActiva ? 'Solo mi centro de costo' : 'Todo el ámbito'}
                </button>
              )}
            </div>

            {/* Buscador de texto libre */}
            <div className="relative min-w-[240px]">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por descripción o responsable..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-8 text-xs h-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contenido Principal: Listado de Observaciones */}
      {isLoading ? (
        <Card className="p-12 text-center">
          <Spinner className="mx-auto h-8 w-8 text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Cargando bandeja de observaciones...</p>
        </Card>
      ) : isError ? (
        <Card className="border-destructive/30 p-8 text-center text-destructive">
          <AlertCircle className="mx-auto h-8 w-8 mb-2" />
          <p className="font-semibold text-sm">Error al cargar las observaciones</p>
          <p className="text-xs text-muted-foreground mt-1">
            Verifique la conexión o intente nuevamente.
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4">
            Reintentar
          </Button>
        </Card>
      ) : observacionesFiltradas.length === 0 ? (
        <Card className="border-dashed p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          </div>
          <h3 className="text-base font-semibold">Sin observaciones registradas</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
            {busqueda || filtroAnexo !== 'todos' || filtroEstado !== 'todos'
              ? 'No hay observaciones que coincidan con los filtros seleccionados.'
              : 'No existen observaciones formuladas en el ámbito actual. Las entregas se encuentran conformes para su revisión.'}
          </p>
          {(busqueda || filtroAnexo !== 'todos' || filtroEstado !== 'todos') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setBusqueda('')
                setFiltroAnexo('todos')
                setFiltroEstado('todos')
              }}
              className="mt-4 text-xs"
            >
              Restablecer filtros
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {observacionesFiltradas.map((obs) => {
            const anexoCfg = resolverAnexoDesdeTipo(obs.observable_type)
            const detalleObservable = formatearDetalleObservable(obs)
            const fechaCreacion = obs.created_at
              ? format(new Date(obs.created_at), "dd/MM/yyyy 'a las' HH:mm", { locale: es })
              : 'Fecha no disponible'

            const esAbierta = obs.estado === 'abierta' || obs.estado === 'en_subsanacion'

            return (
              <Card
                key={obs.id}
                className={`border transition-shadow hover:shadow-xs ${
                  esAbierta ? 'border-amber-500/30 bg-card' : 'bg-muted/15'
                }`}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col gap-3">
                    {/* Fila Superior: Badges y Metadatos */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Badge de Anexo */}
                        <div className="flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1 text-xs font-semibold shadow-2xs">
                          {renderIconoAnexo(anexoCfg.clave)}
                          <span>{anexoCfg.nombreCorto}</span>
                        </div>

                        {/* ID o referencia del elemento observable */}
                        <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                          {detalleObservable}
                        </span>

                        {/* Badge de Estado */}
                        {obs.estado === 'abierta' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            <Clock className="h-3 w-3" />
                            Abierta / Pendiente
                          </span>
                        )}
                        {obs.estado === 'en_subsanacion' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                            <RefreshCw className="h-3 w-3" />
                            En subsanación
                          </span>
                        )}
                        {obs.estado === 'subsanada' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" />
                            Subsanada
                          </span>
                        )}
                        {obs.estado === 'desestimada' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            <XCircle className="h-3 w-3" />
                            Desestimada
                          </span>
                        )}
                      </div>

                      {/* Autor y Fecha */}
                      <div className="text-right text-xs text-muted-foreground">
                        <span>Formulada el {fechaCreacion}</span>
                        {obs.autor?.name && (
                          <span className="block font-medium text-foreground">
                            Por: {obs.autor.name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Cuerpo: Descripción de la Observación */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                        <MessageSquareWarning className="h-3.5 w-3.5 text-amber-600" />
                        <span>Detalle de la Observación:</span>
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed rounded-md bg-muted/30 p-3 border">
                        {obs.descripcion}
                      </p>
                    </div>

                    {/* Si ya está subsanada: Sustento de subsanación */}
                    {obs.respuesta_subsanacion && (
                      <div className="rounded-md border border-emerald-500/30 bg-emerald-50/50 p-3 text-xs dark:bg-emerald-950/20 dark:border-emerald-900/40">
                        <div className="flex items-center justify-between font-semibold text-emerald-900 dark:text-emerald-300 mb-1">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            Sustento de Subsanación:
                          </span>
                          {obs.subsanada_en && (
                            <span className="text-[11px] font-normal text-muted-foreground">
                              {format(new Date(obs.subsanada_en), "dd/MM/yyyy HH:mm", {
                                locale: es,
                              })}
                              {obs.responsable?.name ? ` · Por: ${obs.responsable.name}` : ''}
                            </span>
                          )}
                        </div>
                        <p className="text-emerald-950 dark:text-emerald-200 whitespace-pre-wrap">
                          {obs.respuesta_subsanacion}
                        </p>
                      </div>
                    )}

                    {/* Pie de tarjeta: Acciones de ciclo de vida */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t mt-1">
                      <Link
                        to={anexoCfg.ruta}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        Ir al {anexoCfg.nombreCorto}
                        <ArrowRight className="h-3 w-3" />
                      </Link>

                      <div className="flex items-center gap-2">
                        {/* Acción de subsanación */}
                        {esAbierta && (
                          <Can permiso="observaciones.subsanar">
                            <Button
                              size="sm"
                              onClick={() => setObservacionASubsanar(obs)}
                              className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Subsanar
                            </Button>
                          </Can>
                        )}

                        {/* Acción de desestimar */}
                        {esAbierta && (
                          <Can permiso="observaciones.registrar">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setObservacionADesestimar(obs)}
                              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-destructive"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Desestimar
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

          {/* Barra de Paginación */}
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

      {/* Modal Registrar Observación */}
      <RegistrarObservacionModal
        open={modalRegistroAbierto}
        onClose={() => setModalRegistroAbierto(false)}
      />

      {/* Modal Subsanar Observación */}
      <SubsanarObservacionModal
        observacion={observacionASubsanar}
        open={Boolean(observacionASubsanar)}
        onClose={() => setObservacionASubsanar(null)}
      />

      {/* Diálogo de Confirmación para Desestimar */}
      <Dialog
        open={Boolean(observacionADesestimar)}
        onClose={() => setObservacionADesestimar(null)}
        title={`¿Desestimar Observación #${observacionADesestimar?.id}?`}
        description="Esta acción cerrará la observación formal sin requerir informe de subsanación técnica."
      >
        <div className="space-y-4 py-2">
          <div className="rounded-md border bg-muted/40 p-3 text-xs space-y-1.5">
            <p className="font-medium text-foreground">
              {observacionADesestimar &&
                resolverAnexoDesdeTipo(observacionADesestimar.observable_type).nombreCorto}
            </p>
            <p className="text-muted-foreground line-clamp-3">
              "{observacionADesestimar?.descripcion}"
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setObservacionADesestimar(null)}
              disabled={desestimarMut.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={desestimarMut.isPending}
              onClick={handleConfirmarDesestimar}
            >
              {desestimarMut.isPending ? 'Desestimando...' : 'Confirmar y Desestimar'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
