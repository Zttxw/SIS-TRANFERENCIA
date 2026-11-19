import { api } from '@/lib/api'
import type { ApiSuccess } from '@/types/api'

/** Centro de costo del Anexo 01 (CEPLAN). */
export interface CentroCosto {
  id: number
  codigo: string
  nombre: string
  nivel: number
  codigo_padre: string | null
  envia_a_etts: boolean
  equivalencias: number
}

export type OrigenEquivalencia = 'sgd' | 'siga'

/** Vínculo de una dependencia del SGD o un centro de costo del SIGA con un CC del Anexo 01. */
export interface Equivalencia {
  id: number
  origen: OrigenEquivalencia
  codigo_origen: string
  nombre_origen: string | null
  depende_de: string | null
  centro_costo: { id: number; codigo: string; nombre: string } | null
  es_principal: boolean
  confirmada_por: string | null
  confirmada_en: string | null
}

export interface FiltrosEquivalencias {
  origen: OrigenEquivalencia | ''
  sin_asignar: boolean
  buscar: string
}

export const centrosCostoService = {
  async listarCentros() {
    const { data } = await api.get<ApiSuccess<CentroCosto[]>>('/centros-costo')
    return data.data
  },

  async listarEquivalencias(filtros: FiltrosEquivalencias) {
    const params: Record<string, string | number> = {}
    if (filtros.origen) params.origen = filtros.origen
    if (filtros.sin_asignar) params.sin_asignar = 1
    if (filtros.buscar.trim() !== '') params.buscar = filtros.buscar.trim()
    const { data } = await api.get<ApiSuccess<Equivalencia[]>>('/centros-costo/equivalencias', { params })
    return data.data
  },

  async asignar(id: number, centroCostoId: number | null, esPrincipal: boolean) {
    const { data } = await api.put<ApiSuccess<Equivalencia>>(`/centros-costo/equivalencias/${id}`, {
      centro_costo_id: centroCostoId,
      es_principal: esPrincipal,
    })
    return data.data
  },
}
