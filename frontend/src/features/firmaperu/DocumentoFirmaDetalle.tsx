import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Circle, Clock3, FileText, Loader2, Lock } from 'lucide-react'

import { BotonFirmaPeru } from './BotonFirmaPeru'
import { BotonGenerarPdf } from './BotonGenerarPdf'
import { FirmaManuscritaEtte } from './FirmaManuscritaEtte'
import { PrevisualizarAnexo } from './PrevisualizarAnexo'
import { BotonDescargarPdf } from '@/components/anexos/BotonDescargarPdf'
import { firmaperuService } from './firmaperu.service'
import { cn } from '@/lib/utils'
import { ETAPAS, etapaDocumento, type TonoEtapa } from './etapa-documento'
import type { EstadoFirma, FirmaLado, TipoDocumentoFirma } from './firmaperu.types'

interface Props {
  tipoDocumento: TipoDocumentoFirma
  dependenciaId: number
  /** Restricción explícita para contextos que no permiten acciones. */
  bloqueado?: boolean
  notaBloqueo?: string
  soloLectura?: boolean
}

/**
 * Panel de documento + firma del anexo, mostrado al expandir su fila en la tabla
 * «Mi entrega» (plan 07, F3-3). Reúne el estado del PDF/firma (query
 * ['firmaperu', tipo, dep]) y las acciones secundarias — previsualizar, generar
 * y firmar — reusando BotonGenerarPdf + BotonFirmaPeru. El responsable firma
 * por la entidad y, en su sesión, el coordinador ETTE presente firma con su
 * certificado (o a mano, con el escaneo). Muestra la firma de cada lado (D-05)
 * en la cadena vigente.
 */
export function DocumentoFirmaDetalle({ tipoDocumento, dependenciaId, bloqueado = false, notaBloqueo, soloLectura = false }: Props) {
  const { data: estado, isLoading, isError, refetch } = useQuery<EstadoFirma>({
    queryKey: ['firmaperu', tipoDocumento, dependenciaId],
    queryFn: ({ signal }) => firmaperuService.estado(tipoDocumento, dependenciaId, signal),
    retry: false,
    staleTime: 15000,
  })

  const tieneBorrador = Boolean(estado?.borrador_generado || estado?.firmado)
  // Con alguna firma vigente ya no se regenera el PDF y «Visualizar» muestra el firmado real.
  const firmadoVigente = Boolean(estado?.firmado && estado.vigente)
  const verFirmadoId = firmadoVigente ? estado?.documento_id ?? null : null

  return (
    <div className="space-y-2">
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
      {!bloqueado && !isError && (!soloLectura || estado?.pdf_generado_vigente) && (
        <div className="flex flex-wrap items-center gap-1.5">
          <PrevisualizarAnexo
            tipoDocumento={tipoDocumento}
            dependenciaId={dependenciaId}
            etiqueta={verFirmadoId ? 'Ver PDF firmado' : soloLectura ? 'Ver PDF generado' : 'Visualizar PDF'}
            soloGenerado={soloLectura}
            documentoFirmadoId={verFirmadoId}
          />
          {soloLectura && estado?.firmado && estado.vigente && estado.documento_id && <BotonDescargarPdf
            etiqueta="Descargar firmado"
            descargar={() => firmaperuService.descargar(estado.documento_id!)}
          />}
          {!soloLectura && <>
          {/* Tras firmar (vigente) ya no se regenera el PDF. */}
          {!firmadoVigente && <>
            <BotonGenerarPdf
              tipoDocumento={tipoDocumento}
              dependenciaId={dependenciaId}
              etiqueta={tieneBorrador ? 'Regenerar PDF' : 'Generar PDF'}
            />
            <span aria-hidden className="mx-0.5 h-5 w-px bg-border" />
          </>}
          <BotonFirmaPeru tipoDocumento={tipoDocumento} dependenciaId={dependenciaId} lado="entidad" />
          {tipoDocumento !== 'anexo01' && <>
            <BotonFirmaPeru tipoDocumento={tipoDocumento} dependenciaId={dependenciaId} lado="ette" />
            <FirmaManuscritaEtte tipoDocumento={tipoDocumento} dependenciaId={dependenciaId} />
          </>}
          </>}
        </div>
      )}
    </div>
    {!bloqueado && estado?.vigente && tipoDocumento !== 'anexo01' && <LadosFirma estado={estado} />}
    </div>
  )
}

/** Casillas de firma por lado: responsable (entidad) y coordinador ETTE. */
function LadosFirma({ estado }: { estado: EstadoFirma }) {
  const pendienteEtte = estado.firmante_ette
    ? `Pendiente · ${estado.firmante_ette.nombre}${estado.firmante_ette.en_calidad_de === 'titular_suplente' ? ' (titular suplente)' : ''}`
    : 'Sin coordinador asignado'
  return (
    <div className="flex flex-wrap gap-1.5">
      <CasillaLado titulo="Responsable del CC" firma={estado.entidad} />
      <CasillaLado titulo="Coordinador ETTE" firma={estado.ette} pendiente={pendienteEtte} />
    </div>
  )
}

function CasillaLado({ titulo, firma, pendiente = 'Pendiente' }: { titulo: string; firma: FirmaLado | null; pendiente?: string }) {
  const detalle = firma
    ? [
        firma.firmante,
        firma.en_calidad_de === 'titular_suplente' ? 'titular suplente' : null,
        firma.origen === 'manuscrita' ? 'manuscrita' : 'digital',
      ].filter(Boolean).join(' · ')
    : pendiente
  return (
    <span
      title={firma?.motivo_suplencia ? `Motivo de suplencia: ${firma.motivo_suplencia}` : undefined}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-mini',
        firma ? 'border-success-border bg-success-soft text-success-fg' : 'text-muted-foreground',
      )}
    >
      {firma ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
      <span className="font-semibold">{titulo}:</span> {detalle}
    </span>
  )
}

const ICONO_TONO: Record<TonoEtapa, { icono: typeof FileText; clase: string }> = {
  neutro: { icono: FileText, clase: 'text-muted-foreground' },
  aviso: { icono: Clock3, clase: 'text-warning-fg' },
  info: { icono: FileText, clase: 'text-info-fg' },
  exito: { icono: CheckCircle2, clase: 'font-medium text-success-fg' },
}

function EstadoDocumento({ estado, bloqueado, notaBloqueo }: { estado?: EstadoFirma; bloqueado: boolean; notaBloqueo?: string }) {
  if (bloqueado) {
    return (
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <Lock className="h-3.5 w-3.5" /> {notaBloqueo ?? 'No disponible aún'}
      </span>
    )
  }
  const etapa = etapaDocumento(estado)
  const { etiqueta, tono } = ETAPAS[etapa]
  const { icono: Icono, clase } = ICONO_TONO[tono]
  const fecha = etapa === 'completo' && estado?.firmado_en ? ` · ${new Date(estado.firmado_en).toLocaleDateString('es-PE')}` : ''
  const version = etapa === 'completo' && estado?.version ? ` v${estado.version}` : ''
  return (
    <span className={cn('inline-flex items-center gap-1.5', clase)}>
      <Icono className="h-3.5 w-3.5" /> {etiqueta}{version}{fecha}
    </span>
  )
}
