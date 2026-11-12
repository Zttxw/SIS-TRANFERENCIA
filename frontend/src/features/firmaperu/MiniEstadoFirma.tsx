import { useQuery } from '@tanstack/react-query'

import { firmaperuService } from './firmaperu.service'
import type { EstadoFirma, TipoDocumentoFirma } from './firmaperu.types'

interface Props {
  tipoDocumento: TipoDocumentoFirma
  dependenciaId: number
}

/**
 * Indicador discreto del estado de DOCUMENTO/FIRMA para la fila cerrada de la
 * tabla «Mi entrega» (plan 07). Mini-pastilla con un punto de color + texto
 * corto. No aparece cuando aún no hay PDF (para no competir con el badge de
 * estado de llenado del anexo). El detalle completo vive en la fila expandible.
 */
export function MiniEstadoFirma({ tipoDocumento, dependenciaId }: Props) {
  const { data: estado } = useQuery<EstadoFirma>({
    queryKey: ['firmaperu', tipoDocumento, dependenciaId],
    queryFn: ({ signal }) => firmaperuService.estado(tipoDocumento, dependenciaId, signal),
    retry: false,
    staleTime: 15000,
  })

  if (!estado) return null

  let punto = ''
  let texto = ''
  if (estado.firmado && estado.vigente !== false) {
    punto = 'bg-success'
    texto = `Firmado${estado.version ? ` v${estado.version}` : ''}`
  } else if (estado.firmado && estado.vigente === false) {
    punto = 'bg-warning'
    texto = 'Firma no vigente'
  } else if (estado.pendiente_validacion) {
    punto = 'bg-warning'
    texto = 'Verificación pendiente'
  } else if (estado.borrador_generado) {
    punto = 'bg-[color:var(--info)]'
    texto = 'PDF · pendiente de firma'
  } else {
    // Sin PDF: no se muestra nada, para no recargar la fila.
    return null
  }

  return (
    <span className="inline-flex items-center gap-1 text-mini text-muted-foreground">
      <span className={`h-1.5 w-1.5 rounded-full ${punto}`} />
      {texto}
    </span>
  )
}
