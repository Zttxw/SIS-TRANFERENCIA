import { api } from '@/lib/api'
import type { ApiSuccess } from '@/types/api'
import type { TipoDocumentoFirma } from '@/features/firmaperu/firmaperu.types'

/** Visto bueno del delegado ETTE sobre lo remitido por una dependencia (GAP 2). */
export interface VistoBuenoDelegado {
  dependencia_id: number
  aprobado: boolean
  otorgado_en: string | null
  comentario: string | null
}

export const delegadoService = {
  async vistoBueno(dependenciaId: number, signal?: AbortSignal) {
    const res = await api.get<ApiSuccess<VistoBuenoDelegado>>(
      `/delegado/visto-bueno/${dependenciaId}`,
      { signal, timeout: 15000 },
    )
    return res.data.data
  },
  async aprobar(dependenciaId: number, comentario?: string) {
    const res = await api.post<ApiSuccess<VistoBuenoDelegado>>(
      '/delegado/visto-bueno',
      { dependencia_id: dependenciaId, comentario },
      { timeout: 15000 },
    )
    return res.data.data
  },
  async retirar(dependenciaId: number) {
    const res = await api.delete<ApiSuccess<VistoBuenoDelegado>>(
      `/delegado/visto-bueno/${dependenciaId}`,
      { timeout: 15000 },
    )
    return res.data.data
  },
  /**
   * Sube el PDF del anexo firmado/sellado a mano por el delegado como constancia
   * de su firma OPCIONAL (GAP 1). Devuelve el estado de la sesión recibida.
   */
  async subirFirmaManual(tipo: TipoDocumentoFirma, dependenciaId: number, archivo: File) {
    const form = new FormData()
    form.append('tipo_documento', tipo)
    form.append('dependencia_id', String(dependenciaId))
    form.append('signed_file', archivo)
    const res = await api.post<ApiSuccess<{ sesion_id: string; estado: string }>>(
      '/firmaperu/subir-manual',
      form,
      { timeout: 60000 },
    )
    return res.data.data
  },
}
