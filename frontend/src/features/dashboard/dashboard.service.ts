/**
 * Servicio del Dashboard de Estado de la Entrega (plan E3).
 * Consume /transferencia/estado y la remisión de la entrega.
 */

import { api } from '@/lib/api'
import type { ApiSuccess } from '@/types/api'
import type {
  EstadoEntregaResponse,
  RemitirEntregaPayload,
  ResumenDocumentosResponse,
  TableroOperativoData,
} from '@/types/transferencia'

export async function obtenerTableroOperativo(): Promise<TableroOperativoData> {
  const { data } = await api.get<ApiSuccess<TableroOperativoData>>(
    '/transferencia/tablero',
  )
  return data.data
}

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

