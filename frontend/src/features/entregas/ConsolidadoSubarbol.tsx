import { AlertTriangle, Network } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { fueRemitida, type CentroConsolidado } from '@/types/transferencia'
import { useConsolidado } from './use-entregas'

function fecha(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('es-PE') : '—'
}

function volumen(cc: CentroConsolidado): string {
  const { anexos } = cc
  return [
    anexos.anexo02 ? 'A02 ✓' : 'A02 —',
    `A03 ${anexos.anexo03}`,
    `A04 ${anexos.anexo04}`,
    `A05 ${anexos.anexo05}`,
    `A06 ${anexos.anexo06}`,
  ].join(' · ')
}

/**
 * Consolidado del CC padre (D-08, RF-43): lo que envían los CC de su subárbol,
 * con quién la cerró para firma y quién la remitió. Es solo consulta: el padre
 * no observa, no devuelve ni cambia los datos de sus hijos.
 */
export function ConsolidadoSubarbol({ dependenciaId }: { dependenciaId: number }) {
  const { data, isLoading } = useConsolidado(dependenciaId)

  if (isLoading || !data || data.centros.length <= 1) return null

  const { resumen } = data

  return (
    <Card className="border shadow-xs">
      <CardHeader className="bg-muted/15 pb-4">
        <div className="flex items-start gap-2">
          <Network className="mt-0.5 h-4 w-4 text-primary" />
          <div>
            <CardTitle className="text-base">Consolidado de los centros de costo dependientes</CardTitle>
            <CardDescription className="mt-0.5 text-xs">
              {resumen.remitidos} de {resumen.total} entregas remitidas
              {resumen.enviados_tarde > 0 && ` · ${resumen.enviados_tarde} enviada(s) después de su padre`}. Cada
              entrega conserva su autor: la responsabilidad no se transfiere al consolidar.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b bg-muted/30 text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Centro de costo</th>
                <th className="px-3 py-2 font-medium">Estado</th>
                <th className="px-3 py-2 font-medium">Cerró / remitió</th>
                <th className="px-3 py-2 font-medium">Observaciones ETTE</th>
                <th className="px-3 py-2 font-medium">Anexos</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.centros.map((cc) => (
                <tr key={cc.id} className={cn(cc.es_propio && 'bg-primary/5')}>
                  <td className="px-3 py-2">
                    <span className="font-mono font-semibold">{cc.codigo}</span> {cc.nombre}
                    {cc.padre && !cc.es_propio && (
                      <span className="block text-mini text-muted-foreground">Depende de {cc.padre.codigo}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-mini font-semibold',
                        fueRemitida(cc.estado) ? 'bg-success-soft text-success-fg' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {cc.estado_etiqueta}
                    </span>
                    {cc.enviado_tarde && (
                      <span className="ml-1 inline-flex items-center gap-0.5 text-mini text-warning-fg">
                        <AlertTriangle className="h-3 w-3" /> tarde
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {cc.presentada_por ?? '—'}
                    {cc.remitida_en && (
                      <span className="block text-mini text-muted-foreground">
                        Remitió {cc.remitida_por ?? '—'} el {fecha(cc.remitida_en)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">{cc.observaciones > 0 ? `${cc.observaciones} observación(es)` : '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-mini text-muted-foreground">{volumen(cc)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
