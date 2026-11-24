import { useMemo, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Boxes,
  Building2,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  Filter,
  Layers,
  MessageSquareWarning,
  Minus,
  Package,
  Search,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { DataTable, type ColumnaTabla } from '@/components/ui/data-table'
import { cn } from '@/lib/utils'
import { BotonesExport } from './BotonesExport'
import {
  useConciliacionPatrimonial,
  useMatrizAnexos,
  useObservacionesReporte,
} from './use-reportes'
import type {
  ClaveReporte,
  FilaConciliacion,
  FilaMatriz,
  FilaObservacion,
} from '@/types/reportes'

const TABS: { clave: ClaveReporte; etiqueta: string; icono: typeof BarChart3 }[] = [
  { clave: 'matriz-anexos', etiqueta: 'Matriz de anexos', icono: BarChart3 },
  { clave: 'conciliacion-patrimonial', etiqueta: 'Conciliación patrimonial', icono: Boxes },
  { clave: 'observaciones', etiqueta: 'Observaciones', icono: MessageSquareWarning },
]

/* Paleta institucional (MDSJ) */
const PALETA = {
  primario: '#003366',
  consolidada: '#16a34a',
  remitida: '#2563eb',
  observada: '#d97706',
  borrador: '#64748b',
  patrimonio: '#0d9488',
  peligro: '#dc2626',
}

function esCompletoAnexo(v: unknown): boolean {
  return v === 'generado' || v === 'firmado' || v === 'entregado' || v === true || v === 'si'
}

function esFirmadoAnexo(v: unknown): boolean {
  return v === 'firmado' || v === 'entregado'
}

/** Chip visual de estado de anexo (Entregado / Sí / —) */
function Presencia({ valor }: { valor: unknown }) {
  if (esFirmadoAnexo(valor)) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-microdato font-bold text-emerald-800 border border-emerald-300 shadow-2xs"
        title="Documento firmado y entregado conforme"
      >
        <CheckCheck className="h-3 w-3 stroke-[2.5] text-emerald-700" />
        Entregado
      </span>
    )
  }

  if (esCompletoAnexo(valor)) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded bg-sky-50 px-2 py-0.5 text-microdato font-bold text-sky-800 border border-sky-200"
        title="Documento generado en PDF y firma (en avance)"
      >
        <Check className="h-3 w-3 stroke-[3] text-sky-600" />
        Sí
      </span>
    )
  }

  return (
    <span
      className="inline-flex items-center justify-center rounded bg-slate-100 px-2 py-0.5 text-microdato font-medium text-slate-400"
      title="Documento aún no generado en PDF y firma"
    >
      <Minus className="h-3 w-3" />
    </span>
  )
}

/** Chip visual para estado de entrega */
function BadgeEstado({ estado }: { estado: string }) {
  switch (estado) {
    case 'consolidada':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-microdato font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
          Consolidada
        </span>
      )
    case 'remitida':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-microdato font-semibold bg-blue-100 text-blue-800 border border-blue-200">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
          Remitida
        </span>
      )
    case 'observada':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-microdato font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
          Observada
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-microdato font-medium bg-slate-100 text-slate-700 border border-slate-200">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          Borrador
        </span>
      )
  }
}

/** Clasificación según Semáforo Institucional (Directiva N.° 001-2026-MDSJ/A)
 * - conforme (Verde): Entregado conforme (Consolidadas)
 * - en_plazo (Amarillo): Pendiente en el plazo (En formulación o revisión en plazo)
 * - vencido (Rojo): Se pasó de tiempo (Fuera de plazo o con observaciones abiertas)
 */
type EstadoSemaforo = 'conforme' | 'en_plazo' | 'vencido'

function getEstadoSemaforo(f: FilaMatriz): EstadoSemaforo {
  // 1. Verde: Entregado conforme (Consolidadas o entrega completa suscrita)
  if (f.estado_entrega === 'consolidada' || f.anexos_firmados === 5) {
    return 'conforme'
  }

  // 2. Rojo: Se pasó de tiempo / Observaciones pendientes
  if (f.estado_entrega === 'observada' || f.observaciones_abiertas > 0) {
    return 'vencido'
  }

  // 3. Amarillo: Pendiente en el plazo (Inicia en amarillo para todas las dependencias en formulación o revisión)
  return 'en_plazo'
}

