/**
 * Tipos de transferencia y estado de entregas (plan §7.8, E3, E8).
 */

export type EstadoEntrega =
  | 'borrador'
  | 'remitida'
  | 'en_revision'
  | 'observada'
  | 'subsanada'
  | 'consolidada'

export interface EntregaDetalle {
  id: number
  estado: EstadoEntrega
  destino_id: number | null
  hacia_etts: boolean
  remitida_en: string | null
  revisada_en: string | null
  consolidada_en: string | null
  comentario: string | null
}

export interface DependenciaResumen {
  id: number
  codigo: string
  nombre: string
  nivel: number
  parent_id: number | null
  activa?: boolean
  encargado?: {
    id: number
    dni: string
    nombres: string
    apellidos: string
    cargo: string | null
  } | null
}

export interface EstadoEntregaResponse {
  dependencia: DependenciaResumen
  anexo02_gestion: {
    existe: boolean
    estado: string
  }
  anexo03_acervo: {
    total_series: number
  }
  anexo04_patrimonio: {
    total_bienes: number
    confirmados: number
    pendientes: number
    porcentaje_avance: number
  }
  anexo05_personal: {
    total_personal: number
  }
  anexo06_nopatrimonial: {
    total_bienes: number
  }
  entrega: EntregaDetalle | null
}

export interface ResumenDocumentosResponse {
  dependencia_id: number
  total_pendientes: number
  por_estado: Array<{
    estado: string
    total: number
  }>
}

export interface RemitirEntregaPayload {
  dependencia_id: number
  comentario?: string
}

export interface RevisarEntregaPayload {
  dependencia_id: number
  accion: 'observar' | 'consolidar'
  comentario?: string
}

export interface EntregaItem {
  id: number
  proceso_transferencia_id: number
  dependencia_id: number
  dependencia_destino_id: number | null
  emisor_id: number | null
  receptor_id: number | null
  estado: EstadoEntrega
  remitida_en: string | null
  revisada_en: string | null
  consolidada_en: string | null
  comentario: string | null
  created_at: string
  updated_at: string
  dependencia: DependenciaResumen
  dependencia_destino?: DependenciaResumen | null
  emisor?: {
    id: number
    name: string
    dni: string
  } | null
  receptor?: {
    id: number
    name: string
    dni: string
  } | null
}

export interface FiltrosEntregas {
  dependencia_id?: number
  estado?: EstadoEntrega
  per_page?: number
  page?: number
}
