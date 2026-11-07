import { api } from '@/lib/api'
import type { ApiPaginated, ApiSuccess } from '@/types/api'
import type {
  AcervoDocumental,
  FiltrosAcervo,
  GuardarAcervoPayload,
} from '@/types/acervo'

export const acervoService = {
  async listar(filtros: FiltrosAcervo = {}): Promise<ApiPaginated<AcervoDocumental>> {
    const params = new URLSearchParams()
    if (filtros.dependencia_id) params.set('dependencia_id', String(filtros.dependencia_id))
    if (filtros.tipo) params.set('tipo', filtros.tipo)
    if (filtros.search) params.set('search', filtros.search)
    if (filtros.per_page) params.set('per_page', String(filtros.per_page))
    if (filtros.page) params.set('page', String(filtros.page))

    const res = await api.get<ApiPaginated<AcervoDocumental>>(`/acervo?${params.toString()}`)
    return res.data
  },

  async crear(payload: GuardarAcervoPayload): Promise<AcervoDocumental> {
    const res = await api.post<ApiSuccess<AcervoDocumental>>('/acervo', payload)
    return res.data.data
  },

  async actualizar(id: number, payload: GuardarAcervoPayload): Promise<AcervoDocumental> {
    const res = await api.put<ApiSuccess<AcervoDocumental>>(`/acervo/${id}`, payload)
    return res.data.data
  },

  async eliminar(id: number): Promise<void> {
    await api.delete(`/acervo/${id}`)
  },
}
