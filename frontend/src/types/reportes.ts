/**
 * Tipos del módulo de Reportes — espejo de ReportesService del backend.
 */

export type ClaveReporte = 'matriz-anexos' | 'conciliacion-patrimonial'
export type FormatoExport = 'excel' | 'pdf'

export interface MetricasMatriz {
  total_dependencias: number
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
  anexo_02: boolean
  anexo_03: boolean
  anexo_04: boolean
  anexo_05: boolean
  anexo_06: boolean
  anexos_completos: number
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
