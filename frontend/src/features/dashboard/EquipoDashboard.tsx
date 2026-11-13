import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  FolderOpen,
  Layers,
  Package,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react'
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { useTableroOperativo } from './use-dashboard'

type Perfil = 'ette' | 'etts'

/* Paleta institucional sobria (Directiva MDSJ) */
const PALETA = {
  primario: '#003366',
  consolidada: '#16a34a',
  remitida: '#2563eb',
  observada: '#d97706',
  borrador: '#64748b',
  patrimonio: '#0d9488',
  peligro: '#dc2626',
  fondoGris: '#f8fafc',
  borde: '#e2e8f0',
}

export function EquipoDashboard({ perfil }: { perfil: Perfil }) {
  const { data, isLoading, error, refetch, isFetching } = useTableroOperativo()

  /* ----------------------------------------------------
     Cálculos analíticos sobre dependencias
     ---------------------------------------------------- */
  const metricasCalculadas = useMemo(() => {
    if (!data) return null
    const { metricas, dependencias } = data

    // Avance general
    const pctAvance = metricas.porcentaje_avance ?? 0
    const difMeta = pctAvance - 100 // Diferencia con la meta (100%)

    // Total de observaciones abiertas en todo el pliego
    const totalObs = dependencias.reduce((sum, dep) => sum + (dep.observaciones_abiertas || 0), 0)

    // Desglose por nivel jerárquico (N1, N2, N3, N4)
    const niveles = [1, 2, 3, 4]
    const porNivel = niveles.map((nivel) => {
      const deps = dependencias.filter((d) => d.nivel === nivel)
      const total = deps.length
      const consolidadas = deps.filter((d) => d.estado_entrega === 'consolidada').length
      const remitidas = deps.filter((d) => d.estado_entrega === 'remitida').length
      const observadas = deps.filter((d) => d.estado_entrega === 'observada').length
      const pendientes = deps.filter(
        (d) => d.estado_entrega === 'borrador' || d.estado_entrega === 'sin_iniciar',
      ).length

      // Progreso patrimonial del nivel
      const bienesTotales = deps.reduce((s, d) => s + (d.patrimonio_total || 0), 0)
      const bienesVerificados = deps.reduce((s, d) => s + (d.patrimonio_confirmados || 0), 0)
      const pctPatrimonio = bienesTotales > 0 ? Math.round((bienesVerificados / bienesTotales) * 100) : 0
      const pctConsolidadas = total > 0 ? Math.round((consolidadas / total) * 100) : 0

      const nombresNivel: Record<number, string> = {
        1: 'Nivel 1 (Alcaldía / Concejo)',
        2: 'Nivel 2 (Gerencia Municipal)',
        3: 'Nivel 3 (Gerencias de Línea)',
        4: 'Nivel 4 (Subgerencias / OTI)',
      }

      return {
        nivel: `N${nivel}`,
        nombreCompleto: nombresNivel[nivel] ?? `Nivel ${nivel}`,
        total,
        consolidadas,
        remitidas,
        observadas,
        pendientes,
        pctConsolidadas,
        pctPatrimonio,
        bienesTotales,
        bienesVerificados,
      }
    }).filter((item) => item.total > 0)

    // Agrupación para el velocímetro / gauge semicircular
    const gaugeData = [
      { name: 'Consolidadas', value: metricas.consolidadas, fill: PALETA.consolidada },
      { name: 'Remitidas', value: metricas.remitidas, fill: PALETA.remitida },
      { name: 'Observadas', value: metricas.observadas, fill: PALETA.observada },
      { name: 'En Preparación', value: metricas.borrador, fill: '#cbd5e1' },
    ]

    // Ranking de dependencias con observaciones prioritarias
    const dependenciasCriticas = dependencias
      .filter((d) => d.observaciones_abiertas > 0 || d.estado_entrega === 'observada')
      .sort((a, b) => b.observaciones_abiertas - a.observaciones_abiertas)
      .slice(0, 7)

    // Dependencias con menor avance patrimonial (con bienes)
    const menorAvancePatrimonio = dependencias
      .filter((d) => (d.patrimonio_total || 0) > 0)
      .sort((a, b) => (a.patrimonio_porcentaje || 0) - (b.patrimonio_porcentaje || 0))
      .slice(0, 7)

    return {
      metricas,
      dependencias,
      pctAvance,
      difMeta,
      totalObs,
      porNivel,
      gaugeData,
      dependenciasCriticas,
      menorAvancePatrimonio,
    }
  }, [data])

  if (isLoading) {
    return (
      <div className="flex min-h-[500px] flex-col items-center justify-center gap-3">
        <Spinner className="h-8 w-8 text-primary" />
        <p className="text-xs text-muted-foreground font-medium">
          Cargando métricas y análisis de transferencia...
        </p>
      </div>
    )
  }

  if (error || !metricasCalculadas) {
    return (
      <Card className="border-destructive/30 p-8 text-center bg-destructive/5">
        <ShieldAlert className="mx-auto h-8 w-8 text-destructive mb-2" />
        <h3 className="font-semibold text-sm text-foreground">
          No se pudieron cargar los datos del tablero
        </h3>
        <p className="text-xs text-muted-foreground mt-1 mb-4">
          Error al consultar las métricas institucionales desde el servidor.
        </p>
        <Button size="sm" variant="outline" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" /> Reintentar consulta
        </Button>
      </Card>
    )
  }

  const {
    metricas,
    pctAvance,
    difMeta,
    totalObs,
    porNivel,
    gaugeData,
    dependenciasCriticas,
    menorAvancePatrimonio,
  } = metricasCalculadas

  return (
    <div className="mx-auto max-w-[1600px] space-y-5">
      {/* ========================================================
          BARRA DE CONTEXTO SUPERIOR Y FILTRO DE PERIODO
          ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs border-b border-border pb-3">
        <div className="flex items-center gap-2 flex-wrap text-muted-foreground">
          <span className="font-semibold text-foreground uppercase tracking-tight">
            {perfil === 'ette' ? 'Comité de Transferencia Entrante (ETTE)' : 'Equipo de Transferencia Saliente (ETTS)'}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="font-mono text-primary font-semibold">Pliego 2026</span>
          <span className="text-muted-foreground">·</span>
          <span className="font-semibold text-foreground">
            {perfil === 'ette' ? 'Monitoreo de Avance y Control' : 'Bandeja y Fiscalización'}
          </span>
        </div>

        {/* Píldoras de plazo y fechas institucionales */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted text-foreground font-mono text-nota font-medium border border-border">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Corte: <strong>31/10/2026</strong></span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-warning-soft text-warning-fg font-mono text-nota font-semibold border border-warning-border">
            <Clock className="h-3.5 w-3.5 text-warning-fg" />
            <span>Plazo límite: <strong>07/11/2026</strong></span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-7 text-xs gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </Button>
        </div>
      </div>

      {/* ========================================================
          CABECERA Y ACCIONES RÁPIDAS
          ======================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {perfil === 'ette' ? 'Tablero General de Monitoreo Institucional' : 'Tablero Operativo de Fiscalización y Entrega'}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {perfil === 'ette'
              ? 'Análisis analítico del cumplimiento por dependencia, avance patrimonial y gestión de delegados.'
              : 'Seguimiento del flujo de entregas remitidas, gestión de observaciones y cierre de actas.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {perfil === 'ette' ? (
            <>
              <Link to="/delegados">
                <Button size="sm" className="h-8 gap-1.5 text-xs bg-primary hover:bg-primary-hover text-white">
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Designar Delegado / Cuentas</span>
                </Button>
              </Link>
              <Link to="/reportes">
                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>Exportar Reporte</span>
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link to="/entregas">
                <Button size="sm" className="h-8 gap-1.5 text-xs bg-primary hover:bg-primary-hover text-white">
                  <Send className="h-3.5 w-3.5" />
                  <span>Bandeja de Entregas</span>
                </Button>
              </Link>
              <Link to="/observaciones">
                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Observaciones</span>
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* ========================================================
          TARJETAS KPI SUPERIORES (ESTILO ANALYTICS DASHBOARD)
          ======================================================== */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
        {/* Total Centros de Costo */}
        <Card className="border shadow-xs bg-card">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-nota font-bold uppercase tracking-wider">Dependencias</span>
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono">
                {metricas.total_dependencias}
              </span>
              <span className="text-mini text-muted-foreground">100% pliego</span>
            </div>
            <p className="mt-1 text-microdato text-muted-foreground">
              Unidades orgánicas fiscalizadas
            </p>
          </CardContent>
        </Card>

        {/* Consolidadas vs Meta */}
        <Card className="border shadow-xs bg-card">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-nota font-bold uppercase tracking-wider">Consolidadas</span>
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono">
                {metricas.consolidadas}
              </span>
              <span className="text-xs font-bold text-emerald-600">
                {pctAvance}%
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-1 text-microdato text-muted-foreground">
              {difMeta >= 0 ? (
                <span className="text-emerald-600 font-semibold flex items-center">
                  <TrendingUp className="h-3 w-3 mr-0.5" /> Meta cumplida
                </span>
              ) : (
                <span className="text-rose-600 font-semibold flex items-center">
                  <TrendingDown className="h-3 w-3 mr-0.5" /> {difMeta}% brecha
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Remitidas (En Revisión) */}
        <Card className="border shadow-xs bg-card">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-nota font-bold uppercase tracking-wider">Remitidas</span>
              <Send className="h-4 w-4 text-blue-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-blue-600 font-mono">
                {metricas.remitidas}
              </span>
              <span className="text-mini text-muted-foreground">
                {metricas.total_dependencias > 0
                  ? Math.round((metricas.remitidas / metricas.total_dependencias) * 100)
                  : 0}%
              </span>
            </div>
            <p className="mt-1 text-microdato text-blue-700 font-medium">
              Listas para visto bueno
            </p>
          </CardContent>
        </Card>

        {/* Observadas / Observaciones */}
        <Card className="border shadow-xs bg-card">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-nota font-bold uppercase tracking-wider">Observadas</span>
              <AlertCircle className="h-4 w-4 text-amber-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 font-mono">
                {metricas.observadas}
              </span>
              <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                {totalObs} obs.
              </span>
            </div>
            <p className="mt-1 text-microdato text-amber-700 font-medium">
              En proceso de subsanación
            </p>
          </CardContent>
        </Card>

        {/* Verificación Patrimonial SIGA */}
        <Card className="border shadow-xs bg-card col-span-2 md:col-span-4 lg:col-span-1">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-nota font-bold uppercase tracking-wider">Patrimonio SIGA</span>
              <Package className="h-4 w-4 text-teal-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-teal-600 font-mono">
                {metricas.patrimonio.porcentaje}%
              </span>
              <span className="text-mini text-muted-foreground font-mono">
                S/ {(metricas.patrimonio.valor_total / 1000000).toFixed(1)}M
              </span>
            </div>
            <p className="mt-1 text-microdato text-muted-foreground">
              {metricas.patrimonio.verificados.toLocaleString('es-PE')} de{' '}
              {metricas.patrimonio.total_bienes.toLocaleString('es-PE')} bienes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================
          BLOQUE PRINCIPAL DE GRÁFICOS (3 COLUMNAS / ESTILO ANALYTICS)
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* COLUMNA 1: VELOCÍMETRO / GAUGE Y RANKING HORIZONTAL (4 COLS) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Tarjeta Semicírculo Gauge: Avance Global vs Meta */}
          <Card className="border shadow-xs">
            <CardHeader className="py-2.5 px-4 border-b border-border bg-muted">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center justify-between">
                <span>Avance Global de Transferencia</span>
                <span className="font-mono text-primary font-semibold">{pctAvance}%</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex flex-col items-center">
              {/* Semi-donut gauge */}
              <div className="relative w-full h-[160px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart margin={{ top: 10, left: 0, right: 0, bottom: 0 }}>
                    <Pie
                      data={gaugeData}
                      cx="50%"
                      cy="80%"
                      startAngle={180}
                      endAngle={0}
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={1}
                    >
                      {gaugeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: unknown, name: unknown) => [`${val ?? 0} oficinas`, String(name ?? '')]}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Número central en el arco */}
                <div className="absolute top-[80px] text-center">
                  <span className="text-3xl font-extrabold text-foreground font-mono">
                    {pctAvance}%
                  </span>
                  <p className="text-mini font-semibold text-muted-foreground uppercase tracking-tight">
                    {metricas.consolidadas} / {metricas.total_dependencias} Cerradas
                  </p>
                </div>
              </div>

              {/* Leyenda compacta en 4 cuadrantes */}
              <div className="w-full grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-border text-xs">
                <div className="flex items-center justify-between p-1.5 rounded bg-emerald-50/60 border border-emerald-100">
                  <span className="flex items-center gap-1.5 text-emerald-800 font-medium text-nota">
                    <span className="h-2 w-2 rounded-full bg-emerald-600" />
                    Consolidadas
                  </span>
                  <span className="font-mono font-bold text-emerald-700">{metricas.consolidadas}</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-blue-50/60 border border-blue-100">
                  <span className="flex items-center gap-1.5 text-blue-800 font-medium text-nota">
                    <span className="h-2 w-2 rounded-full bg-blue-600" />
                    Remitidas
                  </span>
                  <span className="font-mono font-bold text-blue-700">{metricas.remitidas}</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-amber-50/60 border border-amber-100">
                  <span className="flex items-center gap-1.5 text-amber-800 font-medium text-nota">
                    <span className="h-2 w-2 rounded-full bg-amber-600" />
                    Observadas
                  </span>
                  <span className="font-mono font-bold text-amber-700">{metricas.observadas}</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-slate-50 border border-slate-200">
                  <span className="flex items-center gap-1.5 text-slate-700 font-medium text-nota">
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    En Borrador
                  </span>
                  <span className="font-mono font-bold text-slate-600">{metricas.borrador}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tarjeta de Cumplimiento por Nivel (Barras Horizontales con Porcentajes) */}
          <Card className="border shadow-xs">
            <CardHeader className="py-2.5 px-4 border-b border-border bg-muted">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  <span>Avance por Nivel Orgánico</span>
                </CardTitle>
                <span className="text-microdato font-mono text-muted-foreground">
                  SGD / ROF
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3.5">
              {porNivel.map((item) => (
                <div key={item.nivel} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground truncate max-w-[200px]">
                      {item.nombreCompleto}
                    </span>
                    <span className="font-mono text-nota font-bold text-primary">
                      {item.consolidadas}/{item.total} ({item.pctConsolidadas}%)
                    </span>
                  </div>
                  {/* Barra de progreso apilada */}
                  <div className="h-3 w-full rounded-full bg-slate-100 border border-border flex overflow-hidden">
                    <div
                      style={{ width: `${item.total > 0 ? (item.consolidadas / item.total) * 100 : 0}%` }}
                      className="bg-emerald-600 h-full transition-all"
                      title={`Consolidadas: ${item.consolidadas}`}
                    />
                    <div
                      style={{ width: `${item.total > 0 ? (item.remitidas / item.total) * 100 : 0}%` }}
                      className="bg-blue-600 h-full transition-all"
                      title={`Remitidas: ${item.remitidas}`}
                    />
                    <div
                      style={{ width: `${item.total > 0 ? (item.observadas / item.total) * 100 : 0}%` }}
                      className="bg-amber-500 h-full transition-all"
                      title={`Observadas: ${item.observadas}`}
                    />
                  </div>
                </div>
              ))}
              <p className="text-microdato text-muted-foreground pt-1">
                Verde: Consolidadas · Azul: Remitidas · Ámbar: Observadas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* COLUMNA 2 & 3: COMBO CHART Y COMPARATIVO PATRIMONIAL (8 COLS) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Gráfico 1: Análisis por Nivel Orgánico (Combo Barras + Línea de % Cumplimiento) */}
          <Card className="border shadow-xs">
            <CardHeader className="py-2.5 px-4 border-b border-border bg-muted">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span>Distribución de Estados vs % Cumplimiento por Nivel</span>
                </CardTitle>
                <span className="text-microdato text-muted-foreground">
                  Eje Izq: Cantidad · Eje Der: % Cumplimiento
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={porNivel}
                    margin={{ top: 15, right: 20, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="nombreCompleto"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      unit="%"
                      domain={[0, 100]}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: '12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      height={32}
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: '11px' }}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="consolidadas"
                      name="Consolidadas"
                      fill={PALETA.consolidada}
                      radius={[4, 4, 0, 0]}
                      barSize={22}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="remitidas"
                      name="Remitidas"
                      fill={PALETA.remitida}
                      radius={[4, 4, 0, 0]}
                      barSize={22}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="observadas"
                      name="Observadas"
                      fill={PALETA.observada}
                      radius={[4, 4, 0, 0]}
                      barSize={22}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="pendientes"
                      name="En Preparación"
                      fill="#94a3b8"
                      radius={[4, 4, 0, 0]}
                      barSize={22}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="pctConsolidadas"
                      name="% Avance Cierre"
                      stroke="#dc2626"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#dc2626' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico 2: Verificación de Bienes Patrimoniales (SIGA) vs Entregas */}
          <Card className="border shadow-xs">
            <CardHeader className="py-2.5 px-4 border-b border-border bg-muted">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Package className="h-4 w-4 text-teal-600" />
                  <span>Avance Patrimonial vs Cierre Documental por Nivel</span>
                </CardTitle>
                <span className="text-nota font-mono text-teal-700 font-semibold">
                  {metricas.patrimonio.porcentaje}% Verificado Institucional
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={porNivel}
                    margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="nombreCompleto"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      unit="%"
                      domain={[0, 100]}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: '12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                      }}
                      formatter={(val: unknown, name: unknown) => [`${val ?? 0}%`, String(name ?? '')]}
                    />
                    <Legend
                      verticalAlign="top"
                      height={28}
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: '11px' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="pctPatrimonio"
                      name="% Verificación Bienes SIGA"
                      fill="#0d9488"
                      fillOpacity={0.15}
                      stroke="#0d9488"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="pctConsolidadas"
                      name="% Entrega Consolidada"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={{ r: 3.5, fill: '#2563eb' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ========================================================
          SECCIÓN INFERIOR: BANDEJAS PRIORITARIAS Y DETALLE
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* TABLA 1: Dependencias que Requieren Seguimiento / Observadas */}
        <Card className="border shadow-xs">
          <CardHeader className="py-2.5 px-4 border-b border-border bg-muted flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span>Oficinas con Observaciones y Alertas ({dependenciasCriticas.length})</span>
            </CardTitle>
            <Link
              to="/observaciones"
              className="text-nota font-medium text-primary hover:underline flex items-center gap-1"
            >
              Ver todas <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {dependenciasCriticas.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs">
                <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-600 mb-1.5" />
                No hay dependencias con observaciones abiertas pendientes.
              </div>
            ) : (
              <div className="divide-y divide-border overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted/40 text-muted-foreground font-semibold uppercase text-microdato">
                    <tr>
                      <th className="py-2 px-3">Código</th>
                      <th className="py-2 px-3">Dependencia</th>
                      <th className="py-2 px-3">Estado</th>
                      <th className="py-2 px-3 text-center">Obs.</th>
                      <th className="py-2 px-3 text-right">Patrimonio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {dependenciasCriticas.map((dep) => (
                      <tr key={dep.id} className="hover:bg-muted/50 transition-colors">
                        <td className="py-2 px-3 font-mono font-bold text-primary whitespace-nowrap">
                          [{dep.codigo}]
                        </td>
                        <td className="py-2 px-3 max-w-[200px]">
                          <div className="truncate font-medium text-foreground uppercase text-nota">
                            {dep.nombre}
                          </div>
                          {dep.encargado && (
                            <div className="truncate text-microdato text-muted-foreground">
                              {dep.encargado.apellidos}, {dep.encargado.nombres}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-microdato font-semibold ${
                              dep.estado_entrega === 'observada'
                                ? 'bg-amber-100 text-amber-800'
                                : dep.estado_entrega === 'remitida'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {dep.estado_entrega === 'observada'
                              ? 'Observada'
                              : dep.estado_entrega === 'remitida'
                              ? 'Remitida'
                              : 'Borrador'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-rose-600">
                          {dep.observaciones_abiertas}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-nota text-muted-foreground">
                          {dep.patrimonio_porcentaje}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* TABLA 2: Menor Avance Patrimonial (SIGA) */}
        <Card className="border shadow-xs">
          <CardHeader className="py-2.5 px-4 border-b border-border bg-muted flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Package className="h-4 w-4 text-teal-600" />
              <span>Prioridad de Cotejo Físico Patrimonial</span>
            </CardTitle>
            <Link
              to="/reportes"
              className="text-nota font-medium text-primary hover:underline flex items-center gap-1"
            >
              Ver reporte patrimonial <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/40 text-muted-foreground font-semibold uppercase text-microdato">
                  <tr>
                    <th className="py-2 px-3">Código</th>
                    <th className="py-2 px-3">Dependencia</th>
                    <th className="py-2 px-3">Bienes Verif.</th>
                    <th className="py-2 px-3">Avance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {menorAvancePatrimonio.map((dep) => (
                    <tr key={dep.id} className="hover:bg-muted/50 transition-colors">
                      <td className="py-2 px-3 font-mono font-bold text-primary whitespace-nowrap">
                        [{dep.codigo}]
                      </td>
                      <td className="py-2 px-3 max-w-[200px]">
                        <div className="truncate font-medium text-foreground uppercase text-nota">
                          {dep.nombre}
                        </div>
                      </td>
                      <td className="py-2 px-3 font-mono text-nota text-muted-foreground">
                        {dep.patrimonio_confirmados} / {dep.patrimonio_total}
                      </td>
                      <td className="py-2 px-3 w-32">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-slate-100 border border-border overflow-hidden">
                            <div
                              className="h-full bg-teal-600 rounded-full"
                              style={{ width: `${dep.patrimonio_porcentaje}%` }}
                            />
                          </div>
                          <span className="font-mono text-microdato font-bold text-foreground">
                            {dep.patrimonio_porcentaje}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================
          ACCESOS RÁPIDOS INFERIORES
          ======================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
        <Link
          to="/anexos-entidad"
          className="flex items-center gap-2.5 p-3 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors"
        >
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <FolderOpen className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">Anexos de la Entidad</p>
            <p className="text-microdato text-muted-foreground">Carpetas por dependencia</p>
          </div>
        </Link>

        <Link
          to="/organigrama"
          className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors"
        >
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">Estructura Orgánica</p>
            <p className="text-microdato text-muted-foreground">Centros de costo</p>
          </div>
        </Link>

        <Link
          to="/reportes"
          className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors"
        >
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">Reportes Oficiales</p>
            <p className="text-microdato text-muted-foreground">Exportación PDF/Excel</p>
          </div>
        </Link>

        {perfil === 'ette' ? (
          <Link
            to="/delegados"
            className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors"
          >
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Users className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">Delegados ETTE</p>
              <p className="text-microdato text-muted-foreground">Cuentas externas</p>
            </div>
          </Link>
        ) : (
          <Link
            to="/cronograma"
            className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors"
          >
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Clock className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">Cronograma</p>
              <p className="text-microdato text-muted-foreground">Hitos de entrega</p>
            </div>
          </Link>
        )}

        <Link
          to="/observaciones"
          className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors"
        >
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <AlertCircle className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">Observaciones</p>
            <p className="text-microdato text-muted-foreground">Seguimiento de plazos</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
