import type { EstadoConservacion } from './nopatrimonial'

export type EstadoVerificacionBien =
  | 'pendiente'
  | 'confirmado'
  | 'no_ubicado'
  | 'con_observacion'

export interface VerificacionBien {
  id: number
  bien_patrimonial_id: number
  verificado_por_id: number
  estado: EstadoVerificacionBien
  estado_conservacion: EstadoConservacion | null
  observacion: string | null
  verificado_en: string | null
  created_at: string
  verificado_por?: {
    id: number
    name: string
    dni: string
  }
}

export interface BienPatrimonial {
  id: number
  proceso_transferencia_id: number
  dependencia_id: number
  servidor_id: number | null
  codigo_patrimonial: string
  denominacion: string
  descripcion: string | null
  marca: string | null
  modelo: string | null
  serie: string | null
  estado_siga: string | null
  valor: string | number | null
  fuente: string
  fuente_referencia: string | null
  extraido_en: string | null
  created_at: string
  updated_at: string
  dependencia?: {
    id: number
    codigo: string
    nombre: string
  }
  servidor?: {
    id: number
    dni: string
    nombres: string
    apellidos: string
  }
  verificacion?: VerificacionBien | null
}

export interface VerificarBienPayload {
  estado: EstadoVerificacionBien
  estado_conservacion?: EstadoConservacion | null
  observacion?: string | null
}

export interface ResumenPatrimonial {
  total_bienes: number
  valor_total: number
  confirmados: number
  pendientes: number
  no_ubicados: number
  con_observacion: number
  porcentaje_avance: number
}

export interface FiltrosPatrimonio {
  dependencia_id?: number
  servidor_id?: number
  estado_verificacion?: EstadoVerificacionBien | ''
  search?: string
  per_page?: number
  page?: number
}
