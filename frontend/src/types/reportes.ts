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

export interface FilaMatriz {
  dependencia_id: number
  codigo: string
  nombre: string
  nivel: number
  encargado: string | null
  estado_entrega: string
  anexo_02: boolean
  anexo_03: boolean
  anexo_04: boolean
  anexo_05: boolean
  anexo_06: boolean
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
