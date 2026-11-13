export type EstadoConservacion = 'bueno' | 'regular' | 'malo' | 'inservible'

export interface BienNoPatrimonial {
  id: number
  proceso_transferencia_id: number
  dependencia_id: number
  servidor_id: number | null
  registrado_por?: { id: number; name: string } | null
  denominacion: string
  descripcion: string | null
  cantidad: number
  unidad_medida: string
  estado_conservacion: EstadoConservacion | null
  ubicacion: string | null
  observaciones: string | null
  fuente: string
  created_at: string
  updated_at: string
  dependencia?: {
    id: number
    codigo: string
    nombre: string
  }
}

export interface GuardarBienNoPatrimonialPayload {
  dependencia_id: number
  servidor_id?: number | null
  denominacion: string
  descripcion?: string | null
  cantidad: number
  unidad_medida: string
  estado_conservacion?: EstadoConservacion | null
  ubicacion?: string | null
  observaciones?: string | null
}

export interface FiltrosNoPatrimonial {
  dependencia_id?: number
  search?: string
  per_page?: number
  page?: number
}

