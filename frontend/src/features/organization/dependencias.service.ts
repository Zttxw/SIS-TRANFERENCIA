/**
 * Catálogo de dependencias / centros de costo (plan §6). Se usa en el selector
 * de ámbito. `all=true` devuelve el catálogo completo sin paginar.
 */

import { api } from '@/lib/api'
import type { ApiSuccess } from '@/types/api'
import type { Dependencia } from '@/types/auth'

export async function listarDependencias(
  search?: string,
  soloAmbito = true,
): Promise<Dependencia[]> {
  const { data } = await api.get<ApiSuccess<Dependencia[]>>('/dependencias', {
    params: {
      all: true,
      solo_activas: true,
      solo_ambito: soloAmbito,
      search: search || undefined,
    },
  })
  return data.data
}

export async function obtenerDependencia(id: number): Promise<Dependencia> {
  const { data } = await api.get<ApiSuccess<Dependencia>>(`/dependencias/${id}`)
  return data.data
}
