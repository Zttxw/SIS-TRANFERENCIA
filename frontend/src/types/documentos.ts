import type { Observacion } from './observaciones'

export interface DocumentoPendiente {
  registro_auditoria?: { usuario?: { id: number; name: string } | null; created_at: string } | null
  id: number
  proceso_transferencia_id: number
  dependencia_id: number
  servidor_responsable_id: number | null
  numero_documento: string | null
  tipo_documento: string | null
  asunto: string
  sumilla: string | null
  justificacion_pendiente: string | null
  fecha_documento: string | null
  estado_atencion: string | null
  accion_pendiente: string | null
  observaciones: string | null
  fuente: 'sgd' | 'manual' | string
  fuente_referencia: string | null
  extraido_en: string | null
  created_at: string
  updated_at: string
  dependencia?: {
    id: number
    codigo: string
    nombre: string
  }
  responsable?: {
    id: number
    dni: string
    nombres: string
    apellidos: string
  }
  observaciones_relacionadas?: Observacion[]
}

export interface GuardarDocumentoPayload {
  dependencia_id: number
  servidor_responsable_id?: number | null
  numero_documento?: string | null
  tipo_documento?: string | null
  asunto: string
  sumilla?: string | null
  justificacion_pendiente?: string | null
  fecha_documento?: string | null
  estado_atencion?: string | null
  accion_pendiente?: string | null
  observaciones?: string | null
}

export interface ResumenDocumentosPendientes {
  dependencia_id: number
  total_pendientes: number
  por_estado: Record<string, number>
}

export interface FiltrosDocumentos {
  dependencia_id?: number
  estado_atencion?: string
  search?: string
  per_page?: number
  page?: number
}

export interface ListadoDocumentosIndicador {
  total: number
  per_page: number
  current_page: number
  last_page: number
  items: Array<Pick<DocumentoPendiente, 'id' | 'numero_documento' | 'asunto' | 'sumilla' | 'estado_atencion'> & {
    original_sgd: 'disponible' | 'restringido' | 'no_aplica'
  }>
}

