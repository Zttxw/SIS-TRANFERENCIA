import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { usePermiso } from '@/auth/hooks'
import { Button } from '@/components/ui/button'
import { notificarError } from '@/lib/api-errors'
import { firmaperuService } from './firmaperu.service'
import type { TipoDocumentoFirma } from './firmaperu.types'

interface Props {
  tipoDocumento: TipoDocumentoFirma
  dependenciaId: number | null
  /** `sm` para el header del anexo; `outline` discreto por defecto. */
  size?: 'sm' | 'default'
  /** Resalta el botón cuando generar es el siguiente paso del documento. */
  destacado?: boolean
  /** Texto del botón: «Generar PDF» (primera vez) o «Regenerar PDF». */
  etiqueta?: string
}

/**
 * Genera/sobrescribe el PDF borrador oficial del documento (F3-1). No firma ni
 * versiona: es el insumo que luego se firma en «Mi entrega». Invalida el estado
 * de firma (`['firmaperu', tipo, dep]`) para refrescar el indicador de borrador.
 */
export function BotonGenerarPdf({ tipoDocumento, dependenciaId, size = 'sm', destacado = false, etiqueta = 'Generar PDF' }: Props) {
  const puedeRegistrar = usePermiso('anexos.registrar')
  const puedeActa = usePermiso('actas.generar')
  const puedeGenerar = tipoDocumento === 'anexo07' ? puedeActa : (puedeRegistrar || puedeActa)
  const cliente = useQueryClient()
  const [generando, setGenerando] = useState(false)

  if (!dependenciaId || !puedeGenerar) return null

  const generar = async () => {
    setGenerando(true)
    try {
      await firmaperuService.generarBorrador(tipoDocumento, dependenciaId)
      await cliente.invalidateQueries({ queryKey: ['firmaperu', tipoDocumento, dependenciaId] })
      await cliente.invalidateQueries({ queryKey: ['requisitos-remision', dependenciaId] })
      toast.success('PDF definitivo guardado. Revíselo y fírmelo en «PDF y firma».')
    } catch (error) {
      notificarError(error, { porDefecto: 'No se pudo generar el PDF borrador.' })
    } finally {
      setGenerando(false)
    }
  }

  return (
    <Button size={size} variant={destacado ? 'default' : 'outline'} className="gap-2" disabled={generando} onClick={() => void generar()}>
      {generando ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
      {generando ? 'Generando…' : etiqueta}
    </Button>
  )
}
