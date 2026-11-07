import type { Observacion } from './observaciones'

export type EstadoInformeGestion = 'borrador' | 'completado'

export interface InformeGestion {
  id: number
  proceso_transferencia_id: number
  dependencia_id: number
  servidor_responsable_id: number | null
  elaborado_por_id: number
  principales_funciones: string
  logros: string
  dificultades: string | null
  asuntos_pendientes: string | null
  estado: EstadoInformeGestion
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
    cargo?: string
  }
  elaborado_por?: {
    id: number
    name: string
    dni: string
  }
  observaciones?: Observacion[]
}

export interface GuardarInformeGestionPayload {
  dependencia_id: number
  servidor_responsable_id?: number | null
  principales_funciones: string
  logros: string
  dificultades?: string | null
  asuntos_pendientes?: string | null
  estado?: EstadoInformeGestion
}
