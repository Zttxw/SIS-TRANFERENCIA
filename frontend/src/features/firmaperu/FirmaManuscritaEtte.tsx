import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { notificarError } from '@/lib/api-errors'
import { firmaperuService } from './firmaperu.service'
import { MotivoSuplenciaDialog } from './MotivoSuplenciaDialog'
import type { TipoDocumentoFirma } from './firmaperu.types'

interface Props {
  tipoDocumento: TipoDocumentoFirma
  dependenciaId: number
}

/**
 * Firma manuscrita del lado ETTE (D-06): el coordinador (o el titular
 * suplente) descarga el PDF generado, lo firma a mano y sube el escaneo; luego
 * el responsable firma digitalmente encima. Solo se ofrece mientras no haya una
 * firma digital, porque la manuscrita la invalidaría.
 */
export function FirmaManuscritaEtte({ tipoDocumento, dependenciaId }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [pedirMotivo, setPedirMotivo] = useState(false)
  const motivo = useRef<string | undefined>(undefined)
  const cliente = useQueryClient()
  const { data: estado } = useQuery({
    queryKey: ['firmaperu', tipoDocumento, dependenciaId],
    queryFn: ({ signal }) => firmaperuService.estado(tipoDocumento, dependenciaId, signal),
    retry: false,
    staleTime: 15000,
  })

  const disponible = estado?.mi_lado?.lado === 'ette' && estado.firma_habilitada && estado.pdf_generado_vigente
    && !estado.hay_firma_digital && !estado.ette
  if (!disponible) return null

  const elegirArchivo = () => {
    if (estado.mi_lado?.en_calidad_de === 'titular_suplente') setPedirMotivo(true)
    else input.current?.click()
  }

  const alElegir = async (evento: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0]
    evento.target.value = '' // Permite volver a elegir el mismo archivo.
    if (!archivo) return
    if (archivo.type !== 'application/pdf') {
      toast.error('Suba el PDF del anexo firmado a mano (formato PDF).')
      return
    }
    setSubiendo(true)
    try {
      await firmaperuService.subirFirmaManuscrita(tipoDocumento, dependenciaId, archivo, motivo.current)
      await cliente.invalidateQueries({ queryKey: ['firmaperu', tipoDocumento, dependenciaId] })
      await cliente.invalidateQueries({ queryKey: ['requisitos-remision', dependenciaId] })
      toast.success('Firma manuscrita registrada. Falta la firma digital del responsable sobre el escaneo.')
    } catch (error) {
      notificarError(error)
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <>
      <input ref={input} type="file" accept="application/pdf" className="hidden" onChange={alElegir} />
      <Tooltip content="Subir el PDF generado, firmado a mano y escaneado">
        <Button type="button" size="sm" variant="outline" className="gap-1.5" disabled={subiendo} onClick={elegirArchivo}>
          {subiendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Subir firma a mano
        </Button>
      </Tooltip>
      <MotivoSuplenciaDialog
        open={pedirMotivo}
        onClose={() => setPedirMotivo(false)}
        onConfirmar={(texto) => {
          motivo.current = texto
          setPedirMotivo(false)
          input.current?.click()
        }}
      />
    </>
  )
}
