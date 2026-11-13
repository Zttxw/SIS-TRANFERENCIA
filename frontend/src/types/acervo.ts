export type TipoAcervo = 'fisico' | 'digital'

export interface AcervoDocumental {
  id: number
  proceso_transferencia_id: number
  dependencia_id: number
  registrado_por_id: number
  tipo: TipoAcervo
  serie_documental: string
  anio: number | null
  desde_anio: number | null
  hasta_anio: number | null
  periodo: string | null
  cantidad_unidades: number
  unidad_conservacion: string
  ubicacion: string | null
  descripcion: string | null
  observaciones: string | null
  fuente: string
  created_at: string
  updated_at: string
  dependencia?: {
    id: number
    codigo: string
    nombre: string
  }
}

export interface GuardarAcervoPayload {
  dependencia_id: number
  tipo: TipoAcervo
  serie_documental: string
  anio?: number | null
  desde_anio?: number | null
  hasta_anio?: number | null
  periodo?: string | null
  cantidad_unidades: number
  unidad_conservacion: string
  ubicacion?: string | null
  descripcion?: string | null
  observaciones?: string | null
}

export interface FiltrosAcervo {
  dependencia_id?: number
  tipo?: TipoAcervo
  search?: string
  per_page?: number
  page?: number
}

/** Documento individual del SGD que respalda una fila-resumen de acervo digital. */
export interface DocumentoSgd {
  emi: string
  numero_documento: string | null
  asunto: string
  fecha: string | null
  folios: number | null
  tiene_pdf: boolean
  bytes_pdf: number
}

export interface DocumentosSgdResultado {
  data: DocumentoSgd[]
  meta: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
}

export interface FiltrosDocumentosSgd {
  search?: string
  page?: number
  per_page?: number
}

