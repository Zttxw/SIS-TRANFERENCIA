/**
 * Tipos de apoyo a la generación de anexos: avance de los anexos de una
 * dependencia y tablero de avance institucional. El sistema no orquesta el flujo
 * de remisión/consolidación (eso lo lleva el SGD).
 */

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
}

/** Presencia de cada anexo (clave `anexo_02`…`anexo_06`). */
export interface PresenciaAnexos {
  anexo_02: boolean
  anexo_03: boolean
  anexo_04: boolean
  anexo_05: boolean
  anexo_06: boolean
}

export interface DependenciaAvanceItem {
  id: number
  codigo: string
  nombre: string
  nivel: number
  parent_id: number | null
  encargado: {
    id: number
    nombres: string
    apellidos: string
    cargo: string | null
  } | null
  anexos: PresenciaAnexos
  anexos_completos: number
  patrimonio_total: number
  patrimonio_confirmados: number
  patrimonio_porcentaje: number
}

export interface MetricasTablero {
  total_dependencias: number
  patrimonio: {
    total_bienes: number
    verificados: number
    pendientes: number
    porcentaje: number
    valor_total: number
  }
}

export interface TableroOperativoData {
  metricas: MetricasTablero
  dependencias: DependenciaAvanceItem[]
}
