import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, FileText, Loader2, PenLine } from 'lucide-react'

import { BotonFirmaPeru } from './BotonFirmaPeru'
import { BotonGenerarPdf } from './BotonGenerarPdf'
import { firmaperuService } from './firmaperu.service'
import type { EstadoFirma, TipoDocumentoFirma } from './firmaperu.types'

interface Props {
  tipoDocumento: TipoDocumentoFirma
  dependenciaId: number
  /** El acta 07 solo se firma con la entrega consolidada; hasta entonces se bloquea. */
  bloqueado?: boolean
  /** Nota que explica el bloqueo (p. ej. «Requiere entrega consolidada»). */
  notaBloqueo?: string
}

/**
 * Control de firma compacto para una fila de anexo del Dashboard «Mi entrega»
 * (plan 07, F3-3). Consulta el estado de firma (query ['firmaperu', tipo, dep]),
 * muestra un indicador borrador/firmado/vigente y las acciones Generar PDF /
 * Firmar (reusa BotonGenerarPdf + BotonFirmaPeru). No altera la edición del
 * anexo: firmar no congela nada (plan 07, decisión 4).
 */
export function FilaFirmaAnexo({ tipoDocumento, dependenciaId, bloqueado = false, notaBloqueo }: Props) {
  const { data: estado, isLoading } = useQuery<EstadoFirma>({
    queryKey: ['firmaperu', tipoDocumento, dependenciaId],
    queryFn: ({ signal }) => firmaperuService.estado(tipoDocumento, dependenciaId, signal),
    retry: false,
    staleTime: 15000,
  })

  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed border-border bg-muted/30 px-2.5 py-1.5">
      <span className="inline-flex items-center gap-1.5 text-nota">
        <PenLine className="h-3 w-3 text-muted-foreground" />
        <span className="font-semibold text-muted-foreground">Firma:</span>
        {isLoading ? (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> consultando…
          </span>
        ) : (
          <EstadoFirmaInline estado={estado} />
        )}
      </span>

      <span className="flex items-center gap-1.5">
        {estado && !estado.borrador_generado && !estado.firmado && (
          <BotonGenerarPdf tipoDocumento={tipoDocumento} dependenciaId={dependenciaId} />
        )}
        {bloqueado ? (
          <span className="rounded border border-dashed px-2 py-0.5 text-nota text-muted-foreground">
            {notaBloqueo ?? 'No disponible aún'}
          </span>
        ) : (
          <BotonFirmaPeru tipoDocumento={tipoDocumento} dependenciaId={dependenciaId} />
        )}
      </span>
    </div>
  )
}

function EstadoFirmaInline({ estado }: { estado?: EstadoFirma }) {
  if (!estado) return <span className="text-muted-foreground">sin información</span>

  if (estado.firmado && estado.vigente !== false) {
    return (
      <span className="inline-flex items-center gap-1 font-medium text-success-fg">
        <CheckCircle2 className="h-3 w-3" />
        Firmado{estado.version ? ` v${estado.version}` : ''}
        {estado.firmado_en && ` · ${new Date(estado.firmado_en).toLocaleDateString('es-PE')}`}
      </span>
    )
  }

  if (estado.firmado && estado.vigente === false) {
    return <span className="text-warning-fg">firma anterior no vigente · vuelva a firmar</span>
  }

  if (estado.pendiente_validacion) {
    return <span className="text-warning-fg">PDF recibido · verificación pendiente</span>
  }

  if (estado.borrador_generado) {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <FileText className="h-3 w-3" /> PDF generado · sin firmar
      </span>
    )
  }

  return <span className="text-muted-foreground">PDF no generado</span>
}
