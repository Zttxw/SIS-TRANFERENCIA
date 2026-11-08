import { api } from '@/lib/api'
import type { ApiPaginated, ApiSuccess } from '@/types/api'
import type {
  BienPatrimonial,
  FiltrosPatrimonio,
  ResumenPatrimonial,
  VerificarBienPayload,
} from '@/types/patrimonio'

export const patrimonioService = {
  async listarBienes(filtros: FiltrosPatrimonio = {}): Promise<ApiPaginated<BienPatrimonial>> {
    const params = new URLSearchParams()
    if (filtros.dependencia_id) params.set('dependencia_id', String(filtros.dependencia_id))
    if (filtros.servidor_id) params.set('servidor_id', String(filtros.servidor_id))
    if (filtros.estado_verificacion) params.set('estado_verificacion', filtros.estado_verificacion)
    if (filtros.search) params.set('search', filtros.search)
    if (filtros.per_page) params.set('per_page', String(filtros.per_page))
    if (filtros.page) params.set('page', String(filtros.page))

    const res = await api.get<ApiPaginated<BienPatrimonial>>(`/patrimonio/bienes?${params.toString()}`)
    return res.data
  },

  async obtenerBien(id: number): Promise<BienPatrimonial> {
    const res = await api.get<ApiSuccess<BienPatrimonial>>(`/patrimonio/bienes/${id}`)
    return res.data.data
  },

  async obtenerResumen(dependenciaId?: number | null): Promise<ResumenPatrimonial> {
    const url = dependenciaId
      ? `/patrimonio/resumen?dependencia_id=${dependenciaId}`
      : '/patrimonio/resumen'
    const res = await api.get<ApiSuccess<ResumenPatrimonial>>(url)
    return res.data.data
  },

  async verificarBien(id: number, payload: VerificarBienPayload): Promise<BienPatrimonial> {
    const res = await api.post<ApiSuccess<BienPatrimonial>>(
      `/patrimonio/bienes/${id}/verificar`,
      payload,
    )
    return res.data.data
  },
}

