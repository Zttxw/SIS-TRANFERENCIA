import { api } from '@/lib/api'
import type { ApiSuccess } from '@/types/api'

export interface CuentaDelegado {
  id: number
  dni: string
  name: string
}

export interface DesignacionDelegado {
  id: number
  usuario: CuentaDelegado
  dependencia: { id: number; codigo: string; nombre: string }
}

export const delegadosService = {
  async listar() {
    const { data } =
      await api.get<ApiSuccess<DesignacionDelegado[]>>('/delegados')
    return data.data
  },
  async candidatos(buscar: string) {
    const { data } = await api.get<ApiSuccess<CuentaDelegado[]>>(
      '/delegados/candidatos',
      { params: { buscar } },
    )
    return data.data
  },
  async designar(payload: { user_id: number; dependencia_id: number }) {
    await api.post('/delegados', payload)
  },
  async crearExterno(payload: { dni: string; name: string; email?: string; password: string; dependencia_id: number }) {
    await api.post('/delegados/externos', payload)
  },
  async revocar(id: number) {
    await api.delete(`/delegados/${id}`)
  },
}
