import { api } from '@/lib/api'
import type { ApiPaginated, ApiSuccess } from '@/types/api'
import type {
  BienNoPatrimonial,
  FiltrosNoPatrimonial,
  GuardarBienNoPatrimonialPayload,
} from '@/types/nopatrimonial'

export const noPatrimonialService = {
  async listar(filtros: FiltrosNoPatrimonial = {}): Promise<ApiPaginated<BienNoPatrimonial>> {
    const params = new URLSearchParams()
    if (filtros.dependencia_id) params.set('dependencia_id', String(filtros.dependencia_id))
    if (filtros.search) params.set('search', filtros.search)
    if (filtros.per_page) params.set('per_page', String(filtros.per_page))
    if (filtros.page) params.set('page', String(filtros.page))

    const res = await api.get<ApiPaginated<BienNoPatrimonial>>(`/nopatrimonial?${params.toString()}`)
    return res.data
  },

  async crear(payload: GuardarBienNoPatrimonialPayload): Promise<BienNoPatrimonial> {
    const res = await api.post<ApiSuccess<BienNoPatrimonial>>('/nopatrimonial', payload)
    return res.data.data
  },

  async actualizar(id: number, payload: GuardarBienNoPatrimonialPayload): Promise<BienNoPatrimonial> {
    const res = await api.put<ApiSuccess<BienNoPatrimonial>>(`/nopatrimonial/${id}`, payload)
    return res.data.data
  },

  async eliminar(id: number): Promise<void> {
    await api.delete(`/nopatrimonial/${id}`)
  },
}

