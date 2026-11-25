import { Lock } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { FilaPendienteDocumental } from '@/types/gestion'

interface PendientesDocumentalesTablaProps {
  filas: FilaPendienteDocumental[]
  /** Fecha en que se congeló la copia al presentar; null mientras se lee en vivo. */
  congeladosEn: string | null
}

/**
 * Documentos pendientes del CC que entran a la sección IV del Anexo 02 (D-09):
 * los ingeridos del SGD y los registrados a mano. Son de solo lectura aquí.
 * Antes de presentar se leen en vivo; al cerrar la entrega para firma quedan
 * congelados.
 */
export function PendientesDocumentalesTabla({ filas, congeladosEn }: PendientesDocumentalesTablaProps) {
  return (
    <Card className="overflow-hidden border-primary/15">
      <CardHeader className="border-b bg-muted/25 pb-4">
        <CardTitle className="text-base">Documentos pendientes del centro de costo ({filas.length})</CardTitle>
        <CardDescription className="text-xs">
          {congeladosEn
            ? `Copia fija tomada al presentar la entrega (${new Date(congeladosEn).toLocaleString('es-PE')}); ya no cambia aunque cambie el SGD.`
            : 'Se agregan a la sección IV del PDF a continuación de los asuntos anteriores. Reflejan la última ingesta del SGD y quedarán fijos al presentar la entrega al coordinador.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0">
        {filas.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            El centro de costo no tiene documentos pendientes registrados.
          </p>
        ) : (
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10 border-b border-border bg-muted text-nota font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5">Asunto</th>
                  <th className="px-3 py-2.5">Estado y acción</th>
                  <th className="px-3 py-2.5">Documento</th>
                  <th className="px-3 py-2.5">Fecha</th>
                  <th className="px-3 py-2.5">Unidad / responsable</th>
                  <th className="px-3 py-2.5">Origen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filas.map((fila, indice) => (
                  <tr key={indice} className="align-top">
                    <td className="px-3 py-2">{fila.asunto}</td>
                    <td className="px-3 py-2">{fila.estado_accion}</td>
                    <td className="px-3 py-2">{fila.documento_referencia}</td>
                    <td className="whitespace-nowrap px-3 py-2">{fila.plazo}</td>
                    <td className="px-3 py-2">{fila.responsable}</td>
                    <td className="px-3 py-2">
                      <Badge variant={fila.origen === 'sgd' ? 'secondary' : 'outline'}>
                        {fila.origen === 'sgd' ? 'SGD' : 'Manual'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {congeladosEn && (
          <p className="flex items-center gap-1.5 border-t px-3 py-2 text-nota text-muted-foreground">
            <Lock className="h-3 w-3" /> Congelados al presentar.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
