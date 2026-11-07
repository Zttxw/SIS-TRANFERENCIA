import { api } from '@/lib/api'
import type { ApiPaginated, ApiSuccess } from '@/types/api'
import type { FiltrosPersonal, GuardarPersonalPayload, Personal } from '@/types/personal'

export const personalService = {
  async listar(filtros: FiltrosPersonal = {}): Promise<ApiPaginated<Personal>> {
    const params = new URLSearchParams()
    if (filtros.dependencia_id) params.set('dependencia_id', String(filtros.dependencia_id))
    if (filtros.search) params.set('search', filtros.search)
    if (filtros.per_page) params.set('per_page', String(filtros.per_page))
    if (filtros.page) params.set('page', String(filtros.page))

    const res = await api.get<ApiPaginated<Personal>>(`/personal?${params.toString()}`)
    return res.data
  },

  async guardar(payload: GuardarPersonalPayload): Promise<Personal> {
    const res = await api.post<ApiSuccess<Personal>>('/personal', payload)
    return res.data.data
  },

  async eliminar(id: number): Promise<void> {
    await api.delete(`/personal/${id}`)
  },
}

