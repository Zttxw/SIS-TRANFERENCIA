import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { notificarError } from '@/lib/api-errors'

interface BotonDescargarPdfProps {
  /** Acción de descarga (normalmente `servicio.descargarPdf(dependenciaId)`). */
  descargar: () => Promise<void>
  /** Deshabilita el botón (p. ej. sin dependencia seleccionada). */
  disabled?: boolean
  etiqueta?: string
}

/**
 * Botón reutilizable de descarga de PDF oficial de un anexo (F5). Encapsula el
 * estado de carga, el toast de éxito y la traducción de errores (`notificarError`)
 * para que cada página solo aporte la llamada de descarga del servicio.
 */
export function BotonDescargarPdf({
  descargar,
  disabled,
  etiqueta = 'Descargar PDF',
}: BotonDescargarPdfProps) {
  const [descargando, setDescargando] = useState(false)

  const alDescargar = async () => {
    setDescargando(true)
    try {
      await descargar()
      toast.success('PDF generado. Revise su carpeta de descargas.')
    } catch (error) {
      notificarError(error)
    } finally {
      setDescargando(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-1.5"
      disabled={disabled || descargando}
      onClick={alDescargar}
    >
      {descargando ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {etiqueta}
    </Button>
  )
}
