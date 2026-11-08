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
        <Spinner className="h-8 w-8 text-[#3484A5]" />
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
        <div className="flex items-center gap-2 flex-wrap text-slate-600">
          <span className="font-semibold text-slate-800 uppercase tracking-tight">
            Administración Institucional · ETTS
          </span>
          <span className="text-slate-300">·</span>
          <span className="text-[#3484A5] font-semibold">
            {metricas.total_dependencias} Centros de Costo
          </span>
          <span className="text-slate-300">·</span>
          <span className="font-semibold text-slate-800">Supervisión Pliego 2026</span>
        </div>

        {/* Píldoras de plazo normativo */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono text-[11px] font-medium border border-slate-200">
            <Calendar className="h-3.5 w-3.5 text-slate-500" />
            <span>
              Fecha de corte: <strong className="text-slate-800">31/10/2026</strong>
            </span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/15 text-amber-900 font-mono text-[11px] font-semibold border border-amber-300">
            <Clock className="h-3.5 w-3.5 text-amber-700" />
            <span>
              Plazo de entrega: <strong className="text-amber-950">07/11/2026</strong>
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
              className="h-8 text-xs gap-1.5 bg-[#3484A5] hover:bg-[#2b718d] text-white cursor-pointer"
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
            <CardHeader className="p-4 border-b border-border bg-slate-50/70 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[#3484A5]" />
                  <span>Centros de Costo y Unidades Orgánicas ({dependenciasFiltradas.length})</span>
                </CardTitle>
                <span className="text-[11px] font-mono text-[#3484A5] font-semibold">
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
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Todas ({metricas.total_dependencias})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroEstado('consolidada')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${
                    filtroEstado === 'consolidada'
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Consolidadas ({metricas.consolidadas})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroEstado('remitida')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${
                    filtroEstado === 'remitida'
                      ? 'bg-sky-600 text-white font-semibold'
                      : 'bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100'
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                  Remitidas ({metricas.remitidas})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroEstado('observada')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${
                    filtroEstado === 'observada'
                      ? 'bg-amber-600 text-white font-semibold'
                      : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Observadas ({metricas.observadas})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroEstado('borrador')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${
                    filtroEstado === 'borrador'
                      ? 'bg-slate-700 text-white font-semibold'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
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
                    className="pl-8 text-xs h-8 bg-white"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">Nivel:</span>
                  <select
                    value={filtroNivel}
                    onChange={(e) =>
                      setFiltroNivel(e.target.value === 'todos' ? 'todos' : Number(e.target.value))
                    }
                    className="h-8 rounded-lg border border-input bg-white px-2 text-xs focus:ring-1 focus:ring-[#3484A5]"
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
                  <thead className="bg-muted/40 text-muted-foreground border-b border-border text-[11px] uppercase font-semibold sticky top-0 bg-slate-50 z-10 shadow-xs">
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
                          className="hover:bg-slate-50/70 transition-colors group"
                        >
                          {/* Semáforo de Estado */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {dep.estado_entrega === 'consolidada' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Consolidada
                              </span>
                            )}
                            {dep.estado_entrega === 'remitida' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-800 border border-sky-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                                Remitida
                              </span>
                            )}
                            {dep.estado_entrega === 'observada' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                Observada
                              </span>
                            )}
                            {dep.estado_entrega === 'borrador' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                Borrador
                              </span>
                            )}
                          </td>

                          {/* Código */}
                          <td className="py-2.5 px-3 font-mono font-bold text-[11px] text-[#3484A5] whitespace-nowrap">
                            [{dep.codigo}]
                          </td>

                          {/* Nombre y Nivel */}
                          <td className="py-2.5 px-3 font-medium text-slate-800 max-w-[220px]">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate uppercase text-[11px]">{dep.nombre}</span>
                              <span className="px-1 rounded text-[9.5px] font-mono bg-slate-100 text-slate-600 shrink-0">
                                N{dep.nivel}
                              </span>
                            </div>
                          </td>

                          {/* Responsable */}
                          <td className="py-2.5 px-3 text-muted-foreground max-w-[180px]">
                            {dep.encargado ? (
                              <div className="leading-tight">
                                <div className="font-semibold text-slate-800 truncate text-[11px] uppercase">
                                  {dep.encargado.apellidos}, {dep.encargado.nombres}
                                </div>
                                <div className="text-[10px] text-slate-500 truncate">
                                  {dep.encargado.cargo || 'Responsable'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[10px] italic text-slate-400">Sin asignar</span>
                            )}
                          </td>

                          {/* Progreso Patrimonio */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="w-24 space-y-1">
                              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                                <span>{dep.patrimonio_confirmados}/{dep.patrimonio_total}</span>
                                <span className="font-semibold text-slate-700">{dep.patrimonio_porcentaje}%</span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                                <div
                                  style={{ width: `${dep.patrimonio_porcentaje}%` }}
                                  className={`h-full rounded-full ${
                                    dep.patrimonio_porcentaje === 100
                                      ? 'bg-emerald-500'
                                      : dep.patrimonio_porcentaje > 50
                                      ? 'bg-[#3484A5]'
                                      : 'bg-amber-500'
                                  }`}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Observaciones Abiertas */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {dep.observaciones_abiertas > 0 ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-destructive/10 text-destructive border border-destructive/20">
                                <AlertTriangle className="h-3 w-3" />
                                {dep.observaciones_abiertas}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">0</span>
                            )}
                          </td>

                          {/* Acciones */}
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onSeleccionarDependencia(dep.id)}
                              className="h-7 px-2 text-xs text-[#3484A5] border-[#3484A5]/30 hover:bg-[#3484A5]/10 font-semibold gap-1 cursor-pointer"
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

              <div className="p-3 bg-slate-50/50 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  Mostrando {dependenciasFiltradas.length} de {metricas.total_dependencias} dependencias
                </span>
                <span className="font-mono text-[10px] text-slate-500">
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
            <CardHeader className="py-3 px-4 border-b border-border bg-slate-50/70">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#3484A5]" />
                  <span>Consolidación del Pliego</span>
                </CardTitle>
                <Badge
                  variant="outline"
                  className="font-mono font-bold border-[#2CA792]/40 bg-[#2CA792]/10 text-[#2CA792] text-[10px]"
                >
                  {metricas.porcentaje_avance}% Avance
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4 text-xs">
              {/* Barra visual segmentada */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Ciclo de Entregas MDSJ</span>
                  <span className="font-semibold text-slate-800">
                    {metricas.consolidadas}/{metricas.total_dependencias} Cerradas
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-100 flex overflow-hidden border border-slate-200">
                  <div
                    style={{ width: `${pctConsolidada}%` }}
                    title={`Consolidadas: ${metricas.consolidadas}`}
                    className="bg-emerald-500 h-full transition-all"
                  />
                  <div
                    style={{ width: `${pctRemitida}%` }}
                    title={`Remitidas: ${metricas.remitidas}`}
                    className="bg-sky-500 h-full transition-all"
                  />
                  <div
                    style={{ width: `${pctObservada}%` }}
                    title={`Observadas: ${metricas.observadas}`}
                    className="bg-amber-500 h-full transition-all"
                  />
                  <div
                    style={{ width: `${pctBorrador}%` }}
                    title={`En Borrador: ${metricas.borrador}`}
                    className="bg-slate-300 h-full transition-all"
                  />
                </div>
              </div>

              {/* Lista desglosada compacta */}
              <div className="divide-y divide-border pt-1">
                <div className="flex justify-between items-center py-2">
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Consolidadas
                  </span>
                  <span className="font-mono font-bold text-emerald-700">
                    {metricas.consolidadas} ({pctConsolidada}%)
                  </span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    <span className="h-2 w-2 rounded-full bg-sky-500" />
                    Remitidas / En Revisión
                  </span>
                  <span className="font-mono font-bold text-sky-700">
                    {metricas.remitidas} ({pctRemitida}%)
                  </span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Observadas
                  </span>
                  <span className="font-mono font-bold text-amber-700">
                    {metricas.observadas} ({pctObservada}%)
                  </span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    En Borrador
                  </span>
                  <span className="font-mono font-bold text-slate-600">
                    {metricas.borrador} ({pctBorrador}%)
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tarjeta 2: Control Patrimonial Institucional (SIGA) */}
          <Card className="border shadow-xs">
            <CardHeader className="py-3 px-4 border-b border-border bg-slate-50/70">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <Package className="h-4 w-4 text-[#3484A5]" />
                  <span>Inventario Físico (SIGA)</span>
                </CardTitle>
                <span className="text-[10px] font-mono text-[#3484A5] font-bold">
                  {metricas.patrimonio.porcentaje}%
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3 text-xs">
              <div className="flex justify-between items-baseline">
                <span className="font-semibold text-slate-800 text-sm">
                  {metricas.patrimonio.verificados.toLocaleString('es-PE')}
                  <span className="text-muted-foreground text-xs font-normal ml-1">
                    / {metricas.patrimonio.total_bienes.toLocaleString('es-PE')} bienes
                  </span>
                </span>
                <span className="font-mono font-semibold text-emerald-700 text-xs">
                  S/ {(metricas.patrimonio.valor_total / 1000000).toFixed(2)}M
                </span>
              </div>

              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                <div
                  style={{ width: `${metricas.patrimonio.porcentaje}%` }}
                  className="h-full bg-[#3484A5] rounded-full transition-all"
                />
              </div>

              <p className="text-[11px] text-muted-foreground leading-snug">
                {metricas.patrimonio.pendientes.toLocaleString('es-PE')} bienes muebles pendientes de verificación física institucional.
              </p>
            </CardContent>
          </Card>

          {/* Tarjeta 3: Acciones Rápidas del Administrador */}
          <Card className="border shadow-xs">
            <CardHeader className="py-2.5 px-4 border-b border-border bg-slate-50/50">
              <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Boxes className="h-3.5 w-3.5 text-[#3484A5]" />
                <span>Accesos de Control y Gestión</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-3 space-y-1.5 text-xs">
              <Link
                to="/organigrama"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-700 hover:text-[#3484A5] font-medium"
              >
                <span className="flex items-center gap-2">
                  <FolderTree className="h-3.5 w-3.5 text-[#3484A5]" />
                  <span>Explorador de Carpetas Orgánicas</span>
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </Link>

              <Link
                to="/usuarios"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-700 hover:text-[#3484A5] font-medium"
              >
                <span className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-[#3484A5]" />
                  <span>Padrón de Servidores y Usuarios</span>
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </Link>

              <Link
                to="/observaciones"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-700 hover:text-[#3484A5] font-medium"
              >
                <span className="flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                  <span>Bandeja General de Observaciones</span>
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </Link>

              <Link
                to="/acta"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-700 hover:text-[#3484A5] font-medium"
              >
                <span className="flex items-center gap-2">
                  <FileCheck2 className="h-3.5 w-3.5 text-emerald-600" />
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
