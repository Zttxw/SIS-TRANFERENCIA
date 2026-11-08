import { api } from '@/lib/api'
import type { ApiPaginated, ApiSuccess } from '@/types/api'
import type {
  DependenciaResumen,
  EntregaItem,
  EstadoEntregaResponse,
  FiltrosEntregas,
  RemitirEntregaPayload,
  RevisarEntregaPayload,
} from '@/types/transferencia'

export const entregasService = {
  async listarEntregas(filtros: FiltrosEntregas = {}): Promise<ApiPaginated<EntregaItem>> {
    const params = new URLSearchParams()
    if (filtros.dependencia_id) params.set('dependencia_id', String(filtros.dependencia_id))
    if (filtros.estado) params.set('estado', filtros.estado)
    if (filtros.per_page) params.set('per_page', String(filtros.per_page))
    if (filtros.page) params.set('page', String(filtros.page))

    const res = await api.get<ApiPaginated<EntregaItem>>(`/transferencia/entregas?${params.toString()}`)
    return res.data
  },

  async obtenerEstadoEntrega(dependenciaId: number): Promise<EstadoEntregaResponse> {
    const res = await api.get<ApiSuccess<EstadoEntregaResponse>>('/transferencia/estado', {
      params: { dependencia_id: dependenciaId },
    })
    return res.data.data
  },

  async remitirEntrega(payload: RemitirEntregaPayload): Promise<void> {
    await api.post('/transferencia/remitir', payload)
  },

  async revisarEntrega(payload: RevisarEntregaPayload): Promise<void> {
    await api.post('/transferencia/revisar', payload)
  },

  async listarCatalogoDependencias(): Promise<DependenciaResumen[]> {
    const res = await api.get<ApiSuccess<DependenciaResumen[]>>('/dependencias', {
      params: { all: true, solo_activas: true },
    })
    return res.data.data
  },
}