/** Modal con divulgación progresiva para vista móvil / detalle de dependencia */
function ModalDetalleDependencia({
  fila,
  open,
  onClose,
}: {
  fila: FilaMatriz | null
  open: boolean
  onClose: () => void
}) {
  if (!fila) return null

  const sem = getEstadoSemaforo(fila)
  const anexosCompletados =
    (esCompletoAnexo(fila.anexo_02) ? 1 : 0) +
    (esCompletoAnexo(fila.anexo_03) ? 1 : 0) +
    (esCompletoAnexo(fila.anexo_04) ? 1 : 0) +
    (esCompletoAnexo(fila.anexo_05) ? 1 : 0) +
    (esCompletoAnexo(fila.anexo_06) ? 1 : 0)

  const porcentaje =
    fila.estado_entrega === 'consolidada'
      ? 100
      : (fila.porcentaje_avance ?? Math.round((anexosCompletados / 5) * 100))

  const colorBarra =
    porcentaje === 100 || fila.estado_entrega === 'consolidada'
      ? 'bg-emerald-600'
      : sem === 'vencido'
      ? 'bg-rose-600'
      : 'bg-amber-500'

  const colorTexto =
    porcentaje === 100 || fila.estado_entrega === 'consolidada'
      ? 'text-emerald-700'
      : sem === 'vencido'
      ? 'text-rose-700'
      : 'text-amber-700'

  const anexosLista = [
    { clave: 'A02', nombre: 'Informe de Gestión', valor: fila.anexo_02 },
    { clave: 'A03', nombre: 'Acervo Documental', valor: fila.anexo_03 },
    { clave: 'A04', nombre: 'Bienes Patrimoniales', valor: fila.anexo_04 },
    { clave: 'A05', nombre: 'Personal', valor: fila.anexo_05 },
    { clave: 'A06', nombre: 'Bienes No Patrimoniales', valor: fila.anexo_06 },
  ]

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`[${fila.codigo}] ${fila.nombre}`}
      description={fila.encargado ? `Responsable: ${fila.encargado}` : undefined}
    >
      <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1 text-sm">
        {/* Estado y Avance */}
        <div className="p-3.5 rounded-xl border border-border bg-muted/40 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Estado de entrega
            </span>
            <BadgeEstado estado={fila.estado_entrega} />
          </div>
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-muted-foreground font-medium">Avance global</span>
            <span className={cn('font-mono font-bold', colorTexto)}>
              {porcentaje}% ({anexosCompletados}/5 anexos)
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden border border-border/60">
            <div
              className={cn('h-full rounded-full transition-all duration-300', colorBarra)}
              style={{ width: `${porcentaje}%` }}
            />
          </div>
        </div>

        {/* Anexos de Transferencia */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Anexos de Transferencia
          </h4>
          <div className="divide-y divide-border border rounded-xl bg-card overflow-hidden">
            {anexosLista.map((anexo) => (
              <div key={anexo.clave} className="flex items-center justify-between p-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-primary">[{anexo.clave}]</span>
                  <span className="text-foreground font-medium">{anexo.nombre}</span>
                </div>
                <Presencia valor={anexo.valor} />
              </div>
            ))}
          </div>
        </div>

        {/* Observaciones y Patrimonio */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Observaciones */}
          <div className="p-3 rounded-xl border border-border bg-card flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Observaciones
            </span>
            <div className="mt-1.5 flex items-center gap-1.5">
              {fila.observaciones_abiertas > 0 ? (
                <span className="inline-flex items-center gap-1 font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-xs border border-rose-200">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {fila.observaciones_abiertas} abiertas
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs font-semibold border border-emerald-200">
                  <Check className="h-3.5 w-3.5" />
                  0 abiertas
                </span>
              )}
            </div>
          </div>

          {/* Conciliación Patrimonio */}
          <div className="p-3 rounded-xl border border-border bg-card flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              % Patrimonio
            </span>
            <div className="mt-1.5 flex items-baseline gap-1.5 font-mono font-bold text-xs">
              <span className={fila.patrimonio_porcentaje === 100 ? 'text-emerald-700' : 'text-amber-700'}>
                {fila.patrimonio_porcentaje}%
              </span>
              <span className="text-[11px] text-muted-foreground font-normal">
                ({fila.patrimonio_confirmados}/{fila.patrimonio_total})
              </span>
            </div>
          </div>
        </div>

        {/* Botón Cerrar */}
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="w-full mt-2"
        >
          Cerrar detalle
        </Button>
      </div>
    </Dialog>
  )
}

/* =========================================================================
   VISTA 1: MATRIZ DE ANEXOS (CONSOLIDADOS DINÁMICOS Y GRÁFICOS)
   ========================================================================= */
