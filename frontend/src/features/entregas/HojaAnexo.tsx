import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Download, FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { notificarError } from '@/lib/api-errors'
import { PrevisualizarAnexo } from '@/features/firmaperu/PrevisualizarAnexo'
import { firmaperuService } from '@/features/firmaperu/firmaperu.service'
import type { EstadoFirma, TipoDocumentoFirma } from '@/features/firmaperu/firmaperu.types'

const NOMBRES: Record<TipoDocumentoFirma, string> = {
  anexo01: 'Centros de costo',
  anexo02: 'Informe de gestión',
  anexo03: 'Acervo documental',
  anexo04: 'Bienes patrimoniales',
  anexo05: 'Personal',
  anexo06: 'Bienes no patrimoniales',
  anexo07: 'Acta de transferencia',
}

interface Props {
  tipoDocumento: TipoDocumentoFirma
  dependenciaId: number
  nivel: number
}

/**
 * Hoja de anexo en la bandeja del revisor: una fila por documento con el icono
 * de archivo, su estado y las acciones de solo lectura «ver» (previsualizador) y
 * «descargar», ambas como iconos. Carga su propio estado de firma de forma
 * perezosa (solo cuando la dependencia está desplegada en el árbol).
 */
export function HojaAnexo({ tipoDocumento, dependenciaId, nivel }: Props) {
  const { data: estado, isLoading } = useQuery<EstadoFirma>({
    queryKey: ['firmaperu', tipoDocumento, dependenciaId],
    queryFn: ({ signal }) => firmaperuService.estado(tipoDocumento, dependenciaId, signal),
    retry: false,
    staleTime: 15000,
  })

  const firmadoVigente = Boolean(estado?.firmado && estado.vigente !== false)
  const verFirmadoId = firmadoVigente ? estado?.documento_id ?? null : null
  const hayPdf = Boolean(estado?.pdf_generado_vigente || firmadoVigente)

  const [descargando, setDescargando] = useState(false)
  const descargar = async () => {
    if (!estado) return
    setDescargando(true)
    try {
      await firmaperuService.descargarDisponible(tipoDocumento, dependenciaId, estado)
      toast.success('PDF descargado. Revise su carpeta de descargas.')
    } catch (error) {
      notificarError(error, { porDefecto: 'No se pudo descargar el PDF.' })
    } finally {
      setDescargando(false)
    }
  }

  return (
    <div
      className="flex items-center justify-between gap-2 rounded-md py-1.5 pr-2 text-xs hover:bg-muted/40"
      style={{ paddingLeft: `${nivel * 20 + 8}px` }}
    >
      <div className="flex min-w-0 items-center gap-2">
        <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="font-mono text-nota font-semibold text-muted-foreground">{tipoDocumento.slice(-2)}</span>
        <span className="truncate text-foreground">{NOMBRES[tipoDocumento]}</span>
        {isLoading ? (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        ) : firmadoVigente ? (
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success-fg" aria-label="Firmado" />
        ) : null}
      </div>

      {hayPdf && (
        <div className="flex shrink-0 items-center gap-0.5">
          <PrevisualizarAnexo
            tipoDocumento={tipoDocumento}
            dependenciaId={dependenciaId}
            soloGenerado={!verFirmadoId}
            documentoFirmadoId={verFirmadoId}
          />
          <Tooltip content={verFirmadoId ? 'Descargar PDF firmado' : 'Descargar PDF generado'}>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label="Descargar PDF"
              disabled={descargando}
              onClick={() => void descargar()}
            >
              {descargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            </Button>
          </Tooltip>
        </div>
      )}
    </div>
  )
}
