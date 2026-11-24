import { api } from '@/lib/api'
import type { ApiSuccess } from '@/types/api'

/** Etapa que gobierna la actividad y, por tanto, qué acciones bloquea al vencer. */
export type OperacionCronograma = 'ninguna' | 'verificacion' | 'acta' | 'remision'

export const ETIQUETA_OPERACION: Record<OperacionCronograma, string> = {
  ninguna: 'Informativa (no bloquea)',
  verificacion: 'Revisión y verificación (actividad 3)',
  acta: 'Suscripción del acta (actividad 4)',
  remision: 'Remisión',
}

export const BLOQUEA_OPERACION: Record<OperacionCronograma, string> = {
  ninguna: 'No bloquea ninguna acción.',
  verificacion: 'Al vencer bloquea cerrar la entrega para revisión y firma.',
  acta: 'Al vencer bloquea firmar los anexos y remitir la entrega.',
  remision: 'Al vencer bloquea remitir la entrega.',
}

export interface Feriado {
  id: number
  fecha: string
  descripcion: string
  alcance: 'nacional' | 'local'
}

export type FeriadoPayload = Pick<Feriado, 'fecha' | 'descripcion' | 'alcance'>

export interface ActividadCronograma {
  id: number
  etapa: string | null
  nombre: string
  descripcion: string | null
  dependencia_id: number | null
  dependencia?: { codigo: string; nombre: string } | null
  fecha_inicio: string | null
  /** Plazo CGR de referencia; si existe, el vencimiento se calcula en días hábiles. */
  fecha_cgr: string | null
  dias_habiles_antes: number
  fecha_vencimiento: string | null
  hora_vencimiento: string | null
  estado: 'pendiente' | 'en_curso' | 'completada'
  vencida: boolean
  operacion: OperacionCronograma
  orden: number
}

export type ActividadPayload = Pick<
  ActividadCronograma,
  | 'etapa'
  | 'nombre'
  | 'descripcion'
  | 'dependencia_id'
  | 'fecha_inicio'
  | 'fecha_cgr'
  | 'dias_habiles_antes'
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
  /** Prórroga: con plazo CGR se mueve esa fecha; si no, el vencimiento manual. */
  async prorrogar(actividad: ActividadCronograma, fecha: string) {
    await api.put(
      `/cronograma/${actividad.id}`,
      actividad.fecha_cgr ? { fecha_cgr: fecha } : { fecha_vencimiento: fecha },
    )
  },
  async eliminar(id: number) {
    await api.delete(`/cronograma/${id}`)
  },
}

export const feriadosService = {
  async listar() {
    const { data } = await api.get<ApiSuccess<Feriado[]>>('/feriados')
    return data.data
  },
  async guardar(id: number | null, payload: FeriadoPayload) {
    if (id) await api.put(`/feriados/${id}`, payload)
    else await api.post('/feriados', payload)
  },
  async eliminar(id: number) {
    await api.delete(`/feriados/${id}`)
  },
}
