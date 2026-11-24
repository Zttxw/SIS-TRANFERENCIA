/**
 * Tipos del módulo de Reportes (F5) — espejo de ReportesService del backend.
 */

export type ClaveReporte = 'matriz-anexos' | 'conciliacion-patrimonial' | 'observaciones'
export type FormatoExport = 'excel' | 'pdf'

export interface MetricasMatriz {
  total_dependencias: number
  consolidadas: number
  remitidas: number
  observadas: number
  borrador: number
  porcentaje_avance: number
  patrimonio: {
    total_bienes: number
    verificados: number
    pendientes: number
    porcentaje: number
    valor_total: number
  }
}

export type EstadoAnexoMatriz = 'no_generado' | 'generado' | 'firmado' | 'entregado'

export interface FilaMatriz {
  dependencia_id: number
  codigo: string
  nombre: string
  nivel: number
  encargado: string | null
  estado_entrega: string
  anexo_02: EstadoAnexoMatriz | boolean | string
  anexo_03: EstadoAnexoMatriz | boolean | string
  anexo_04: EstadoAnexoMatriz | boolean | string
  anexo_05: EstadoAnexoMatriz | boolean | string
  anexo_06: EstadoAnexoMatriz | boolean | string
  anexos_completados?: number
  anexos_firmados?: number
  porcentaje_avance?: number
  observaciones_abiertas: number
  patrimonio_total: number
  patrimonio_confirmados: number
  patrimonio_porcentaje: number
}

export interface ReporteMatriz {
  generado_en: string
  metricas: MetricasMatriz
  filas: FilaMatriz[]
}

export interface FilaConciliacion {
  dependencia_id: number
  codigo: string
  nombre: string
  total: number
  confirmados: number
  pendientes: number
  porcentaje: number
}

export interface ReporteConciliacion {
  generado_en: string
  totales: MetricasMatriz['patrimonio']
  filas: FilaConciliacion[]
}

export interface FilaObservacion {
  dependencia_id: number
  codigo: string
  nombre: string
  anexo: string
  descripcion: string
  estado: string
  estado_etiqueta: string
  autor: string | null
  registrada_en: string | null
  dias_subsanacion: number | null
}

export interface ReporteObservaciones {
  generado_en: string
  resumen: {
    abiertas: number
    en_subsanacion: number
    subsanadas: number
    desestimadas: number
  }
  filas: FilaObservacion[]
}
