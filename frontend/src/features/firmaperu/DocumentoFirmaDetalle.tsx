import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Clock3, FileText, Loader2, Lock } from 'lucide-react'

import { BotonFirmaPeru } from './BotonFirmaPeru'
import { BotonGenerarPdf } from './BotonGenerarPdf'
import { PrevisualizarAnexo } from './PrevisualizarAnexo'
import { firmaperuService } from './firmaperu.service'
import type { EstadoFirma, TipoDocumentoFirma } from './firmaperu.types'

interface Props {
  tipoDocumento: TipoDocumentoFirma
  dependenciaId: number
  /** El acta 07 solo se firma con la entrega consolidada. */
  bloqueado?: boolean
  notaBloqueo?: string
  soloLectura?: boolean
}

/**
 * Panel de documento + firma del anexo, mostrado al expandir su fila en la tabla
 * «Mi entrega» (plan 07, F3-3). Reúne el estado del PDF/firma (query
 * ['firmaperu', tipo, dep]) y las acciones secundarias — previsualizar, generar
 * y firmar — reusando BotonGenerarPdf + BotonFirmaPeru. El estado de firma es
 * independiente del estado de llenado del anexo. Firmar no congela el anexo.
 */
export function DocumentoFirmaDetalle({ tipoDocumento, dependenciaId, bloqueado = false, notaBloqueo, soloLectura = false }: Props) {
  const { data: estado, isLoading, isError, refetch } = useQuery<EstadoFirma>({
    queryKey: ['firmaperu', tipoDocumento, dependenciaId],
    queryFn: ({ signal }) => firmaperuService.estado(tipoDocumento, dependenciaId, signal),
    retry: false,
    staleTime: 15000,
  })

  const tieneBorrador = Boolean(estado?.borrador_generado || estado?.firmado)

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Estado del documento (texto discreto) */}
      <div className="flex items-center gap-2 text-xs">
        <span className="font-semibold uppercase tracking-wide text-mini text-muted-foreground">Documento</span>
        {isLoading ? (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Consultando…
          </span>
        ) : isError ? (
          <button type="button" className="text-danger-fg underline" onClick={() => void refetch()}>No se pudo consultar. Reintentar</button>
        ) : (
          <EstadoDocumento estado={estado} bloqueado={bloqueado} notaBloqueo={notaBloqueo} />
        )}
      </div>

      {/* Acciones secundarias */}
      {!bloqueado && !soloLectura && !isError && (
        <div className="flex items-center gap-1.5">
          <PrevisualizarAnexo tipoDocumento={tipoDocumento} dependenciaId={dependenciaId} />
          <BotonGenerarPdf
            tipoDocumento={tipoDocumento}
            dependenciaId={dependenciaId}
            compacto
            etiqueta={tieneBorrador ? 'Regenerar PDF' : 'Generar PDF'}
          />
          <span aria-hidden className="mx-0.5 h-5 w-px bg-border" />
          <BotonFirmaPeru tipoDocumento={tipoDocumento} dependenciaId={dependenciaId} compacto />
        </div>
      )}
    </div>
  )
}

function EstadoDocumento({ estado, bloqueado, notaBloqueo }: { estado?: EstadoFirma; bloqueado: boolean; notaBloqueo?: string }) {
  if (bloqueado) {
    return (
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <Lock className="h-3.5 w-3.5" /> {notaBloqueo ?? 'No disponible aún'}
      </span>
    )
  }
  if (estado?.firmado && estado.vigente !== false) {
    const fecha = estado.firmado_en ? ` · ${new Date(estado.firmado_en).toLocaleDateString('es-PE')}` : ''
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-success-fg">
        <CheckCircle2 className="h-3.5 w-3.5" /> Firmado{estado.version ? ` v${estado.version}` : ''}{fecha}
      </span>
    )
  }
  if (estado?.firmado && estado.vigente === false) {
    return (
      <span className="inline-flex items-center gap-1.5 text-warning-fg">
        <Clock3 className="h-3.5 w-3.5" /> Firma anterior · los datos cambiaron, vuelva a firmar
      </span>
    )
  }
  if (estado?.pendiente_validacion) {
    return (
      <span className="inline-flex items-center gap-1.5 text-warning-fg">
        <Clock3 className="h-3.5 w-3.5" /> PDF recibido · verificación pendiente
      </span>
    )
  }
  if (estado?.borrador_generado) {
    return (
      <span className="inline-flex items-center gap-1.5 text-info-fg">
        <FileText className="h-3.5 w-3.5" /> PDF generado · pendiente de firma
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <FileText className="h-3.5 w-3.5" /> PDF no generado
    </span>
  )
}
