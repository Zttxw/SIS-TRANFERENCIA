/**
 * Tipos de transferencia y estado de entregas (plan §7.8, E3).
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
