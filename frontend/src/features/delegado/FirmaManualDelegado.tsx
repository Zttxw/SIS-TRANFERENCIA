import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { notificarError } from '@/lib/api-errors'
import type { TipoDocumentoFirma } from '@/features/firmaperu/firmaperu.types'

import { delegadoService } from './delegado.service'

interface Props {
  tipoDocumento: TipoDocumentoFirma
  dependenciaId: number
}

/**
 * Firma manual del delegado ETTE (GAP 1 del portal del delegado): el delegado
 * descarga el PDF del anexo, lo firma/sella a mano y sube el PDF escaneado como
 * constancia de su firma OPCIONAL. No bloquea la entrega (C-08); queda como
 * recepción pendiente de validación institucional.
 */
export function FirmaManualDelegado({ tipoDocumento, dependenciaId }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [subiendo, setSubiendo] = useState(false)
  const cliente = useQueryClient()

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
      await delegadoService.subirFirmaManual(tipoDocumento, dependenciaId, archivo)
      await cliente.invalidateQueries({ queryKey: ['firmaperu', tipoDocumento, dependenciaId] })
      toast.success('Firma manuscrita recibida como constancia. Verificación institucional pendiente.')
    } catch (error) {
      notificarError(error)
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <>
      <input ref={input} type="file" accept="application/pdf" className="hidden" onChange={alElegir} />
      <Tooltip content="Subir el PDF del anexo firmado o sellado a mano">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={subiendo}
          onClick={() => input.current?.click()}
        >
          {subiendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Subir firma a mano
        </Button>
      </Tooltip>
    </>
  )
}
