export type TipoAcervo = 'fisico' | 'digital'

export interface AcervoDocumental {
  id: number
  proceso_transferencia_id: number
  dependencia_id: number
  registrado_por_id: number
  tipo: TipoAcervo
  serie_documental: string
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
