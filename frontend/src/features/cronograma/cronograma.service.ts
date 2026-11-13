import { api } from '@/lib/api'
import type { ApiSuccess } from '@/types/api'

export interface ActividadCronograma {
  id: number
  etapa: string | null
  nombre: string
  descripcion: string | null
  dependencia_id: number | null
  dependencia?: { codigo: string; nombre: string } | null
  fecha_inicio: string | null
  fecha_vencimiento: string | null
  hora_vencimiento: string | null
  estado: 'pendiente' | 'en_curso' | 'completada'
  vencida: boolean
  operacion: string
  orden: number
}

export type ActividadPayload = Pick<
  ActividadCronograma,
  | 'etapa'
  | 'nombre'
  | 'descripcion'
  | 'dependencia_id'
  | 'fecha_inicio'
  | 'fecha_vencimiento'
  | 'hora_vencimiento'
  | 'estado'
  | 'operacion'
  | 'orden'
>

export const cronogramaService = {
  async listar() {
    const { data } =
      await api.get<ApiSuccess<ActividadCronograma[]>>('/cronograma')
    return data.data
  },
  async guardar(id: number | null, payload: ActividadPayload) {
    if (id) await api.put(`/cronograma/${id}`, payload)
    else await api.post('/cronograma', payload)
  },
  async prorrogar(id: number, fecha: string) {
    await api.put(`/cronograma/${id}`, { fecha_vencimiento: fecha })
  },
  async eliminar(id: number) {
    await api.delete(`/cronograma/${id}`)
  },
}
