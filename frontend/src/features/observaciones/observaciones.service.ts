import { api } from '@/lib/api'
import type { ApiPaginated, ApiSuccess } from '@/types/api'
import type {
  FiltrosObservaciones,
  Observacion,
  RegistrarObservacionPayload,
  SubsanarObservacionPayload,
} from '@/types/observaciones'

export const observacionesService = {
  async listar(filtros: FiltrosObservaciones = {}): Promise<ApiPaginated<Observacion>> {
    const params = new URLSearchParams()
    if (filtros.dependencia_id) params.set('dependencia_id', String(filtros.dependencia_id))
    if (filtros.anexo) params.set('anexo', filtros.anexo)
    if (filtros.estado) params.set('estado', filtros.estado)
    if (filtros.per_page) params.set('per_page', String(filtros.per_page))
    if (filtros.page) params.set('page', String(filtros.page))

    const res = await api.get<ApiPaginated<Observacion>>(`/observaciones?${params.toString()}`)
    return res.data
  },

  async registrar(payload: RegistrarObservacionPayload): Promise<Observacion> {
    const res = await api.post<ApiSuccess<Observacion>>('/observaciones', payload)
    return res.data.data
  },

  async subsanar({ id, respuesta }: SubsanarObservacionPayload): Promise<Observacion> {
    const res = await api.post<ApiSuccess<Observacion>>(`/observaciones/${id}/subsanar`, {
      respuesta,
    })
    return res.data.data
  },

  async desestimar(id: number): Promise<Observacion> {
    const res = await api.post<ApiSuccess<Observacion>>(`/observaciones/${id}/desestimar`)
    return res.data.data
  },
}

