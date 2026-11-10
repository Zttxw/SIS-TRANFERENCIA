import { useState } from 'react'
import { BarChart3, Boxes } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable, type ColumnaTabla } from '@/components/ui/data-table'
import { cn } from '@/lib/utils'
import { BotonesExport } from './BotonesExport'
import { useConciliacionPatrimonial, useMatrizAnexos } from './use-reportes'
import type { ClaveReporte, FilaConciliacion, FilaMatriz } from '@/types/reportes'

const TABS: { clave: ClaveReporte; etiqueta: string; icono: typeof BarChart3 }[] = [
  { clave: 'matriz-anexos', etiqueta: 'Matriz de anexos', icono: BarChart3 },
  { clave: 'conciliacion-patrimonial', etiqueta: 'Conciliación patrimonial', icono: Boxes },
]

/** Chip de presencia de anexo (Sí / —) para la matriz. */
function Presencia({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="inline-block rounded bg-success-soft px-1.5 py-0.5 text-nota font-semibold text-success-fg">
      Sí
    </span>
  ) : (
    <span className="text-muted-foreground">—</span>
  )
}

function KpiStrip({ items }: { items: { etiqueta: string; valor: string | number }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      {items.map((it) => (
        <Card key={it.etiqueta} className="bg-muted/20">
          <CardContent className="p-3">
            <div className="text-lg font-bold text-foreground">{it.valor}</div>
            <div className="text-nota text-muted-foreground">{it.etiqueta}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function MatrizView() {
  const { data, isLoading, error, refetch } = useMatrizAnexos()
  const m = data?.metricas

  const columnas: ColumnaTabla<FilaMatriz>[] = [
    { id: 'codigo', header: 'Código', cell: (f) => <span className="font-mono">{f.codigo}</span> },
    { id: 'nombre', header: 'Centro de costo', cell: (f) => f.nombre },
    { id: 'a02', header: 'A02', align: 'center', cell: (f) => <Presencia ok={f.anexo_02} /> },
    { id: 'a03', header: 'A03', align: 'center', cell: (f) => <Presencia ok={f.anexo_03} /> },
    { id: 'a04', header: 'A04', align: 'center', cell: (f) => <Presencia ok={f.anexo_04} /> },
    { id: 'a05', header: 'A05', align: 'center', cell: (f) => <Presencia ok={f.anexo_05} /> },
    { id: 'a06', header: 'A06', align: 'center', cell: (f) => <Presencia ok={f.anexo_06} /> },
    {
      id: 'completos',
      header: 'Completos',
      align: 'center',
      cell: (f) => <span className="font-mono font-semibold">{f.anexos_completos}/5</span>,
    },
    {
      id: 'patr',
      header: '% Patrimonio',
      align: 'right',
      cell: (f) => `${f.patrimonio_porcentaje} %`,
    },
  ]

  return (
    <div className="space-y-4">
      {m && (
        <KpiStrip
          items={[
            { etiqueta: 'Dependencias', valor: m.total_dependencias },
            { etiqueta: 'Bienes SIGA', valor: m.patrimonio.total_bienes },
            { etiqueta: 'Verificados', valor: m.patrimonio.verificados },
            { etiqueta: '% Patrimonio', valor: `${m.patrimonio.porcentaje} %` },
          ]}
        />
      )}
      <DataTable<FilaMatriz>
        columnas={columnas}
        filas={data?.filas}
        rowKey={(f) => f.dependencia_id}
        loading={isLoading}
        error={error}
        onReintentar={() => refetch()}
        vacio={{ titulo: 'Sin dependencias en su ámbito', descripcion: 'No hay datos para consolidar.' }}
      />
    </div>
  )
}

function ConciliacionView() {
  const { data, isLoading, error, refetch } = useConciliacionPatrimonial()
  const t = data?.totales

  const columnas: ColumnaTabla<FilaConciliacion>[] = [
    { id: 'codigo', header: 'Código', cell: (f) => <span className="font-mono">{f.codigo}</span> },
    { id: 'nombre', header: 'Centro de costo', cell: (f) => f.nombre },
    { id: 'total', header: 'Total', align: 'right', cell: (f) => f.total },
    { id: 'conf', header: 'Verificados', align: 'right', cell: (f) => f.confirmados },
    { id: 'pend', header: 'Pendientes', align: 'right', cell: (f) => f.pendientes },
    { id: 'porc', header: '% Avance', align: 'right', cell: (f) => `${f.porcentaje} %` },
  ]

  return (
    <div className="space-y-4">
      {t && (
        <KpiStrip
          items={[
            { etiqueta: 'Bienes SIGA', valor: t.total_bienes },
            { etiqueta: 'Verificados', valor: t.verificados },
            { etiqueta: 'Pendientes', valor: t.pendientes },
            { etiqueta: '% Avance', valor: `${t.porcentaje} %` },
          ]}
        />
      )}
      <DataTable<FilaConciliacion>
        columnas={columnas}
        filas={data?.filas}
        rowKey={(f) => f.dependencia_id}
        loading={isLoading}
        error={error}
        onReintentar={() => refetch()}
        vacio={{
          titulo: 'Sin bienes patrimoniales',
          descripcion: 'Ninguna dependencia de su ámbito tiene bienes para conciliar.',
        }}
      />
    </div>
  )
}

export function ReportesPage() {
  const [tab, setTab] = useState<ClaveReporte>('matriz-anexos')

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col gap-2 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-primary/40 bg-primary/5 text-nota font-semibold text-primary"
            >
              Módulo de Reportes
            </Badge>
            <span className="text-xs font-medium text-muted-foreground">
              Directiva N.° 001-2026-MDSJ/A
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
            Consolidados de la Transferencia
          </h1>
          <p className="text-sm text-muted-foreground">
            Matriz de anexos y conciliación patrimonial — acotados a su ámbito.
          </p>
        </div>
        <BotonesExport reporte={tab} />
      </div>

      {/* Selector de reporte */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(({ clave, etiqueta, icono: Icono }) => (
          <button
            key={clave}
            type="button"
            onClick={() => setTab(clave)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
              tab === clave
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-input text-muted-foreground hover:bg-muted',
            )}
          >
            <Icono className="h-4 w-4" />
            {etiqueta}
          </button>
        ))}
      </div>

      {/* Contenido del reporte activo */}
      {tab === 'matriz-anexos' && <MatrizView />}
      {tab === 'conciliacion-patrimonial' && <ConciliacionView />}
    </div>
  )
}
