import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FolderTree,
  Package,
  RefreshCw,
  Search,
  Send,
} from 'lucide-react'
import { Link } from 'react-router-dom'

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

  // Porcentajes para barra semáforo
  const pctConsolidada = metricas.total_dependencias > 0
    ? Math.round((metricas.consolidadas / metricas.total_dependencias) * 100)
    : 0
  const pctRemitida = metricas.total_dependencias > 0
    ? Math.round((metricas.remitidas / metricas.total_dependencias) * 100)
    : 0
  const pctObservada = metricas.total_dependencias > 0
    ? Math.round((metricas.observadas / metricas.total_dependencias) * 100)
    : 0
  const pctBorrador = metricas.total_dependencias > 0
    ? Math.max(0, 100 - pctConsolidada - pctRemitida - pctObservada)
    : 0

  return (
    <div className="space-y-6">
      {/* ========================================================
          CABECERA GERENCIAL Y BOTÓN DE ACTUALIZACIÓN
          ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Tablero de Control Operativo · Transferencia 2026
            </h1>
            <Badge variant="outline" className="border-[#3484A5]/40 text-[#3484A5] text-[11px] font-semibold bg-[#3484A5]/5">
              Monitoreo Global
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Municipalidad de San Jerónimo · Supervisión en tiempo real de los {metricas.total_dependencias} centros de costo
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </Button>

          <Link to="/organigrama">
            <Button size="sm" variant="default" className="h-8 text-xs gap-1.5 bg-[#3484A5] hover:bg-[#2b718d] text-white">
              <FolderTree className="h-3.5 w-3.5" />
              <span>Ver Organigrama</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ========================================================
          TARJETAS KPI - SEMÁFORO GLOBAL DE TRANSFERENCIA
          ======================================================== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* CONSOLIDADAS (VERDE) */}
        <Card
          onClick={() => setFiltroEstado('consolidada')}
          className={`cursor-pointer transition-all border-emerald-200 hover:border-emerald-300 shadow-xs ${
            filtroEstado === 'consolidada' ? 'ring-2 ring-emerald-500 bg-emerald-50/40' : 'bg-card'
          }`}
        >
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold text-emerald-700 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Consolidadas
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-cifra-lg font-semibold text-foreground">
                {metricas.consolidadas}
              </span>
              <span className="text-cifra text-emerald-600">
                {metricas.porcentaje_avance}%
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Actas listas para suscripción final
            </p>
          </CardContent>
        </Card>

        {/* REMITIDAS / EN REVISIÓN (AZUL) */}
        <Card
          onClick={() => setFiltroEstado('remitida')}
          className={`cursor-pointer transition-all border-sky-200 hover:border-sky-300 shadow-xs ${
            filtroEstado === 'remitida' ? 'ring-2 ring-sky-500 bg-sky-50/40' : 'bg-card'
          }`}
        >
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold text-sky-700 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-sky-500" />
                Remitidas
              </span>
              <Send className="h-4 w-4 text-sky-600" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-cifra-lg font-semibold text-foreground">
                {metricas.remitidas}
              </span>
              <span className="text-cifra text-sky-600">
                {metricas.total_dependencias > 0 ? Math.round((metricas.remitidas / metricas.total_dependencias) * 100) : 0}%
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Pendientes de revisión del superior
            </p>
          </CardContent>
        </Card>

        {/* OBSERVADAS (ÁMBAR/ROJO) */}
        <Card
          onClick={() => setFiltroEstado('observada')}
          className={`cursor-pointer transition-all border-amber-200 hover:border-amber-300 shadow-xs ${
            filtroEstado === 'observada' ? 'ring-2 ring-amber-500 bg-amber-50/40' : 'bg-card'
          }`}
        >
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold text-amber-700 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Observadas
              </span>
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-cifra-lg font-semibold text-foreground">
                {metricas.observadas}
              </span>
              <span className="text-cifra text-amber-600">
                {metricas.total_dependencias > 0 ? Math.round((metricas.observadas / metricas.total_dependencias) * 100) : 0}%
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-tight">
              En subsanación por el despacho
            </p>
          </CardContent>
        </Card>

        {/* EN BORRADOR / PENDIENTES (GRIS) */}
        <Card
          onClick={() => setFiltroEstado('borrador')}
          className={`cursor-pointer transition-all border-slate-200 hover:border-slate-300 shadow-xs ${
            filtroEstado === 'borrador' ? 'ring-2 ring-slate-400 bg-slate-50/60' : 'bg-card'
          }`}
        >
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                En Borrador
              </span>
              <Clock className="h-4 w-4 text-slate-500" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-cifra-lg font-semibold text-foreground">
                {metricas.borrador}
              </span>
              <span className="text-cifra text-slate-500">
                {metricas.total_dependencias > 0 ? Math.round((metricas.borrador / metricas.total_dependencias) * 100) : 0}%
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Llenando anexos y verificando
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================
          BARRA MULTICROMÁTICA DE SEMÁFORO Y PATRIMONIO
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Distribución del Semáforo */}
        <Card className="lg:col-span-2 border shadow-xs">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Distribución del Ciclo de Transferencia Municipal</span>
              <span className="text-[11px] text-slate-600 font-normal">
                {metricas.consolidadas} de {metricas.total_dependencias} oficinas consolidadas
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {/* Barra visual segmentada */}
            <div className="h-4 w-full rounded-full bg-slate-100 flex overflow-hidden p-0.5 border border-slate-200">
              <div
                style={{ width: `${pctConsolidada}%` }}
                title={`Consolidadas: ${metricas.consolidadas} (${pctConsolidada}%)`}
                className="bg-emerald-500 h-full transition-all first:rounded-l-full last:rounded-r-full"
              />
              <div
                style={{ width: `${pctRemitida}%` }}
                title={`Remitidas: ${metricas.remitidas} (${pctRemitida}%)`}
                className="bg-sky-500 h-full transition-all first:rounded-l-full last:rounded-r-full"
              />
              <div
                style={{ width: `${pctObservada}%` }}
                title={`Observadas: ${metricas.observadas} (${pctObservada}%)`}
                className="bg-amber-500 h-full transition-all first:rounded-l-full last:rounded-r-full"
              />
              <div
                style={{ width: `${pctBorrador}%` }}
                title={`En Borrador: ${metricas.borrador} (${pctBorrador}%)`}
                className="bg-slate-300 h-full transition-all first:rounded-l-full last:rounded-r-full"
              />
            </div>

            {/* Leyenda interactiva */}
            <div className="flex flex-wrap items-center justify-between text-xs pt-1 gap-2">
              <button
                type="button"
                onClick={() => setFiltroEstado(filtroEstado === 'consolidada' ? 'todos' : 'consolidada')}
                className="flex items-center gap-1.5 text-slate-700 hover:text-emerald-700 cursor-pointer"
              >
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="font-medium">Consolidadas:</span> {metricas.consolidadas} ({pctConsolidada}%)
              </button>

              <button
                type="button"
                onClick={() => setFiltroEstado(filtroEstado === 'remitida' ? 'todos' : 'remitida')}
                className="flex items-center gap-1.5 text-slate-700 hover:text-sky-700 cursor-pointer"
              >
                <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                <span className="font-medium">Remitidas:</span> {metricas.remitidas} ({pctRemitida}%)
              </button>

              <button
                type="button"
                onClick={() => setFiltroEstado(filtroEstado === 'observada' ? 'todos' : 'observada')}
                className="flex items-center gap-1.5 text-slate-700 hover:text-amber-700 cursor-pointer"
              >
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="font-medium">Observadas:</span> {metricas.observadas} ({pctObservada}%)
              </button>

              <button
                type="button"
                onClick={() => setFiltroEstado(filtroEstado === 'borrador' ? 'todos' : 'borrador')}
                className="flex items-center gap-1.5 text-slate-700 hover:text-slate-900 cursor-pointer"
              >
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                <span className="font-medium">En Borrador:</span> {metricas.borrador} ({pctBorrador}%)
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Resumen Patrimonial (Anexo 04) */}
        <Card className="border shadow-xs">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-etiqueta flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-[#3484A5]" />
                Inventario Físico (SIGA)
              </span>
              <span className="text-microdato text-[#3484A5] font-bold">
                {metricas.patrimonio.porcentaje}% verificado
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2.5">
            <div className="flex items-baseline justify-between">
              <span className="text-cifra-lg font-semibold text-foreground">
                {metricas.patrimonio.verificados.toLocaleString('es-PE')}
                <span className="text-dato text-muted-foreground ml-1">
                  / {metricas.patrimonio.total_bienes.toLocaleString('es-PE')} bienes
                </span>
              </span>
              <span className="text-cifra text-slate-600">
                S/ {(metricas.patrimonio.valor_total / 1000000).toFixed(2)}M
              </span>
            </div>

            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200">
              <div
                style={{ width: `${metricas.patrimonio.porcentaje}%` }}
                className="h-full bg-[#3484A5] transition-all rounded-full"
              />
            </div>

            <p className="text-[11px] text-muted-foreground">
              {metricas.patrimonio.pendientes.toLocaleString('es-PE')} bienes pendientes de verificación física institucional.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================
          SEMÁFORO Y RANKING OPERATIVO DE CENTROS DE COSTO
          ======================================================== */}
      <Card className="border shadow-xs">
        <CardHeader className="p-4 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold text-foreground">
                Semáforo y Estado Operativo por Dependencia
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Haga clic en «Gestionar» para fijar la dependencia como activa o auditar sus anexos
              </p>
            </div>

            {/* Filtros rápidos */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFiltroEstado('todos')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                  filtroEstado === 'todos'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Todas ({metricas.total_dependencias})
              </button>
              <button
                type="button"
                onClick={() => setFiltroEstado('consolidada')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors flex items-center gap-1 ${
                  filtroEstado === 'consolidada'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Consolidadas ({metricas.consolidadas})
              </button>
              <button
                type="button"
                onClick={() => setFiltroEstado('remitida')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors flex items-center gap-1 ${
                  filtroEstado === 'remitida'
                    ? 'bg-sky-600 text-white'
                    : 'bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                Remitidas ({metricas.remitidas})
              </button>
              <button
                type="button"
                onClick={() => setFiltroEstado('observada')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors flex items-center gap-1 ${
                  filtroEstado === 'observada'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Observadas ({metricas.observadas})
              </button>
              <button
                type="button"
                onClick={() => setFiltroEstado('borrador')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors flex items-center gap-1 ${
                  filtroEstado === 'borrador'
                    ? 'bg-slate-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                Borrador ({metricas.borrador})
              </button>
            </div>
          </div>

          {/* Barra de Búsqueda */}
          <div className="pt-3 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por código (ej. 01.03) o nombre de oficina o responsable..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-8 text-xs h-8 bg-slate-50/50"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">Nivel:</span>
              <select
                value={filtroNivel}
                onChange={(e) => setFiltroNivel(e.target.value === 'todos' ? 'todos' : Number(e.target.value))}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:ring-1 focus:ring-[#3484A5]"
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground border-b border-border text-[11px] uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3">Centro de Costo / Dependencia</th>
                  <th className="py-2.5 px-3">Responsable Oficial</th>
                  <th className="py-2.5 px-3">Avance Patrimonio</th>
                  <th className="py-2.5 px-3 text-center">Observaciones</th>
                  <th className="py-2.5 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {dependenciasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No se encontraron dependencias que coincidan con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  dependenciasFiltradas.map((dep) => (
                    <tr
                      key={dep.id}
                      className="hover:bg-muted/20 transition-colors group"
                    >
                      {/* Semáforo de Estado */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {dep.estado_entrega === 'consolidada' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Consolidada
                          </span>
                        )}
                        {dep.estado_entrega === 'remitida' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-800 border border-sky-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                            Remitida
                          </span>
                        )}
                        {dep.estado_entrega === 'observada' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            Observada
                          </span>
                        )}
                        {dep.estado_entrega === 'borrador' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                            Borrador
                          </span>
                        )}
                      </td>

                      {/* Código */}
                      <td className="py-2.5 px-3 font-mono font-medium text-[11px] text-slate-600 whitespace-nowrap">
                        {dep.codigo}
                      </td>

                      {/* Nombre y Nivel */}
                      <td className="py-2.5 px-3 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <span>{dep.nombre}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-normal bg-slate-100 text-slate-600">
                            N{dep.nivel}
                          </span>
                        </div>
                      </td>

                      {/* Responsable */}
                      <td className="py-2.5 px-3 text-muted-foreground">
                        {dep.encargado ? (
                          <div className="leading-tight">
                            <div className="font-medium text-slate-800">
                              {dep.encargado.nombres} {dep.encargado.apellidos}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                              {dep.encargado.cargo || 'Responsable'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] italic text-slate-400">Sin titular asignado</span>
                        )}
                      </td>

                      {/* Progreso Patrimonio */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="w-28 space-y-1">
                          <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                            <span>{dep.patrimonio_confirmados}/{dep.patrimonio_total}</span>
                            <span>{dep.patrimonio_porcentaje}%</span>
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
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-destructive/10 text-destructive border border-destructive/20">
                            <AlertTriangle className="h-3 w-3" />
                            {dep.observaciones_abiertas}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">0</span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onSeleccionarDependencia(dep.id)}
                          className="h-7 px-2 text-xs text-[#3484A5] hover:text-[#2b718d] hover:bg-[#3484A5]/10 font-semibold gap-1 cursor-pointer"
                        >
                          <span>Gestionar</span>
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-muted/20 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              Mostrando {dependenciasFiltradas.length} de {metricas.total_dependencias} dependencias
            </span>
            <span>Sistema Institucional de Transferencia de Gestión 2026</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
