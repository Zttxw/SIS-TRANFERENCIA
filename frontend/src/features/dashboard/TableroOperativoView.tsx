import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Boxes,
  Building2,
  Calendar,
  Clock,
  FileCheck2,
  FolderTree,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useTableroOperativo } from './use-dashboard'

interface TableroOperativoViewProps {
  onSeleccionarDependencia: (id: number) => void
}

type FiltroEstado = 'todos' | 'consolidada' | 'remitida' | 'observada' | 'borrador'

export function TableroOperativoView({ onSeleccionarDependencia }: TableroOperativoViewProps) {
  const { data: tablero, isLoading, error, refetch, isFetching } = useTableroOperativo()

  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos')
  const [filtroNivel, setFiltroNivel] = useState<number | 'todos'>('todos')

  // Filtrado reactivo en tiempo real
  const dependenciasLista = tablero?.dependencias
  const dependenciasFiltradas = useMemo(() => {
    if (!dependenciasLista) return []

    return dependenciasLista.filter((dep) => {
      // Filtro de texto
      const texto = busqueda.toLowerCase().trim()
      const coincideTexto =
        texto === '' ||
        dep.codigo.toLowerCase().includes(texto) ||
        dep.nombre.toLowerCase().includes(texto) ||
        (dep.encargado?.nombres || '').toLowerCase().includes(texto) ||
        (dep.encargado?.apellidos || '').toLowerCase().includes(texto)

      // Filtro de estado de entrega
      const coincideEstado =
        filtroEstado === 'todos' || dep.estado_entrega === filtroEstado

      // Filtro de nivel
      const coincideNivel =
        filtroNivel === 'todos' || dep.nivel === filtroNivel

      return coincideTexto && coincideEstado && coincideNivel
    })
  }, [dependenciasLista, busqueda, filtroEstado, filtroNivel])

  if (isLoading) {
    return (
      <div className="flex min-h-[450px] flex-col items-center justify-center gap-3">
        <Spinner className="h-8 w-8 text-primary" />
        <p className="text-xs text-muted-foreground font-medium">
          Cargando tablero operativo institucional...
        </p>
      </div>
    )
  }

  if (error || !tablero) {
    return (
      <Card className="border-destructive/30 p-8 text-center bg-destructive/5">
        <AlertTriangle className="mx-auto h-8 w-8 text-destructive mb-2" />
        <h3 className="font-semibold text-sm text-foreground">
          No se pudo cargar el tablero operativo
        </h3>
        <p className="text-xs text-muted-foreground mt-1 mb-4">
          Ocurrió un error al consultar las métricas consolidadas de las dependencias.
        </p>
        <Button size="sm" variant="outline" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          Reintentar consulta
        </Button>
      </Card>
    )
  }

  const { metricas } = tablero

  // Porcentajes para barra semáforo institucional
  const pctConsolidada =
    metricas.total_dependencias > 0
      ? Math.round((metricas.consolidadas / metricas.total_dependencias) * 100)
      : 0
  const pctRemitida =
    metricas.total_dependencias > 0
      ? Math.round((metricas.remitidas / metricas.total_dependencias) * 100)
      : 0
  const pctObservada =
    metricas.total_dependencias > 0
      ? Math.round((metricas.observadas / metricas.total_dependencias) * 100)
      : 0
  const pctBorrador =
    metricas.total_dependencias > 0
      ? Math.max(0, 100 - pctConsolidada - pctRemitida - pctObservada)
      : 0

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* ========================================================
          BARRA DE CONTEXTO SUPERIOR Y PLAZOS INSTITUCIONALES
          ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs border-b border-border pb-3">
        <div className="flex items-center gap-2 flex-wrap text-muted-foreground">
          <span className="font-semibold text-foreground uppercase tracking-tight">
            Administración Institucional · ETTS
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-primary font-semibold">
            {metricas.total_dependencias} Centros de Costo
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="font-semibold text-foreground">Supervisión Pliego 2026</span>
        </div>

        {/* Píldoras de plazo normativo */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted text-foreground font-mono text-nota font-medium border border-border">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span>
              Fecha de corte: <strong className="text-foreground">31/10/2026</strong>
            </span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-warning-soft text-warning-fg font-mono text-nota font-semibold border border-warning-border">
            <Clock className="h-3.5 w-3.5 text-warning-fg" />
            <span>
              Plazo de entrega: <strong className="text-warning-fg">07/11/2026</strong>
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================
          TÍTULO Y ACCIONES DE MONITOREO
          ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Monitoreo Institucional de Transferencia
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Supervisión en tiempo real de los 107 centros de costo, verificación de anexos normativos y consolidación del pliego.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 text-xs gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </Button>

          <Link to="/organigrama">
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-primary hover:bg-primary-hover text-white cursor-pointer"
            >
              <FolderTree className="h-3.5 w-3.5" />
              <span>Ver Organigrama</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ========================================================
          LAYOUT PRINCIPAL: DOS COLUMNAS (8 COLS + 4 COLS)
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ========================================================
            COLUMNA IZQUIERDA: SUPERVISIÓN OPERATIVA DE OFICINAS
            ======================================================== */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="border shadow-xs overflow-hidden">
            <CardHeader className="p-4 border-b border-border bg-muted space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span>Centros de Costo y Unidades Orgánicas ({dependenciasFiltradas.length})</span>
                </CardTitle>
                <span className="text-nota font-mono text-primary font-semibold">
                  Directorio Institucional MDSJ
                </span>
              </div>

              {/* Barra de Filtros de Estado */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setFiltroEstado('todos')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                    filtroEstado === 'todos'
                      ? 'bg-foreground text-background font-semibold'
                      : 'bg-background border border-border text-foreground hover:bg-muted'
                  }`}
                >
                  Todas ({metricas.total_dependencias})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroEstado('consolidada')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${
                    filtroEstado === 'consolidada'
                      ? 'bg-success text-white font-semibold'
                      : 'bg-success-soft text-success-fg border border-success-border hover:bg-success-soft'
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  Consolidadas ({metricas.consolidadas})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroEstado('remitida')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${
                    filtroEstado === 'remitida'
                      ? 'bg-info text-white font-semibold'
                      : 'bg-info-soft text-info-fg border border-info-border hover:bg-info-soft'
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-info" />
                  Remitidas ({metricas.remitidas})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroEstado('observada')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${
                    filtroEstado === 'observada'
                      ? 'bg-warning text-warning-fg font-semibold'
                      : 'bg-warning-soft text-warning-fg border border-warning-border hover:bg-warning-soft'
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                  Observadas ({metricas.observadas})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroEstado('borrador')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${
                    filtroEstado === 'borrador'
                      ? 'bg-foreground text-background font-semibold'
                      : 'bg-muted text-foreground hover:bg-muted'
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-muted" />
                  Borrador ({metricas.borrador})
                </button>
              </div>

              {/* Buscador y Filtro por Nivel */}
              <div className="pt-1 flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por código (ej. 01.03), nombre de oficina o responsable..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="pl-8 text-xs h-8 bg-background"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-nota text-muted-foreground whitespace-nowrap">Nivel:</span>
                  <select
                    value={filtroNivel}
                    onChange={(e) =>
                      setFiltroNivel(e.target.value === 'todos' ? 'todos' : Number(e.target.value))
                    }
                    className="h-8 rounded-lg border border-input bg-background px-2 text-xs focus:ring-1 focus:ring-primary"
                  >
                    <option value="todos">Todos los niveles</option>
                    <option value="1">Nivel 1 (Alcaldía / Concejo)</option>
                    <option value="2">Nivel 2 (Gerencia Municipal)</option>
                    <option value="3">Nivel 3 (Gerencias de Línea)</option>
                    <option value="4">Nivel 4 (Subgerencias / Oficinas)</option>
                  </select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[580px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted/40 text-muted-foreground border-b border-border text-nota uppercase font-semibold sticky top-0 bg-muted z-10 shadow-xs">
                    <tr>
                      <th className="py-2.5 px-3">Estado</th>
                      <th className="py-2.5 px-3">Código</th>
                      <th className="py-2.5 px-3">Centro de Costo</th>
                      <th className="py-2.5 px-3">Responsable Oficial</th>
                      <th className="py-2.5 px-3">Patrimonio SIGA</th>
                      <th className="py-2.5 px-3 text-center">Obs.</th>
                      <th className="py-2.5 px-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {dependenciasFiltradas.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-muted-foreground text-xs">
                          No se encontraron dependencias que coincidan con los filtros aplicados.
                        </td>
                      </tr>
                    ) : (
                      dependenciasFiltradas.map((dep) => (
                        <tr
                          key={dep.id}
                          className="hover:bg-muted transition-colors group"
                        >
                          {/* Semáforo de Estado */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {dep.estado_entrega === 'consolidada' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-mini font-semibold bg-success-soft text-success-fg border border-success-border">
                                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                                Consolidada
                              </span>
                            )}
                            {dep.estado_entrega === 'remitida' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-mini font-semibold bg-info-soft text-info-fg border border-info-border">
                                <span className="h-1.5 w-1.5 rounded-full bg-info" />
                                Remitida
                              </span>
                            )}
                            {dep.estado_entrega === 'observada' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-mini font-semibold bg-warning-soft text-warning-fg border border-warning-border">
                                <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                                Observada
                              </span>
                            )}
                            {dep.estado_entrega === 'borrador' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-mini font-medium bg-muted text-foreground border border-border">
                                <span className="h-1.5 w-1.5 rounded-full bg-muted" />
                                Borrador
                              </span>
                            )}
                          </td>

                          {/* Código */}
                          <td className="py-2.5 px-3 font-mono font-bold text-nota text-primary whitespace-nowrap">
                            [{dep.codigo}]
                          </td>

                          {/* Nombre y Nivel */}
                          <td className="py-2.5 px-3 font-medium text-foreground max-w-[220px]">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate uppercase text-nota">{dep.nombre}</span>
                              <span className="px-1 rounded text-microdato bg-muted text-muted-foreground shrink-0">
                                N{dep.nivel}
                              </span>
                            </div>
                          </td>

                          {/* Responsable */}
                          <td className="py-2.5 px-3 text-muted-foreground max-w-[180px]">
                            {dep.encargado ? (
                              <div className="leading-tight">
                                <div className="font-semibold text-foreground truncate text-nota uppercase">
                                  {dep.encargado.apellidos}, {dep.encargado.nombres}
                                </div>
                                <div className="text-mini text-muted-foreground truncate">
                                  {dep.encargado.cargo || 'Responsable'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-mini italic text-muted-foreground">Sin asignar</span>
                            )}
                          </td>

                          {/* Progreso Patrimonio */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="w-24 space-y-1">
                              <div className="flex justify-between text-mini text-muted-foreground font-mono">
                                <span>{dep.patrimonio_confirmados}/{dep.patrimonio_total}</span>
                                <span className="font-semibold text-foreground">{dep.patrimonio_porcentaje}%</span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden border border-border">
                                <div
                                  style={{ width: `${dep.patrimonio_porcentaje}%` }}
                                  className={`h-full rounded-full ${
                                    dep.patrimonio_porcentaje === 100
                                      ? 'bg-success'
                                      : dep.patrimonio_porcentaje > 50
                                      ? 'bg-primary'
                                      : 'bg-warning'
                                  }`}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Observaciones Abiertas */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {dep.observaciones_abiertas > 0 ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-mini font-bold bg-destructive/10 text-destructive border border-destructive/20">
                                <AlertTriangle className="h-3 w-3" />
                                {dep.observaciones_abiertas}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-mini">0</span>
                            )}
                          </td>

                          {/* Acciones */}
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onSeleccionarDependencia(dep.id)}
                              className="h-7 px-2 text-xs text-primary border-primary/30 hover:bg-primary/10 font-semibold gap-1 cursor-pointer"
                            >
                              <span>Supervisar</span>
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-muted border-t border-border flex items-center justify-between text-nota text-muted-foreground">
                <span>
                  Mostrando {dependenciasFiltradas.length} de {metricas.total_dependencias} dependencias
                </span>
                <span className="font-mono text-mini text-muted-foreground">
                  Directiva N.° 001-2026-MDSJ/A
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ========================================================
            COLUMNA DERECHA: CONSOLIDACIÓN Y CONTROL PATRIMONIAL
            ======================================================== */}
        <div className="lg:col-span-4 space-y-4">
          {/* Tarjeta 1: Consolidación del Pliego Municipal */}
          <Card className="border shadow-xs">
            <CardHeader className="py-3 px-4 border-b border-border bg-muted">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span>Consolidación del Pliego</span>
                </CardTitle>
                <Badge
                  variant="outline"
                  className="font-mono font-bold border-secondary/40 bg-secondary/10 text-secondary text-mini"
                >
                  {metricas.porcentaje_avance}% Avance
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4 text-xs">
              {/* Barra visual segmentada */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-nota text-muted-foreground">
                  <span>Ciclo de Entregas MDSJ</span>
                  <span className="font-semibold text-foreground">
                    {metricas.consolidadas}/{metricas.total_dependencias} Cerradas
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-muted flex overflow-hidden border border-border">
                  <div
                    style={{ width: `${pctConsolidada}%` }}
                    title={`Consolidadas: ${metricas.consolidadas}`}
                    className="bg-success h-full transition-all"
                  />
                  <div
                    style={{ width: `${pctRemitida}%` }}
                    title={`Remitidas: ${metricas.remitidas}`}
                    className="bg-info h-full transition-all"
                  />
                  <div
                    style={{ width: `${pctObservada}%` }}
                    title={`Observadas: ${metricas.observadas}`}
                    className="bg-warning h-full transition-all"
                  />
                  <div
                    style={{ width: `${pctBorrador}%` }}
                    title={`En Borrador: ${metricas.borrador}`}
                    className="bg-muted h-full transition-all"
                  />
                </div>
              </div>

              {/* Lista desglosada compacta */}
              <div className="divide-y divide-border pt-1">
                <div className="flex justify-between items-center py-2">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <span className="h-2 w-2 rounded-full bg-success" />
                    Consolidadas
                  </span>
                  <span className="font-mono font-bold text-success-fg">
                    {metricas.consolidadas} ({pctConsolidada}%)
                  </span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <span className="h-2 w-2 rounded-full bg-info" />
                    Remitidas / En Revisión
                  </span>
                  <span className="font-mono font-bold text-info-fg">
                    {metricas.remitidas} ({pctRemitida}%)
                  </span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <span className="h-2 w-2 rounded-full bg-warning" />
                    Observadas
                  </span>
                  <span className="font-mono font-bold text-warning-fg">
                    {metricas.observadas} ({pctObservada}%)
                  </span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <span className="h-2 w-2 rounded-full bg-muted" />
                    En Borrador
                  </span>
                  <span className="font-mono font-bold text-muted-foreground">
                    {metricas.borrador} ({pctBorrador}%)
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tarjeta 2: Control Patrimonial Institucional (SIGA) */}
          <Card className="border shadow-xs">
            <CardHeader className="py-3 px-4 border-b border-border bg-muted">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  <span>Inventario Físico (SIGA)</span>
                </CardTitle>
                <span className="text-mini font-mono text-primary font-bold">
                  {metricas.patrimonio.porcentaje}%
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3 text-xs">
              <div className="flex justify-between items-baseline">
                <span className="font-semibold text-foreground text-sm">
                  {metricas.patrimonio.verificados.toLocaleString('es-PE')}
                  <span className="text-muted-foreground text-xs font-normal ml-1">
                    / {metricas.patrimonio.total_bienes.toLocaleString('es-PE')} bienes
                  </span>
                </span>
                <span className="font-mono font-semibold text-success-fg text-xs">
                  S/ {(metricas.patrimonio.valor_total / 1000000).toFixed(2)}M
                </span>
              </div>

              <div className="h-2 w-full rounded-full bg-muted overflow-hidden border border-border">
                <div
                  style={{ width: `${metricas.patrimonio.porcentaje}%` }}
                  className="h-full bg-primary rounded-full transition-all"
                />
              </div>

              <p className="text-nota text-muted-foreground leading-snug">
                {metricas.patrimonio.pendientes.toLocaleString('es-PE')} bienes muebles pendientes de verificación física institucional.
              </p>
            </CardContent>
          </Card>

          {/* Tarjeta 3: Acciones Rápidas del Administrador */}
          <Card className="border shadow-xs">
            <CardHeader className="py-2.5 px-4 border-b border-border bg-muted">
              <CardTitle className="text-nota font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Boxes className="h-3.5 w-3.5 text-primary" />
                <span>Accesos de Control y Gestión</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-3 space-y-1.5 text-xs">
              <Link
                to="/organigrama"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors text-foreground hover:text-primary font-medium"
              >
                <span className="flex items-center gap-2">
                  <FolderTree className="h-3.5 w-3.5 text-primary" />
                  <span>Explorador de Carpetas Orgánicas</span>
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </Link>

              <Link
                to="/usuarios"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors text-foreground hover:text-primary font-medium"
              >
                <span className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  <span>Padrón de Servidores y Usuarios</span>
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </Link>

              <Link
                to="/observaciones"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors text-foreground hover:text-primary font-medium"
              >
                <span className="flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-warning-fg" />
                  <span>Bandeja General de Observaciones</span>
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </Link>

              <Link
                to="/acta"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors text-foreground hover:text-primary font-medium"
              >
                <span className="flex items-center gap-2">
                  <FileCheck2 className="h-3.5 w-3.5 text-success-fg" />
                  <span>Actas de Transferencia y Cierre</span>
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
