export type EstadoObservacion = 'abierta' | 'subsanada' | 'desestimada'

export type ClaveAnexoObservable =
  | 'gestion'
  | 'acervo'
  | 'patrimonio'
  | 'personal'
  | 'nopatrimonial'
  | 'documento'

export interface Observacion {
  id: number
  proceso_transferencia_id: number
  observable_type: string
  observable_id: number
  autor_id: number
  responsable_id: number | null
  descripcion: string
  estado: EstadoObservacion
  respuesta_subsanacion: string | null
  subsanada_en: string | null
  created_at: string
  updated_at: string
  autor?: {
    id: number
    name: string
    dni: string
  }
  responsable?: {
    id: number
    name: string
    dni: string
  }
}

export interface RegistrarObservacionPayload {
  anexo: ClaveAnexoObservable
  observable_id: number
  descripcion: string
}

export interface SubsanarObservacionPayload {
  id: number
  respuesta: string
}

export interface DesestimarObservacionPayload {
  id: number
  sustento?: string
}

export interface FiltrosObservaciones {
  dependencia_id?: number
  anexo?: ClaveAnexoObservable
  estado?: EstadoObservacion
  per_page?: number
  page?: number
}

