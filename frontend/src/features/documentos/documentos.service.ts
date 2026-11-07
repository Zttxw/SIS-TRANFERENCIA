import { api } from '@/lib/api'
import type { ApiPaginated, ApiSuccess } from '@/types/api'
import type {
  DocumentoPendiente,
  FiltrosDocumentos,
  GuardarDocumentoPayload,
  ResumenDocumentosPendientes,
} from '@/types/documentos'

export const documentosService = {
  async listar(filtros: FiltrosDocumentos = {}): Promise<ApiPaginated<DocumentoPendiente>> {
    const params = new URLSearchParams()
    if (filtros.dependencia_id) params.set('dependencia_id', String(filtros.dependencia_id))
    if (filtros.estado_atencion) params.set('estado_atencion', filtros.estado_atencion)
    if (filtros.search) params.set('search', filtros.search)
    if (filtros.per_page) params.set('per_page', String(filtros.per_page))
    if (filtros.page) params.set('page', String(filtros.page))

    const res = await api.get<ApiPaginated<DocumentoPendiente>>(
      `/documentos-pendientes?${params.toString()}`,
    )
    return res.data
  },

  async obtenerResumen(dependenciaId: number): Promise<ResumenDocumentosPendientes> {
    const res = await api.get<ApiSuccess<ResumenDocumentosPendientes>>(
      `/documentos-pendientes/resumen?dependencia_id=${dependenciaId}`,
    )
    return res.data.data
  },

  async crear(payload: GuardarDocumentoPayload): Promise<DocumentoPendiente> {
    const res = await api.post<ApiSuccess<DocumentoPendiente>>(
      '/documentos-pendientes',
      payload,
    )
    return res.data.data
  },

  async actualizar(id: number, payload: GuardarDocumentoPayload): Promise<DocumentoPendiente> {
    const res = await api.put<ApiSuccess<DocumentoPendiente>>(
      `/documentos-pendientes/${id}`,
      payload,
    )
    return res.data.data
  },

  async eliminar(id: number): Promise<void> {
    await api.delete(`/documentos-pendientes/${id}`)
  },
}
