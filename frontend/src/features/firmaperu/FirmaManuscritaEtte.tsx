import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { notificarError } from '@/lib/api-errors'
import { firmaperuService } from './firmaperu.service'
import type { TipoDocumentoFirma } from './firmaperu.types'

interface Props {
  tipoDocumento: TipoDocumentoFirma
  dependenciaId: number
}

/**
 * Firma manuscrita del lado ETTE (D-06): el coordinador (o el titular
 * suplente) firma a mano el PDF generado y el responsable sube el escaneo desde
 * su sesión; luego firma digitalmente encima. Solo se ofrece mientras no haya
 * una firma digital, porque la manuscrita la invalidaría.
 */
export function FirmaManuscritaEtte({ tipoDocumento, dependenciaId }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [subiendo, setSubiendo] = useState(false)
  const cliente = useQueryClient()
  const { data: estado } = useQuery({
    queryKey: ['firmaperu', tipoDocumento, dependenciaId],
    queryFn: ({ signal }) => firmaperuService.estado(tipoDocumento, dependenciaId, signal),
    retry: false,
    staleTime: 15000,
  })

  const disponible = estado?.opera_firmas && estado.firmante_ette && estado.firma_habilitada
    && estado.pdf_generado_vigente && !estado.hay_firma_digital && !estado.ette
  if (!disponible) return null

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
      await firmaperuService.subirFirmaManuscrita(tipoDocumento, dependenciaId, archivo)
      await cliente.invalidateQueries({ queryKey: ['firmaperu', tipoDocumento, dependenciaId] })
      await cliente.invalidateQueries({ queryKey: ['requisitos-remision', dependenciaId] })
      toast.success('Firma manuscrita del coordinador registrada. Falta su firma digital sobre el escaneo.')
    } catch (error) {
      notificarError(error)
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <>
      <input ref={input} type="file" accept="application/pdf" className="hidden" onChange={alElegir} />
      <Tooltip content={`PDF generado, firmado a mano por ${estado.firmante_ette?.nombre} y escaneado`}>
        <Button type="button" size="sm" variant="outline" className="gap-1.5" disabled={subiendo} onClick={() => input.current?.click()}>
          {subiendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Subir escaneo firmado por el coordinador
        </Button>
      </Tooltip>
    </>
  )
}
