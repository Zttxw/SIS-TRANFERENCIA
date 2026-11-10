/**
 * Servicio del Dashboard de avance de los anexos.
 * Consume /transferencia/tablero (avance institucional) y /transferencia/estado
 * (avance de los anexos de una dependencia). El flujo de remisión lo lleva el SGD.
 */

import { api } from '@/lib/api'
import type { ApiSuccess } from '@/types/api'
import type {
  EstadoEntregaResponse,
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
