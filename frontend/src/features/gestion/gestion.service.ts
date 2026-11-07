import { api } from '@/lib/api'
import type { ApiSuccess } from '@/types/api'
import type { GuardarInformeGestionPayload, InformeGestion } from '@/types/gestion'

export const gestionService = {
  async obtenerInforme(dependenciaId: number): Promise<InformeGestion | null> {
    const res = await api.get<ApiSuccess<InformeGestion | null>>(
      `/gestion/informe?dependencia_id=${dependenciaId}`,
    )
    return res.data.data
  },

  async guardarInforme(payload: GuardarInformeGestionPayload): Promise<InformeGestion> {
    const res = await api.post<ApiSuccess<InformeGestion>>('/gestion/informe', payload)
    return res.data.data
  },
}

