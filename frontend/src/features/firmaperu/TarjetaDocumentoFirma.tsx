import { ArrowRight, CheckCircle2, Circle, Info, Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { BotonFirmaPeru } from './BotonFirmaPeru'
import { BotonGenerarPdf } from './BotonGenerarPdf'
import { DocumentoFirmaSvg } from './DocumentoFirmaSvg'
import { ETAPAS, etapaDocumento, siguientePaso, type TonoEtapa } from './etapa-documento'
import { FirmaManuscritaEtte } from './FirmaManuscritaEtte'
import { PrevisualizarAnexo } from './PrevisualizarAnexo'
import type { EstadoFirma, FirmaLado, TipoDocumentoFirma } from './firmaperu.types'

interface TarjetaDocumentoFirmaProps {
  tipo: TipoDocumentoFirma
  nombre: string
  dependenciaId: number
  estado: EstadoFirma | undefined
  cargando: boolean
  /** Solo consulta: sin generar ni firmar. */
  soloLectura: boolean
}

const TONO_PILDORA: Record<TonoEtapa, string> = {
  neutro: 'border-border bg-muted text-muted-foreground',
  aviso: 'border-warning-border bg-warning-soft text-warning-fg',
  info: 'border-info-border bg-info-soft text-info-fg',
  exito: 'border-success-border bg-success-soft text-success-fg',
}

const TONO_BORDE: Record<TonoEtapa, string> = {
  neutro: 'border-border',
  aviso: 'border-warning-border',
  info: 'border-info-border',
  exito: 'border-success-border',
}

/**
 * Un documento en «PDF y firma»: la hoja ilustrada con sus dos sellos, los
 * tres pasos (PDF generado, firma del responsable y firma del coordinador ETTE)
 * y las acciones, con el siguiente paso explicado en una línea. El Anexo 01 es
 * institucional: aquí solo se consulta.
 */
export function TarjetaDocumentoFirma({ tipo, nombre, dependenciaId, estado, cargando, soloLectura }: TarjetaDocumentoFirmaProps) {
  const institucional = tipo === 'anexo01'
  const etapa = ETAPAS[etapaDocumento(estado)]
  const tono: TonoEtapa = institucional ? 'neutro' : etapa.tono
  const generado = estado?.pdf_generado_vigente === true
  // Con alguna firma vigente ya no se regenera el PDF y «Ver» muestra el firmado.
  const firmadoVigente = Boolean(estado?.firmado && estado.vigente)
  const verFirmadoId = firmadoVigente ? estado?.documento_id ?? null : null
  const paso = institucional || soloLectura ? null : siguientePaso(estado)
  const debeGenerar = !generado && !firmadoVigente

  return (
    <article className={cn('flex flex-col overflow-hidden rounded-xl border bg-card shadow-xs transition-shadow hover:shadow-md', TONO_BORDE[tono])}>
      <div className="flex gap-4 p-4">
        <div className="h-[104px] w-20 shrink-0 drop-shadow-sm">
          <DocumentoFirmaSvg
            folio={tipo.slice(-2)}
            generado={generado || firmadoVigente}
            desactualizado={etapaDocumento(estado) === 'desactualizado'}
            entidad={origen(estado?.entidad)}
            ette={origen(estado?.ette)}
          />
        </div>

        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-mono text-mini font-bold uppercase text-primary">Anexo {tipo.slice(-2)}</p>
              <h2 className="text-sm font-semibold leading-tight text-foreground">{nombre}</h2>
            </div>
            {cargando ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Consultando estado" />
            ) : (
              <span className={cn('inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-microdato font-semibold', TONO_PILDORA[tono])}>
                {institucional ? 'Solo consulta' : etapa.etiqueta}
              </span>
            )}
          </div>

          {institucional ? (
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Relación de centros de costo. Se firma una sola vez, al cierre del proceso, por el ETTS y un titular ETTE.
            </p>
          ) : (
            <ul className="space-y-1 text-xs">
              <Paso hecho={generado || firmadoVigente} titulo="PDF generado"
                detalle={estado?.borrador_generado_en ? new Date(estado.borrador_generado_en).toLocaleString('es-PE') : undefined} />
              <Paso hecho={Boolean(estado?.entidad)} titulo="Responsable del CC" detalle={detalleFirma(estado?.entidad)} />
              <Paso hecho={Boolean(estado?.ette)}
                titulo={estado?.firmante_ette?.en_calidad_de === 'titular_suplente' ? 'Titular ETTE (suplente)' : 'Coordinador ETTE'}
                detalle={detalleFirma(estado?.ette) ?? estado?.firmante_ette?.nombre ?? 'Sin coordinador asignado'} />
            </ul>
          )}

          {paso && (
            <p className="flex items-start gap-1.5 rounded-lg bg-primary/5 px-2.5 py-1.5 text-xs font-medium text-primary">
              <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {paso}
            </p>
          )}
        </div>
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t bg-muted/20 px-4 py-3">
        <PrevisualizarAnexo
          tipoDocumento={tipo}
          dependenciaId={dependenciaId}
          etiqueta={verFirmadoId ? 'Ver PDF firmado' : soloLectura ? 'Ver PDF generado' : 'Ver PDF'}
          soloGenerado={soloLectura && !institucional}
          documentoFirmadoId={verFirmadoId}
        />
        {!soloLectura && !institucional && (
          <>
            {!firmadoVigente && (
              <BotonGenerarPdf
                tipoDocumento={tipo}
                dependenciaId={dependenciaId}
                destacado={debeGenerar}
                etiqueta={estado?.borrador_generado ? 'Regenerar PDF' : 'Generar PDF'}
              />
            )}
            <BotonFirmaPeru tipoDocumento={tipo} dependenciaId={dependenciaId} lado="entidad" />
            <BotonFirmaPeru tipoDocumento={tipo} dependenciaId={dependenciaId} lado="ette" />
            <FirmaManuscritaEtte tipoDocumento={tipo} dependenciaId={dependenciaId} />
          </>
        )}
      </div>
    </article>
  )
}

function Paso({ hecho, titulo, detalle }: { hecho: boolean; titulo: string; detalle?: string }) {
  return (
    <li className="flex items-start gap-1.5">
      {hecho
        ? <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0 text-success-fg" />
        : <Circle className="mt-px h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />}
      <span className={hecho ? 'text-foreground' : 'text-muted-foreground'}>
        <span className="font-medium">{titulo}</span>
        {detalle && <span className="text-muted-foreground"> · {detalle}</span>}
      </span>
    </li>
  )
}

function origen(firma: FirmaLado | null | undefined): 'digital' | 'manuscrita' | null {
  return firma ? firma.origen : null
}

function detalleFirma(firma: FirmaLado | null | undefined): string | undefined {
  if (!firma) return undefined
  return [firma.firmante, firma.origen === 'manuscrita' ? 'a mano' : 'digital'].filter(Boolean).join(' · ')
}
