import type { Dependencia, Usuario } from './auth'

export interface IntervinientesActa {
  titular_saliente?: string | null
  titular_entrante?: string | null
  coordinador_ette?: string | null
  responsable_superior?: string | null
}

export interface AnexosEntregadosMap {
  anexo_02: boolean
  anexo_03: boolean
  anexo_04: boolean
  anexo_05: boolean
  anexo_06: boolean
  [key: string]: boolean
}

export interface ActaTransferencia {
  id: number
  proceso_transferencia_id: number
  dependencia_id: number
  numero_acta: string
  fecha_acta: string
  intervinientes: IntervinientesActa | null
  anexos_entregados: AnexosEntregadosMap | null
  observaciones: string | null
  estado: 'borrador' | 'generada' | 'suscrita'
  ruta_pdf: string | null
  ruta_pdf_suscrito: string | null
  generada_por_id: number | null
  generada_por?: Usuario
  dependencia?: Dependencia
  created_at: string
  updated_at: string
}
