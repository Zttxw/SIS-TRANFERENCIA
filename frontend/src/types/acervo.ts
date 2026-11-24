export type TipoAcervo = 'fisico' | 'digital'

/**
 * Serie del Anexo 03. `digital` = sección A (precargada del SGD, solo lectura,
 * medida en `numero_documentos`); `fisico` = sección B (registrada a mano,
 * medida en `folios`).
 */
export interface AcervoDocumental {
  id: number
  proceso_transferencia_id: number
  dependencia_id: number
  registrado_por_id: number | null
  registrado_por?: { id: number; name: string } | null
  tipo: TipoAcervo
  serie_documental: string
  anio: number | null
  folios: number | null
  numero_documentos: number | null
  unidad_conservacion: string
  ubicacion: string | null
  fuente: string
  created_at: string
  updated_at: string
  dependencia?: {
    id: number
    codigo: string
    nombre: string
  }
}

/** Serie física (sección B). */
export interface GuardarAcervoPayload {
  dependencia_id: number
  serie_documental: string
  anio: number
  folios: number
  unidad_conservacion: string
  ubicacion: string
}

export interface FiltrosAcervo {
  dependencia_id?: number
  tipo?: TipoAcervo
  search?: string
  per_page?: number
  page?: number
}

/** Documento individual del SGD que respalda una serie digital del Anexo 03. */
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

