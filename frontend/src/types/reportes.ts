/**
 * Tipos del módulo de Reportes (F5) — espejo de ReportesService del backend.
 */

import type { EstadoObservacion } from './observaciones'

export type ClaveReporte = 'matriz-anexos' | 'conciliacion-patrimonial' | 'observaciones' | 'verificacion'
export type FormatoExport = 'excel' | 'pdf'

export interface ReporteVerificacion {
  generado_en?: string
  [key: string]: unknown
}

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
  anexo_03a: EstadoAnexoMatriz | boolean | string
  anexo_03b: EstadoAnexoMatriz | boolean | string
  anexo_04: EstadoAnexoMatriz | boolean | string
  anexo_05: EstadoAnexoMatriz | boolean | string
  anexo_06: EstadoAnexoMatriz | boolean | string
  anexos_completados?: number
  anexos_firmados?: number
  porcentaje_avance?: number
  /** Observaciones vigentes del coordinador ETTE (constancia en el Acta 07). */
  observaciones_vigentes: number
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

/** Observación del coordinador ETTE: constancia, sin subsanación (D-07). */
export interface FilaObservacion {
  id: number
  dependencia_id: number
  codigo: string
  nombre: string
  anexo: string
  /** «Anexo completo» o «Registro N° …». */
  detalle: string
  descripcion: string
  estado: EstadoObservacion
  estado_etiqueta: string
  /** Firmante ETTE a cuyo nombre se registró (coordinador o titular suplente). */
  autor: string | null
  en_calidad_de: string | null
  registrada_por: string | null
  registrada_en: string | null
}

export interface ReporteObservaciones {
  generado_en: string
  resumen: {
    total: number
    registradas: number
    retiradas: number
    centros_observados: number
  }
  filas: FilaObservacion[]
}