function MatrizView() {
  const { data, isLoading, error, refetch } = useMatrizAnexos()
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [filtroFaltante, setFiltroFaltante] = useState<string>('todos')
  const [filaDetalle, setFilaDetalle] = useState<FilaMatriz | null>(null)

  const metricas = data?.metricas
  const filas = data?.filas ?? []

  // Métricas derivadas para el Semáforo Institucional y filtrado
  const { semaforo, datosDonutSemaforo, filasFiltradas } = useMemo(() => {
    const total = filas.length || 1

    let conforme = 0
    let enPlazo = 0
    let vencido = 0

    for (const f of filas) {
      const est = getEstadoSemaforo(f)
      if (est === 'conforme') conforme++
      else if (est === 'en_plazo') enPlazo++
      else vencido++
    }

    const pctConforme = Math.round((conforme / total) * 100)
    const pctEnPlazo = Math.round((enPlazo / total) * 100)
    const pctVencido = Math.round((vencido / total) * 100)

    const semaforo = {
      conforme,
      enPlazo,
      vencido,
      pctConforme,
      pctEnPlazo,
      pctVencido,
    }

    const datosDonutSemaforo = [
      { name: 'Entregado conforme (Verde)', value: conforme, fill: '#16a34a' },
      { name: 'Pendiente en el plazo (Amarillo)', value: enPlazo, fill: '#eab308' },
      { name: 'Se pasó de tiempo (Rojo)', value: vencido, fill: '#dc2626' },
    ]

    // Filtrado interactivo de filas
    const texto = busqueda.toLowerCase().trim()
    const filtradas = filas.filter((f) => {
      const matchTexto =
        texto === '' ||
        f.codigo.toLowerCase().includes(texto) ||
        f.nombre.toLowerCase().includes(texto) ||
        (f.encargado && f.encargado.toLowerCase().includes(texto))

      let matchEstado = true
      if (filtroEstado === 'todos') {
        matchEstado = true
      } else if (filtroEstado === 'semaforo_verde') {
        matchEstado = getEstadoSemaforo(f) === 'conforme'
      } else if (filtroEstado === 'semaforo_amarillo') {
        matchEstado = getEstadoSemaforo(f) === 'en_plazo'
      } else if (filtroEstado === 'semaforo_rojo') {
        matchEstado = getEstadoSemaforo(f) === 'vencido'
      } else {
        matchEstado = f.estado_entrega === filtroEstado
      }

      let matchFaltante = true
      if (filtroFaltante === 'sin_a02') matchFaltante = !esCompletoAnexo(f.anexo_02)
      if (filtroFaltante === 'sin_a03') matchFaltante = !esCompletoAnexo(f.anexo_03)
      if (filtroFaltante === 'sin_a04') matchFaltante = !esCompletoAnexo(f.anexo_04)
      if (filtroFaltante === 'sin_a05') matchFaltante = !esCompletoAnexo(f.anexo_05)
      if (filtroFaltante === 'sin_a06') matchFaltante = !esCompletoAnexo(f.anexo_06)
      if (filtroFaltante === 'con_obs') matchFaltante = f.observaciones_abiertas > 0

      return matchTexto && matchEstado && matchFaltante
    })

    return {
      semaforo,
      datosDonutSemaforo,
      filasFiltradas: filtradas,
    }
  }, [filas, busqueda, filtroEstado, filtroFaltante])

  const columnas: ColumnaTabla<FilaMatriz>[] = [
    {
      id: 'codigo',
      header: 'Código',
      className: 'w-14 sm:w-16 whitespace-nowrap',
      cell: (f) => (
        <span className="font-mono font-bold text-primary text-nota whitespace-nowrap">
          [{f.codigo}]
        </span>
      ),
    },
    {
      id: 'nombre',
      header: 'Centro de costo',
      className: 'min-w-0',
      cell: (f) => {
        const sem = getEstadoSemaforo(f)
        const anexosCompletados =
          (esCompletoAnexo(f.anexo_02) ? 1 : 0) +
          (esCompletoAnexo(f.anexo_03) ? 1 : 0) +
          (esCompletoAnexo(f.anexo_04) ? 1 : 0) +
          (esCompletoAnexo(f.anexo_05) ? 1 : 0) +
          (esCompletoAnexo(f.anexo_06) ? 1 : 0)
        const porcentaje =
          f.estado_entrega === 'consolidada'
            ? 100
            : (f.porcentaje_avance ?? Math.round((anexosCompletados / 5) * 100))

        // Semáforo: Inicia en amarillo; al consolidar o 100% pasa a verde; si está fuera de plazo/vencido en rojo
        const colorBarra =
          porcentaje === 100 || f.estado_entrega === 'consolidada'
            ? 'bg-emerald-600'
            : sem === 'vencido'
            ? 'bg-rose-600'
            : 'bg-amber-500'

        const colorTexto =
          porcentaje === 100 || f.estado_entrega === 'consolidada'
            ? 'text-emerald-700'
            : sem === 'vencido'
            ? 'text-rose-700'
            : 'text-amber-700'

        return (
          <div className="min-w-0 max-w-[210px] sm:max-w-[280px]">
            <div className="font-semibold text-foreground uppercase text-nota truncate">
              {f.nombre}
            </div>
            {f.encargado && (
              <div className="text-microdato text-muted-foreground truncate">
                {f.encargado}
              </div>
            )}
            {/* Barrita de progreso semafórico (inicia en amarillo) */}
            <div className="flex items-center gap-1.5 mt-1">
              <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden border border-border/60">
                <div
                  className={cn('h-full rounded-full transition-all duration-300', colorBarra)}
                  style={{ width: `${porcentaje}%` }}
                />
              </div>
              <span className={cn('text-microdato font-mono font-bold shrink-0 text-[10px]', colorTexto)}>
                {porcentaje}%
              </span>
            </div>
          </div>
        )
      },
    },
    {
      id: 'acciones_movil',
      header: 'Detalle',
      align: 'right',
      className: 'table-cell sm:hidden w-20 text-right',
      cell: (f) => (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs font-semibold px-2 text-primary border-primary/30 hover:bg-primary/5 active:bg-primary/10 shadow-2xs whitespace-nowrap inline-flex items-center gap-1"
          onClick={(e) => {
            e.stopPropagation()
            setFilaDetalle(f)
          }}
        >
          <span>Ver más</span>
          <ChevronRight className="h-3 w-3" />
        </Button>
      ),
    },
    {
      id: 'estado',
      header: 'Estado',
      ocultarEnMovil: true,
      cell: (f) => <BadgeEstado estado={f.estado_entrega} />,
    },
    {
      id: 'a02',
      header: 'A02 Gestión',
      align: 'center',
      ocultarEnMovil: true,
      cell: (f) => <Presencia valor={f.anexo_02} />,
    },
    {
      id: 'a03',
      header: 'A03 Acervo',
      align: 'center',
      ocultarEnMovil: true,
      cell: (f) => <Presencia valor={f.anexo_03} />,
    },
    {
      id: 'a04',
      header: 'A04 Patr.',
      align: 'center',
      ocultarEnMovil: true,
      cell: (f) => <Presencia valor={f.anexo_04} />,
    },
    {
      id: 'a05',
      header: 'A05 Personal',
      align: 'center',
      ocultarEnMovil: true,
      cell: (f) => <Presencia valor={f.anexo_05} />,
    },
    {
      id: 'a06',
      header: 'A06 No Patr.',
      align: 'center',
      ocultarEnMovil: true,
      cell: (f) => <Presencia valor={f.anexo_06} />,
    },
    {
      id: 'obs',
      header: 'Obs.',
      align: 'center',
      ocultarEnMovil: true,
      cell: (f) =>
        f.observaciones_abiertas > 0 ? (
          <span className="inline-flex items-center gap-0.5 font-mono font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded text-microdato">
            <AlertCircle className="h-3 w-3" />
            {f.observaciones_abiertas}
          </span>
        ) : (
          <span className="text-muted-foreground font-mono text-microdato">0</span>
        ),
    },
    {
      id: 'patr',
      header: '% Patrimonio',
      align: 'right',
      ocultarEnMovil: true,
      cell: (f) => (
        <div className="flex items-center justify-end gap-2">
          <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden border border-border">
            <div
              className={`h-full rounded-full ${
                f.patrimonio_porcentaje === 100
                  ? 'bg-emerald-600'
                  : f.patrimonio_porcentaje > 50
                  ? 'bg-teal-600'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${f.patrimonio_porcentaje}%` }}
            />
          </div>
          <span className="font-mono text-nota font-semibold w-10 text-right">
            {f.patrimonio_porcentaje}%
          </span>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* ========================================================
          TARJETAS KPI SUPERIORES CON MICRO-MÉTRICAS INTUITIVAS (X/TOTAL)
          ======================================================== */}
      {metricas && (() => {
        const total = metricas.total_dependencias || filas.length || 1
        const totalEvaluadas = metricas.consolidadas + metricas.remitidas + metricas.observadas
        const denObs = totalEvaluadas > 0 ? totalEvaluadas : total

        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {/* Dependencias */}
            <Card className="border border-slate-200/80 shadow-2xs bg-slate-50/70">
              <CardContent className="p-2.5 sm:p-3">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Dependencias</span>
                  <Building2 className="h-3.5 w-3.5 text-slate-700" />
                </div>
                <div className="mt-1 text-xl sm:text-2xl font-black text-slate-900 font-mono">
                  {metricas.total_dependencias}
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5 font-medium truncate">100% supervisadas</p>
              </CardContent>
            </Card>

            {/* Consolidadas */}
            <Card className="border border-emerald-200/70 shadow-2xs bg-emerald-50/50">
              <CardContent className="p-2.5 sm:p-3">
                <div className="flex items-center justify-between text-emerald-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Consolidadas</span>
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <div className="mt-1 flex items-baseline gap-1 font-mono">
                  <span className="text-xl sm:text-2xl font-black text-emerald-700">{metricas.consolidadas}</span>
                  <span className="text-[11px] font-semibold text-emerald-700/70">/ {total}</span>
                </div>
                <p className="text-[11px] text-emerald-800 font-medium mt-0.5 truncate">
                  {Math.round((metricas.consolidadas / total) * 100)}% conformes
                </p>
              </CardContent>
            </Card>

            {/* Remitidas */}
            <Card className="border border-blue-200/70 shadow-2xs bg-blue-50/50">
              <CardContent className="p-2.5 sm:p-3">
                <div className="flex items-center justify-between text-blue-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Remitidas</span>
                  <Clock className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <div className="mt-1 flex items-baseline gap-1 font-mono">
                  <span className="text-xl sm:text-2xl font-black text-blue-700">{metricas.remitidas}</span>
                  <span className="text-[11px] font-semibold text-blue-700/70">/ {total}</span>
                </div>
                <p className="text-[11px] text-blue-800 font-medium mt-0.5 truncate">
                  En revisión técnica ({Math.round((metricas.remitidas / total) * 100)}%)
                </p>
              </CardContent>
            </Card>

            {/* Observadas */}
            <Card className="border border-amber-200/70 shadow-2xs bg-amber-50/50">
              <CardContent className="p-2.5 sm:p-3">
                <div className="flex items-center justify-between text-amber-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Observadas</span>
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                </div>
                <div className="mt-1 flex items-baseline gap-1 font-mono">
                  <span className="text-xl sm:text-2xl font-black text-amber-700">{metricas.observadas}</span>
                  <span className="text-[11px] font-semibold text-amber-700/70">/ {denObs}</span>
                </div>
                <p className="text-[11px] text-amber-800 font-medium mt-0.5 truncate">
                  {totalEvaluadas > 0
                    ? `${Math.round((metricas.observadas / totalEvaluadas) * 100)}% observadas`
                    : 'Sin observaciones'}
                </p>
              </CardContent>
            </Card>

            {/* En Borrador */}
            <Card className="border border-slate-200 shadow-2xs bg-slate-50/70">
              <CardContent className="p-2.5 sm:p-3">
                <div className="flex items-center justify-between text-slate-700">
                  <span className="text-[10px] font-bold uppercase tracking-wider">En Borrador</span>
                  <Minus className="h-3.5 w-3.5 text-slate-500" />
                </div>
                <div className="mt-1 flex items-baseline gap-1 font-mono">
                  <span className="text-xl sm:text-2xl font-black text-slate-700">{metricas.borrador}</span>
                  <span className="text-[11px] font-semibold text-slate-500">/ {total}</span>
                </div>
                <p className="text-[11px] text-slate-600 font-medium mt-0.5 truncate">
                  En formulación ({Math.round((metricas.borrador / total) * 100)}%)
                </p>
              </CardContent>
            </Card>

            {/* Avance Pliego */}
            <Card className="border border-sky-200/70 shadow-2xs bg-sky-50/50">
              <CardContent className="p-2.5 sm:p-3">
                <div className="flex items-center justify-between text-sky-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Avance Pliego</span>
                  <TrendingUp className="h-3.5 w-3.5 text-sky-600" />
                </div>
                <div className="mt-1 text-xl sm:text-2xl font-black text-sky-800 font-mono">
                  {metricas.porcentaje_avance}%
                </div>
                <p className="text-[11px] text-sky-700 mt-0.5 font-medium truncate">
                  {metricas.consolidadas} de {total} cerradas
                </p>
              </CardContent>
            </Card>
          </div>
        )
      })()}

      {/* ========================================================
          SEMÁFORO DE CUMPLIMIENTO INSTITUCIONAL (GRÁFICO DEL PASTEL)
          1. Verde: Entregado conforme
          2. Amarillo: Pendiente en el plazo
          3. Rojo: Se pasó de tiempo
          ======================================================== */}
      <Card className="border shadow-xs overflow-hidden bg-card">
            <CardHeader className="py-3 px-4 border-b border-border bg-muted flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span>Semáforo de Cumplimiento de Entregas</span>
                </CardTitle>
                <p className="text-microdato text-muted-foreground mt-0.5">
                  Monitoreo según plazo normativo de transferencia (Directiva N.° 001-2026-MDSJ/A)
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background border border-border text-microdato font-mono text-muted-foreground">
                  <Clock className="h-3 w-3 text-primary" />
                  Plazo normativo: <strong className="text-foreground">07/11/2026</strong>
                </span>
                <span className="text-microdato font-mono text-muted-foreground font-semibold">
                  Total: <strong className="text-foreground">{filas.length}</strong> dependencias
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-14 w-full max-w-2xl py-3">
                {/* Gráfico del Pastel (Semáforo de Cumplimiento) */}
                <div className="relative w-[260px] h-[260px] sm:w-[280px] sm:h-[280px] shrink-0 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={datosDonutSemaforo}
                        cx="50%"
                        cy="50%"
                        innerRadius={75}
                        outerRadius={118}
                        paddingAngle={3}
                        dataKey="value"
                        strokeWidth={1}
                      >
                        {datosDonutSemaforo.map((entry, index) => (
                          <Cell key={`cell-semaforo-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: unknown, name: unknown) => [
                          `${val ?? 0} oficinas`,
                          String(name ?? ''),
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute top-[38%] text-center pointer-events-none">
                    <span className="text-4xl font-black text-foreground font-mono">
                      {semaforo.pctConforme}%
                    </span>
                    <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
                      Cierre Conforme
                    </p>
                  </div>
                </div>

                {/* Leyenda y desglose del pastel */}
                <div className="space-y-2.5 text-xs w-full sm:w-auto min-w-[220px]">
                  <div className="flex items-center justify-between gap-4 p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-emerald-600 shrink-0" />
                      <span className="text-emerald-950 font-medium">Entregado conforme</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-800 text-sm">
                      {semaforo.conforme}{' '}
                      <span className="text-microdato font-normal text-emerald-700">
                        ({semaforo.pctConforme}%)
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 p-2.5 rounded-lg bg-amber-50/70 border border-amber-200">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-amber-500 shrink-0" />
                      <span className="text-amber-950 font-medium">Pendiente en el plazo</span>
                    </div>
                    <span className="font-mono font-bold text-amber-800 text-sm">
                      {semaforo.enPlazo}{' '}
                      <span className="text-microdato font-normal text-amber-700">
                        ({semaforo.pctEnPlazo}%)
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 p-2.5 rounded-lg bg-rose-50/70 border border-rose-200">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-rose-600 shrink-0" />
                      <span className="text-rose-950 font-medium">Se pasó de tiempo</span>
                    </div>
                    <span className="font-mono font-bold text-rose-800 text-sm">
                      {semaforo.vencido}{' '}
                      <span className="text-microdato font-normal text-rose-700">
                        ({semaforo.pctVencido}%)
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

      {/* ========================================================
          BARRA DE CONTROL Y FILTRADO INTERACTIVO DE LA TABLA
          ======================================================== */}
      <Card className="border shadow-xs overflow-hidden">
        <CardHeader className="p-4 border-b border-border bg-muted space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <CardTitle className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
                Matriz General de Anexos por Centro de Costo
              </CardTitle>
            </div>
            <span className="text-nota font-mono text-muted-foreground">
              Mostrando <strong className="text-foreground">{filasFiltradas.length}</strong> de{' '}
              {filas.length} dependencias
            </span>
          </div>

          {/* Filtros tipo píldora del Semáforo */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setFiltroEstado('todos')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors',
                filtroEstado === 'todos'
                  ? 'bg-foreground text-background font-semibold'
                  : 'bg-background border border-border text-foreground hover:bg-muted',
              )}
            >
              Todos ({filas.length})
            </button>
            <button
              type="button"
              onClick={() => setFiltroEstado('semaforo_verde')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5',
                filtroEstado === 'semaforo_verde'
                  ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100',
              )}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-600" />
              Conformes ({semaforo.conforme})
            </button>
            <button
              type="button"
              onClick={() => setFiltroEstado('semaforo_amarillo')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5',
                filtroEstado === 'semaforo_amarillo'
                  ? 'bg-amber-600 text-white font-semibold shadow-xs'
                  : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100',
              )}
            >
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              En plazo ({semaforo.enPlazo})
            </button>
            <button
              type="button"
              onClick={() => setFiltroEstado('semaforo_rojo')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5',
                filtroEstado === 'semaforo_rojo'
                  ? 'bg-rose-600 text-white font-semibold shadow-xs'
                  : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100',
              )}
            >
              <span className="h-2 w-2 rounded-full bg-rose-600" />
              Se pasó de tiempo ({semaforo.vencido})
            </button>
          </div>

          {/* Buscador y filtro por faltante */}
          <div className="pt-1 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por código (ej. 00001), centro de costo o responsable..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-8 text-xs h-8 bg-background"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={filtroFaltante}
                onChange={(e) => setFiltroFaltante(e.target.value)}
                className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs focus:ring-1 focus:ring-primary"
              >
                <option value="todos">Todos los anexos</option>
                <option value="sin_a02">Falta A02 Gestión</option>
                <option value="sin_a03">Falta A03 Acervo</option>
                <option value="sin_a04">Falta A04 Patrimonio</option>
                <option value="sin_a05">Falta A05 Personal</option>
                <option value="con_obs">Con observaciones pendientes</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <DataTable<FilaMatriz>
            columnas={columnas}
            filas={filasFiltradas}
            rowKey={(f) => f.dependencia_id}
            loading={isLoading}
            error={error}
            onReintentar={() => refetch()}
            onRowClick={(f) => setFilaDetalle(f)}
            vacio={{
              titulo: 'No se encontraron dependencias con los filtros seleccionados',
              descripcion: 'Pruebe ajustando el término de búsqueda o cambiando el filtro de estado.',
            }}
          />
        </CardContent>
      </Card>

      {/* Modal con divulgación progresiva para vista móvil / consulta rápida */}
      <ModalDetalleDependencia
        fila={filaDetalle}
        open={filaDetalle !== null}
        onClose={() => setFilaDetalle(null)}
      />
    </div>
  )
}

/* =========================================================================
   VISTA 2: CONCILIACIÓN PATRIMONIAL (SIGA VS ENTREGA CON GRÁFICOS)
   ========================================================================= */
function ConciliacionView() {
  const { data, isLoading, error, refetch } = useConciliacionPatrimonial()
  const [busqueda, setBusqueda] = useState('')
  const [filtroRango, setFiltroRango] = useState<'todos' | '100' | 'proceso' | 'cero'>('todos')

  const t = data?.totales
  const filas = data?.filas ?? []

  // Cálculos para gráficos
  const { topBienes, datosDonutPatr, filasFiltradas } = useMemo(() => {
    // 1. Top 8 dependencias con mayor cantidad de bienes
    const topBienes = [...filas]
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
      .map((f) => ({
        nombre: f.nombre.length > 20 ? f.nombre.substring(0, 20) + '…' : f.nombre,
        nombreCompleto: f.nombre,
        codigo: f.codigo,
        confirmados: f.confirmados,
        pendientes: f.pendientes,
        total: f.total,
        porcentaje: f.porcentaje,
      }))

    // 2. Distribución de avance
    const completas = filas.filter((f) => f.porcentaje === 100).length
    const enProceso = filas.filter((f) => f.porcentaje > 0 && f.porcentaje < 100).length
    const sinIniciar = filas.filter((f) => f.porcentaje === 0).length

    const datosDonutPatr = [
      { name: '100% Verificado', value: completas, fill: PALETA.consolidada },
      { name: 'En Proceso (1-99%)', value: enProceso, fill: PALETA.patrimonio },
      { name: 'Sin Iniciar (0%)', value: sinIniciar, fill: '#f87171' },
    ]

    // 3. Filtrado de filas
    const texto = busqueda.toLowerCase().trim()
    const filtradas = filas.filter((f) => {
      const matchTexto =
        texto === '' ||
        f.codigo.toLowerCase().includes(texto) ||
        f.nombre.toLowerCase().includes(texto)

      let matchRango = true
      if (filtroRango === '100') matchRango = f.porcentaje === 100
      if (filtroRango === 'proceso') matchRango = f.porcentaje > 0 && f.porcentaje < 100
      if (filtroRango === 'cero') matchRango = f.porcentaje === 0

      return matchTexto && matchRango
    })

    return {
      topBienes,
      datosDonutPatr,
      filasFiltradas: filtradas,
    }
  }, [filas, busqueda, filtroRango])

  const columnas: ColumnaTabla<FilaConciliacion>[] = [
    {
      id: 'codigo',
      header: 'Código',
      cell: (f) => (
        <span className="font-mono font-bold text-primary text-nota whitespace-nowrap">
          [{f.codigo}]
        </span>
      ),
    },
    {
      id: 'nombre',
      header: 'Centro de costo',
      cell: (f) => (
        <span className="font-medium text-foreground uppercase text-nota">
          {f.nombre}
        </span>
      ),
    },
    {
      id: 'total',
      header: 'Bienes SIGA',
      align: 'right',
      cell: (f) => (
        <span className="font-mono font-semibold text-foreground">
          {f.total.toLocaleString('es-PE')}
        </span>
      ),
    },
    {
      id: 'conf',
      header: 'Verificados',
      align: 'right',
      cell: (f) => (
        <span className="font-mono font-bold text-emerald-700">
          {f.confirmados.toLocaleString('es-PE')}
        </span>
      ),
    },
    {
      id: 'pend',
      header: 'Pendientes',
      align: 'right',
      cell: (f) => (
        <span className="font-mono font-bold text-rose-600">
          {f.pendientes.toLocaleString('es-PE')}
        </span>
      ),
    },
    {
      id: 'porc',
      header: '% Avance',
      align: 'right',
      cell: (f) => (
        <div className="flex items-center justify-end gap-2">
          <div className="w-20 h-2 rounded-full bg-slate-100 overflow-hidden border border-border">
            <div
              className={`h-full rounded-full ${
                f.porcentaje === 100
                  ? 'bg-emerald-600'
                  : f.porcentaje > 50
                  ? 'bg-teal-600'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${f.porcentaje}%` }}
            />
          </div>
          <span className="font-mono text-nota font-bold w-12 text-right">
            {f.porcentaje}%
          </span>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* KPIS PATRIMONIALES */}
      {t && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <Card className="border shadow-xs bg-card">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-microdato font-bold uppercase tracking-wider">Total Bienes SIGA</span>
                <Package className="h-4 w-4 text-primary" />
              </div>
              <div className="mt-1 text-2xl font-extrabold text-foreground font-mono">
                {t.total_bienes.toLocaleString('es-PE')}
              </div>
              <p className="text-microdato text-muted-foreground mt-0.5">
                Valor: S/ {(t.valor_total / 1000000).toFixed(2)}M
              </p>
            </CardContent>
          </Card>

          <Card className="border shadow-xs bg-card">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-microdato font-bold uppercase tracking-wider">Bienes Verificados</span>
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="mt-1 text-2xl font-extrabold text-emerald-600 font-mono">
                {t.verificados.toLocaleString('es-PE')}
              </div>
              <p className="text-microdato text-emerald-700 font-medium mt-0.5">
                Cotejados físicamente
              </p>
            </CardContent>
          </Card>

          <Card className="border shadow-xs bg-card">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-microdato font-bold uppercase tracking-wider">Bienes Pendientes</span>
                <AlertTriangle className="h-4 w-4 text-rose-600" />
              </div>
              <div className="mt-1 text-2xl font-extrabold text-rose-600 font-mono">
                {t.pendientes.toLocaleString('es-PE')}
              </div>
              <p className="text-microdato text-rose-700 font-medium mt-0.5">
                Por verificar en sede
              </p>
            </CardContent>
          </Card>

          <Card className="border shadow-xs bg-card">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-microdato font-bold uppercase tracking-wider">Cobertura Pliego</span>
                <TrendingUp className="h-4 w-4 text-teal-600" />
              </div>
              <div className="mt-1 text-2xl font-extrabold text-teal-600 font-mono">
                {t.porcentaje}%
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div className="bg-teal-600 h-full rounded-full" style={{ width: `${t.porcentaje}%` }} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* GRÁFICOS PATRIMONIALES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Top 8 dependencias con más bienes */}
        <Card className="lg:col-span-8 border shadow-xs">
          <CardHeader className="py-2.5 px-4 border-b border-border bg-muted flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Package className="h-4 w-4 text-teal-600" />
              <span>Dependencias con Mayor Carga Patrimonial (Verificados vs Pendientes)</span>
            </CardTitle>
            <span className="text-microdato font-mono text-muted-foreground">Top 8</span>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topBienes}
                  margin={{ top: 10, right: 15, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="nombre" tick={{ fontSize: 10 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      fontSize: '12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                    }}
                    formatter={(val: unknown, name: unknown) => [
                      `${val ?? 0} bienes`,
                      String(name ?? ''),
                    ]}
                  />
                  <Legend
                    verticalAlign="top"
                    height={28}
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px' }}
                  />
                  <Bar
                    dataKey="confirmados"
                    name="Verificados"
                    fill={PALETA.consolidada}
                    stackId="a"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="pendientes"
                    name="Pendientes"
                    fill="#f87171"
                    stackId="a"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Donut de estado patrimonial por oficinas */}
        <Card className="lg:col-span-4 border shadow-xs">
          <CardHeader className="py-2.5 px-4 border-b border-border bg-muted">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Boxes className="h-4 w-4 text-primary" />
              <span>Estado por Oficinas</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex flex-col items-center">
            <div className="relative w-full h-[200px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={datosDonutPatr}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={1}
                  >
                    {datosDonutPatr.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: unknown, name: unknown) => [
                      `${val ?? 0} oficinas`,
                      String(name ?? ''),
                    ]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <p className="text-microdato text-muted-foreground text-center mt-2">
              Distribución de cumplimiento en las {filas.length} oficinas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* TABLA Y FILTROS */}
      <Card className="border shadow-xs overflow-hidden">
        <CardHeader className="p-4 border-b border-border bg-muted space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Boxes className="h-4 w-4 text-teal-600" />
              <span>Inventario Físico de Bienes por Centro de Costo ({filasFiltradas.length})</span>
            </CardTitle>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar oficina por nombre o código..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-8 text-xs h-8 bg-background"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <select
                value={filtroRango}
                onChange={(e) => setFiltroRango(e.target.value as any)}
                className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs focus:ring-1 focus:ring-primary"
              >
                <option value="todos">Todos los rangos</option>
                <option value="100">100% Verificado</option>
                <option value="proceso">En Proceso (1-99%)</option>
                <option value="cero">Sin Iniciar (0%)</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable<FilaConciliacion>
            columnas={columnas}
            filas={filasFiltradas}
            rowKey={(f) => f.dependencia_id}
            loading={isLoading}
            error={error}
            onReintentar={() => refetch()}
            vacio={{
              titulo: 'Sin bienes patrimoniales',
              descripcion: 'Ninguna dependencia coincide con los filtros aplicados.',
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}

/* =========================================================================
   VISTA 3: OBSERVACIONES (ANÁLISIS DE INCIDENCIAS CON GRÁFICOS)
   ========================================================================= */
function ObservacionesView() {
  const { data, isLoading, error, refetch } = useObservacionesReporte()
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')

  const r = data?.resumen
  const filas = data?.filas ?? []

  // Análisis gráfico de observaciones
  const { datosPorAnexo, datosPorEstado, filasFiltradas } = useMemo(() => {
    // 1. Observaciones por Anexo
    const anexosMap: Record<string, number> = {}
    filas.forEach((f) => {
      const nom = f.anexo || 'General'
      anexosMap[nom] = (anexosMap[nom] || 0) + 1
    })
    const datosPorAnexo = Object.entries(anexosMap).map(([anexo, cant]) => ({
      anexo,
      cantidad: cant,
    }))

    // 2. Observaciones por Estado
    const datosPorEstado = [
      { name: 'Abiertas', value: r?.abiertas ?? 0, fill: '#dc2626' },
      { name: 'En Subsanación', value: r?.en_subsanacion ?? 0, fill: '#2563eb' },
      { name: 'Subsanadas', value: r?.subsanadas ?? 0, fill: '#16a34a' },
      { name: 'Desestimadas', value: r?.desestimadas ?? 0, fill: '#64748b' },
    ]

    // 3. Filtrado
    const texto = busqueda.toLowerCase().trim()
    const filtradas = filas.filter((f) => {
      const matchTexto =
        texto === '' ||
        f.codigo.toLowerCase().includes(texto) ||
        f.nombre.toLowerCase().includes(texto) ||
        f.descripcion.toLowerCase().includes(texto)

      const matchEstado =
        filtroEstado === 'todos' || f.estado === filtroEstado

      return matchTexto && matchEstado
    })

    return {
      datosPorAnexo,
      datosPorEstado,
      filasFiltradas: filtradas,
    }
  }, [filas, r, busqueda, filtroEstado])

  const columnas: ColumnaTabla<FilaObservacion>[] = [
    {
      id: 'codigo',
      header: 'Código',
      cell: (f) => (
        <span className="font-mono font-bold text-primary text-nota whitespace-nowrap">
          [{f.codigo}]
        </span>
      ),
    },
    {
      id: 'nombre',
      header: 'Centro de costo',
      cell: (f) => (
        <span className="font-medium text-foreground uppercase text-nota">
          {f.nombre}
        </span>
      ),
    },
    {
      id: 'anexo',
      header: 'Anexo',
      cell: (f) => (
        <Badge variant="outline" className="text-microdato font-mono">
          {f.anexo}
        </Badge>
      ),
    },
    {
      id: 'descripcion',
      header: 'Observación formulada',
      cell: (f) => (
        <div className="max-w-[340px]">
          <p className="line-clamp-2 text-nota text-foreground">{f.descripcion}</p>
          {f.autor && (
            <p className="text-microdato text-muted-foreground mt-0.5">Por: {f.autor}</p>
          )}
        </div>
      ),
    },
    {
      id: 'estado',
      header: 'Estado',
      cell: (f) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-microdato font-semibold ${
            f.estado === 'abierta'
              ? 'bg-rose-100 text-rose-800'
              : f.estado === 'en_subsanacion'
              ? 'bg-blue-100 text-blue-800'
              : f.estado === 'subsanada'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-slate-100 text-slate-700'
          }`}
        >
          {f.estado_etiqueta}
        </span>
      ),
    },
    {
      id: 'registrada',
      header: 'Registrada',
      cell: (f) => (
        <span className="text-microdato text-muted-foreground whitespace-nowrap font-mono">
          {f.registrada_en ?? '—'}
        </span>
      ),
    },
    {
      id: 'dias',
      header: 'Días límite',
      align: 'right',
      cell: (f) => (
        <span className="font-mono text-nota font-bold text-foreground">
          {f.dias_subsanacion ?? '—'} d
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* KPIS OBSERVACIONES */}
      {r && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <Card className="border shadow-xs bg-card">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-microdato font-bold uppercase tracking-wider">Abiertas</span>
                <AlertCircle className="h-4 w-4 text-rose-600" />
              </div>
              <div className="mt-1 text-2xl font-extrabold text-rose-600 font-mono">
                {r.abiertas}
              </div>
              <p className="text-microdato text-rose-700 font-medium mt-0.5">
                Requieren subsanación
              </p>
            </CardContent>
          </Card>

          <Card className="border shadow-xs bg-card">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-microdato font-bold uppercase tracking-wider">En Subsanación</span>
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              <div className="mt-1 text-2xl font-extrabold text-blue-600 font-mono">
                {r.en_subsanacion}
              </div>
              <p className="text-microdato text-blue-700 font-medium mt-0.5">
                En plazo de descargo
              </p>
            </CardContent>
          </Card>

          <Card className="border shadow-xs bg-card">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-microdato font-bold uppercase tracking-wider">Subsanadas</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="mt-1 text-2xl font-extrabold text-emerald-600 font-mono">
                {r.subsanadas}
              </div>
              <p className="text-microdato text-emerald-700 font-medium mt-0.5">
                Conformes por el revisor
              </p>
            </CardContent>
          </Card>

          <Card className="border shadow-xs bg-card">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-microdato font-bold uppercase tracking-wider">Desestimadas</span>
                <Minus className="h-4 w-4 text-slate-500" />
              </div>
              <div className="mt-1 text-2xl font-extrabold text-slate-600 font-mono">
                {r.desestimadas}
              </div>
              <p className="text-microdato text-slate-500 font-medium mt-0.5">
                Cerradas sin efecto
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* GRÁFICOS OBSERVACIONES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Card className="lg:col-span-8 border shadow-xs">
          <CardHeader className="py-2.5 px-4 border-b border-border bg-muted">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span>Observaciones Agrupadas por Tipo de Anexo</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={datosPorAnexo}
                  margin={{ top: 10, right: 15, left: -15, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="anexo" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      fontSize: '12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                    }}
                  />
                  <Bar
                    dataKey="cantidad"
                    name="Observaciones"
                    fill="#d97706"
                    radius={[4, 4, 0, 0]}
                    barSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4 border shadow-xs">
          <CardHeader className="py-2.5 px-4 border-b border-border bg-muted">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-primary" />
              <span>Estado de Observaciones</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex flex-col items-center">
            <div className="relative w-full h-[180px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={datosPorEstado}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={1}
                  >
                    {datosPorEstado.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: unknown, name: unknown) => [
                      `${val ?? 0} obs.`,
                      String(name ?? ''),
                    ]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TABLA Y BUSCADOR */}
      <Card className="border shadow-xs overflow-hidden">
        <CardHeader className="p-4 border-b border-border bg-muted space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <MessageSquareWarning className="h-4 w-4 text-amber-600" />
              <span>Relación Oficial de Observaciones ({filasFiltradas.length})</span>
            </CardTitle>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, dependencia o texto de observación..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-8 text-xs h-8 bg-background"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs focus:ring-1 focus:ring-primary"
              >
                <option value="todos">Todos los estados</option>
                <option value="abierta">Abiertas</option>
                <option value="en_subsanacion">En subsanación</option>
                <option value="subsanada">Subsanadas</option>
                <option value="desestimada">Desestimadas</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable<FilaObservacion & { __k: number }>
            columnas={columnas}
            filas={filasFiltradas.map((f, i) => ({ ...f, __k: i }))}
            rowKey={(f) => `${f.dependencia_id}-${f.__k}`}
            loading={isLoading}
            error={error}
            onReintentar={() => refetch()}
            vacio={{
              titulo: 'Sin observaciones registradas',
              descripcion: 'No hay observaciones que coincidan con los filtros aplicados.',
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}

/* =========================================================================
   COMPONENTE PRINCIPAL: REPORTES PAGE
   ========================================================================= */
export function ReportesPage() {
  const [tab, setTab] = useState<ClaveReporte>('matriz-anexos')

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Cabecera institucional */}
      <div className="flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-primary/40 bg-primary/10 text-microdato font-bold text-primary uppercase tracking-wider"
            >
              Módulo de Reportes y Fiscalización
            </Badge>
            <span className="text-microdato font-mono font-medium text-muted-foreground">
              Directiva N.° 001-2026-MDSJ/A
            </span>
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Consolidados de la Transferencia
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Matriz de anexos, conciliación patrimonial y observaciones con analítica institucional.
          </p>
        </div>
        <BotonesExport reporte={tab} />
      </div>

      {/* Selector de reporte / pestañas estilo píldora */}
      <div className="flex flex-wrap gap-2 p-1 rounded-xl bg-muted/60 border border-border w-fit">
        {TABS.map(({ clave, etiqueta, icono: Icono }) => (
          <button
            key={clave}
            type="button"
            onClick={() => setTab(clave)}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer',
              tab === clave
                ? 'bg-primary text-white shadow-xs'
                : 'text-muted-foreground hover:bg-background hover:text-foreground',
            )}
          >
            <Icono className="h-4 w-4" />
            <span>{etiqueta}</span>
          </button>
        ))}
      </div>

      {/* Contenido del reporte activo */}
      {tab === 'matriz-anexos' && <MatrizView />}
      {tab === 'conciliacion-patrimonial' && <ConciliacionView />}
      {tab === 'observaciones' && <ObservacionesView />}
    </div>
  )
}
