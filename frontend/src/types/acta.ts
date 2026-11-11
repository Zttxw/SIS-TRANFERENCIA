import type { Dependencia, Usuario } from './auth'

export interface IntervinientesActa {
  titular_saliente?: string | null
  titular_entrante?: string | null
  coordinador_ette?: string | null
  responsable_superior?: string | null
}

export interface AnexosEntregadosMap {
  anexo_01: boolean
  anexo_02: boolean
  anexo_03: boolean
  anexo_04: boolean
  anexo_05: boolean
  anexo_06: boolean
  anexo_07: boolean
  [key: string]: boolean
}

export interface EvidenciaItem {
  id: number
  evidenciable_type: string
  evidenciable_id: number
  subido_por_id: number
  nombre_original: string
  disco: string
  ruta: string
  mime_type: string
  tamano_bytes: number
  hash: string
  descripcion?: string | null
  subido_por?: Usuario
  created_at: string
  updated_at: string
}

export interface ActaTransferencia {
  id: number
  proceso_transferencia_id: number
  dependencia_id: number
  expediente_id: number | null
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
  evidencias?: EvidenciaItem[]
  created_at: string
  updated_at: string
}

export interface SubirEvidenciaPayload {
  archivo: File
  tipo: 'acta' | 'bien_patrimonial' | 'bien_no_patrimonial' | 'informe_gestion' | 'acervo_documental' | 'observacion'
  id: number
  descripcion?: string
}

