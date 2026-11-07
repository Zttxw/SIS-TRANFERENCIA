/**
 * Servicio del Dashboard de Estado de la Entrega (plan E3).
 * Consume /transferencia/estado y llamadas de workflow (remitir / revisar).
 */

import { api } from '@/lib/api'
import type { ApiSuccess } from '@/types/api'
import type {
  EstadoEntregaResponse,
  RemitirEntregaPayload,
  ResumenDocumentosResponse,
  RevisarEntregaPayload,
} from '@/types/transferencia'

export async function obtenerEstadoEntrega(
  dependenciaId: number,
): Promise<EstadoEntregaResponse> {
  const { data } = await api.get<ApiSuccess<EstadoEntregaResponse>>(
    '/transferencia/estado',
    { params: { dependencia_id: dependenciaId } },
  )
  return data.data
}

export async function obtenerResumenDocumentos(
  dependenciaId: number,
): Promise<ResumenDocumentosResponse> {
  const { data } = await api.get<ApiSuccess<ResumenDocumentosResponse>>(
    '/documentos-pendientes/resumen',
    { params: { dependencia_id: dependenciaId } },
  )
  return data.data
}

export async function remitirEntrega(
  payload: RemitirEntregaPayload,
): Promise<void> {
  await api.post('/transferencia/remitir', payload)
}

export async function revisarEntrega(
  payload: RevisarEntregaPayload,
): Promise<void> {
  await api.post('/transferencia/revisar', payload)
}
