import { api } from '@/lib/api'
import { descargarArchivo } from '@/lib/descargas'
import type { ApiSuccess } from '@/types/api'
import type { EstadoFirma, PreparacionFirma, SesionFirma, TipoDocumentoFirma } from './firmaperu.types'

export const firmaperuService = {
  async preparar(tipo: TipoDocumentoFirma, dependenciaId: number, signal: AbortSignal, previoId?: string) {
    const res = await api.post<ApiSuccess<PreparacionFirma>>('/firmaperu/preparar', {
      tipo_documento: tipo,
      dependencia_id: dependenciaId,
      documento_previo_id: previoId,
    }, { signal, timeout: 60000 })
    return res.data.data
  },
  async sesion(id: string, signal: AbortSignal) {
    const res = await api.get<ApiSuccess<SesionFirma>>(`/firmaperu/sesiones/${id}`, { signal, timeout: 15000 })
    return res.data.data
  },
  async estado(tipo: TipoDocumentoFirma, dependenciaId: number, signal: AbortSignal) {
    const res = await api.get<ApiSuccess<EstadoFirma>>(`/firmaperu/estado/${tipo}/${dependenciaId}`, { signal, timeout: 15000 })
    return res.data.data
  },
  descargar(id: string) {
    return descargarArchivo(`/firmaperu/documentos/${id}/descargar`, undefined, 'Anexo-firmado.pdf')
  },
}
