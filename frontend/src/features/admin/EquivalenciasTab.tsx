import { useMemo, useState } from 'react'
import { Info, Search } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import type { Equivalencia, FiltrosEquivalencias, OrigenEquivalencia } from './centros-costo.service'
import { useAsignarEquivalencia, useCentrosCosto, useEquivalencias } from './use-centros-costo'

const ORIGENES: { valor: OrigenEquivalencia | ''; etiqueta: string }[] = [
  { valor: '', etiqueta: 'SGD y SIGA' },
  { valor: 'sgd', etiqueta: 'Solo SGD' },
  { valor: 'siga', etiqueta: 'Solo SIGA' },
]

/**
 * Tabla de equivalencias SGD/SIGA → centro de costo del Anexo 01 (D-11). La
 * vinculación se decide a mano, por nombre: no hay un código común entre los
 * sistemas. Lo que queda sin asignar no entra al flujo de transferencia.
 */
export function EquivalenciasTab() {
  const [filtros, setFiltros] = useState<FiltrosEquivalencias>({ origen: '', sin_asignar: true, buscar: '' })
  const centros = useCentrosCosto()
  const equivalencias = useEquivalencias(filtros)

  const opciones = useMemo(
    () => (centros.data ?? []).map((c) => ({ value: c.id, label: c.nombre, descripcion: `${c.codigo} · nivel ${c.nivel}` })),
    [centros.data],
  )
  const filas = equivalencias.data ?? []

  return (
    <div className="space-y-4">
      <Card className="border bg-muted/30 shadow-xs">
        <CardContent className="flex gap-2 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            Vincule cada dependencia del SGD y cada centro de costo del SIGA con su centro de costo del Anexo 01, comparando
            los nombres. La dependencia <strong className="text-foreground">principal</strong> de un CC es la que da su
            responsable. Los cambios aplican a las próximas ingestas; para trasladar los registros ya cargados, ejecute{' '}
            <code className="rounded bg-muted px-1 font-mono text-foreground">php artisan centros-costo:reasignar</code>.
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o código de origen…"
            value={filtros.buscar}
            onChange={(e) => setFiltros((f) => ({ ...f, buscar: e.target.value }))}
            className="h-8 pl-8 text-xs"
          />
        </div>
        <select
          aria-label="Sistema de origen"
          value={filtros.origen}
          onChange={(e) => setFiltros((f) => ({ ...f, origen: e.target.value as OrigenEquivalencia | '' }))}
          className="h-8 rounded-md border bg-background px-2 text-xs"
        >
          {ORIGENES.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.etiqueta}
            </option>
          ))}
        </select>
        <label className="inline-flex items-center gap-2 text-xs text-foreground">
          <input
            type="checkbox"
            checked={filtros.sin_asignar}
            onChange={(e) => setFiltros((f) => ({ ...f, sin_asignar: e.target.checked }))}
          />
          Solo sin asignar
        </label>
        <span className="text-xs text-muted-foreground sm:ml-auto">{filas.length} filas</span>
      </div>

      {equivalencias.isLoading ? (
        <div className="flex justify-center p-8">
          <Spinner className="h-6 w-6 text-primary" />
        </div>
      ) : filas.length === 0 ? (
        <p className="rounded-lg border p-8 text-center text-xs text-muted-foreground">
          {filtros.sin_asignar ? 'No quedan unidades sin asignar con estos filtros.' : 'No hay equivalencias con estos filtros.'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">Origen</th>
                <th className="px-3 py-2 font-semibold">Unidad de origen</th>
                <th className="min-w-[280px] px-3 py-2 font-semibold">Centro de costo (Anexo 01)</th>
                <th className="px-3 py-2 font-semibold">Principal</th>
                <th className="px-3 py-2 font-semibold">Confirmada por</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila) => (
                <FilaEquivalencia key={fila.id} fila={fila} opciones={opciones} cargandoCentros={centros.isLoading} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function FilaEquivalencia({
  fila,
  opciones,
  cargandoCentros,
}: {
  fila: Equivalencia
  opciones: { value: number; label: string; descripcion: string }[]
  cargandoCentros: boolean
}) {
  const asignar = useAsignarEquivalencia()
  const centroId = fila.centro_costo?.id ?? null

  return (
    <tr className="border-t align-top">
      <td className="px-3 py-2">
        <Badge variant={fila.origen === 'sgd' ? 'secondary' : 'outline'} className="uppercase">
          {fila.origen}
        </Badge>
      </td>
      <td className="px-3 py-2">
        <div className="font-medium text-foreground">{fila.nombre_origen ?? 'Sin nombre'}</div>
        <div className="font-mono text-mini text-muted-foreground">{fila.codigo_origen}</div>
        {fila.depende_de && <div className="text-mini text-muted-foreground">Depende en el SGD de: {fila.depende_de}</div>}
      </td>
      <td className="px-3 py-2">
        <Combobox
          value={centroId}
          options={opciones}
          loading={cargandoCentros}
          disabled={asignar.isPending}
          placeholder="Sin asignar"
          onChange={(valor) =>
            asignar.mutate({ id: fila.id, centroCostoId: valor, esPrincipal: valor === null ? false : fila.es_principal })
          }
        />
      </td>
      <td className="px-3 py-2 text-center">
        {fila.origen === 'sgd' && (
          <input
            type="checkbox"
            aria-label="Dependencia principal del CC"
            checked={fila.es_principal}
            disabled={centroId === null || asignar.isPending}
            onChange={(e) => asignar.mutate({ id: fila.id, centroCostoId: centroId, esPrincipal: e.target.checked })}
          />
        )}
      </td>
      <td className="px-3 py-2 text-muted-foreground">
        {fila.confirmada_por ?? <span className="italic">Propuesta inicial</span>}
      </td>
    </tr>
  )
}
