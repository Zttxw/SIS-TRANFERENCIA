/**
 * Tipos del módulo de Reportes (F5) — espejo de ReportesService del backend.
 */

export type ClaveReporte = 'matriz-anexos' | 'conciliacion-patrimonial' | 'observaciones' | 'verificacion'
export type FormatoExport = 'excel' | 'pdf'

export interface MetricasMatriz {
  total_dependencias: number
  borrador: number
  en_revision: number
  verificadas: number
  remitidas: number
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
  observaciones: number
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
  autor: string | null
  en_calidad_de: string | null
  registrada_en: string | null
}

/** Observaciones del coordinador ETTE: constancia sin subsanación (D-07). */
export interface ReporteObservaciones {
  generado_en: string
  resumen: {
    observaciones: number
    centros_costo: number
  }
  filas: FilaObservacion[]
}

export interface FilaVerificacion {
  dependencia_id: number
  codigo: string
  nombre: string
  estado_entrega: string
  estado_etiqueta: string
  anexos_faltantes: string[]
  bienes_sin_conformidad: number
  observaciones: number
  verificada_en: string | null
  verificada_por: string | null
  en_calidad_de: string | null
  resultado_verificacion: string | null
}

/** Resultado de la revisión del coordinador por CC, para el comité ETTE (RF-55). */
export interface ReporteVerificacion {
  generado_en: string
  resumen: {
    centros_costo: number
    sin_presentar: number
    en_revision: number
    aceptadas: number
  }
  filas: FilaVerificacion[]
}
