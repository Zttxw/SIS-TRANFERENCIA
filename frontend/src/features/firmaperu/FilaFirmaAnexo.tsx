import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Clock3, FileText, Loader2, Lock, PenLine } from 'lucide-react'

import { BotonFirmaPeru } from './BotonFirmaPeru'
import { BotonGenerarPdf } from './BotonGenerarPdf'
import { PrevisualizarAnexo } from './PrevisualizarAnexo'
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

type Variante = 'firmado' | 'novigente' | 'pendiente' | 'borrador' | 'sin_generar'

interface InfoEstado {
  variante: Variante
  texto: string
  icono: typeof CheckCircle2
  clases: string
}

function infoEstado(estado?: EstadoFirma): InfoEstado {
  if (estado?.firmado && estado.vigente !== false) {
    const fecha = estado.firmado_en ? ` · ${new Date(estado.firmado_en).toLocaleDateString('es-PE')}` : ''
    return {
      variante: 'firmado',
      texto: `Firmado${estado.version ? ` v${estado.version}` : ''}${fecha}`,
      icono: CheckCircle2,
      clases: 'border-success-border bg-success-soft text-success-fg',
    }
  }
  if (estado?.firmado && estado.vigente === false) {
    return {
      variante: 'novigente',
      texto: 'Firma anterior · vuelva a firmar',
      icono: Clock3,
      clases: 'border-warning-border bg-warning-soft text-warning-fg',
    }
  }
  if (estado?.pendiente_validacion) {
    return {
      variante: 'pendiente',
      texto: 'PDF recibido · verificación pendiente',
      icono: Clock3,
      clases: 'border-warning-border bg-warning-soft text-warning-fg',
    }
  }
  if (estado?.borrador_generado) {
    return {
      variante: 'borrador',
      texto: 'PDF generado · sin firmar',
      icono: FileText,
      clases: 'border-info-border bg-info-soft text-info-fg',
    }
  }
  return {
    variante: 'sin_generar',
    texto: 'PDF no generado',
    icono: FileText,
    clases: 'border-border bg-muted text-muted-foreground',
  }
}

/**
 * Control de firma compacto para una fila de anexo del Dashboard «Mi entrega»
 * (plan 07, F3-3). Una sola línea: a la izquierda un chip de estado de firma
 * (color según borrador/firmado/vigente); a la derecha un grupo de acciones
 * solo-icono con tooltip (previsualizar · generar PDF · firmar/menú). Reusa
 * BotonGenerarPdf + BotonFirmaPeru en modo `compacto`. No altera la edición del
 * anexo: firmar no congela nada (plan 07, decisión 4).
 */
export function FilaFirmaAnexo({ tipoDocumento, dependenciaId, bloqueado = false, notaBloqueo }: Props) {
  const { data: estado, isLoading } = useQuery<EstadoFirma>({
    queryKey: ['firmaperu', tipoDocumento, dependenciaId],
    queryFn: ({ signal }) => firmaperuService.estado(tipoDocumento, dependenciaId, signal),
    retry: false,
    staleTime: 15000,
  })

  const info = infoEstado(estado)
  const Icono = info.icono
  const tieneBorrador = Boolean(estado?.borrador_generado || estado?.firmado)

  return (
    <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 pl-3 pr-1.5 py-1.5">
      {/* Chip de estado de firma */}
      <span className="inline-flex items-center gap-1.5 text-nota font-medium text-muted-foreground">
        <PenLine className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
        {isLoading ? (
          <span className="inline-flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Consultando…
          </span>
        ) : (
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${info.clases}`}>
            <Icono className="h-3 w-3" />
            {info.texto}
          </span>
        )}
      </span>

      {/* Acciones: solo-icono con tooltip, agrupadas y separadas por un divisor.
          Cuando el documento está bloqueado (acta sin consolidar), solo se
          muestra la nota — ni generar ni firmar están disponibles aún. */}
      {bloqueado ? (
        <span className="inline-flex items-center gap-1 rounded-md border border-dashed px-2 py-0.5 text-nota text-muted-foreground">
          <Lock className="h-3 w-3" /> {notaBloqueo ?? 'No disponible aún'}
        </span>
      ) : (
        <span className="flex items-center gap-0.5">
          <PrevisualizarAnexo tipoDocumento={tipoDocumento} dependenciaId={dependenciaId} />
          <BotonGenerarPdf
            tipoDocumento={tipoDocumento}
            dependenciaId={dependenciaId}
            compacto
            etiqueta={tieneBorrador ? 'Regenerar PDF' : 'Generar PDF'}
          />
          <span aria-hidden className="mx-0.5 h-5 w-px bg-border" />
          <BotonFirmaPeru tipoDocumento={tipoDocumento} dependenciaId={dependenciaId} compacto />
        </span>
      )}
    </div>
  )
}
