import type { Dependencia, Usuario } from './auth'

export interface IdentidadInterviniente {
  nombre: string
  dni: string
  cargo: string
}

/** Receptor de la sección II: coordinador ETTE o titular que lo suplió. */
export interface ReceptorActa extends IdentidadInterviniente {
  calidad: string
}

export interface IntervinientesActa {
  titular_saliente?: string | IdentidadInterviniente | null
  coordinador_ette?: ReceptorActa | null
}

/** Ítems de la sección III del Acta 07. */
export type ItemActa = 'anexo_02' | 'anexo_03a' | 'anexo_03b' | 'anexo_04' | 'anexo_05' | 'anexo_06' | 'otros'

export type CondicionAnexoActa = 'entregado' | 'no_entregado' | 'no_aplica'

export interface CondicionItemActa {
  condicion: CondicionAnexoActa
  observacion: string | null
  /** La fijaron las partes; si no, sale de la presencia de registros. */
  manual: boolean
}

export type AnexosEntregadosMap = Record<ItemActa, CondicionItemActa>

/** Observación del coordinador ETTE que figura en la sección IV. */
export interface ObservacionActa {
  n: number
  descripcion: string
  documentacion: string
  autor: string
}

export interface GuardarActaPayload {
  fecha_acta?: string
  hora?: string | null
  lugar?: string
  otros_documentos?: string | null
  observaciones?: string | null
  condiciones?: Partial<Record<ItemActa, { condicion?: CondicionAnexoActa; observacion?: string | null }>>
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
  version: number
  id: number
  proceso_transferencia_id: number
  dependencia_id: number
  expediente_id: number | null
  numero_acta: string
  fecha_acta: string
  lugar: string | null
  hora: string | null
  intervinientes: IntervinientesActa | null
  anexos_entregados: AnexosEntregadosMap | null
  otros_documentos: string | null
  /** Comentarios adicionales (sección IV). */
  observaciones: string | null
  /** Las partes aún pueden completar el acta (sin firmas ni suscripción). */
  editable: boolean
  observaciones_registradas: ObservacionActa[]
  estado: 'borrador' | 'generada' | 'suscrita'
  ruta_pdf: string | null
  ruta_pdf_suscrito: string | null
  generada_por_id: number | null
  generada_por?: { id: number; name: string } | null
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

