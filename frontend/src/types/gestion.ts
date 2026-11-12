import type { Observacion } from './observaciones'

export type EstadoInformeGestion = 'borrador' | 'completado'

export type NivelOrganizacional =
  | 'primer_nivel'
  | 'segundo_nivel'
  | 'tercer_nivel'
  | 'equipo_trabajo'

/** Base común de una fila editable: número de orden + celdas de texto. */
export type FilaBase = { n?: number } & Record<string, string | number | undefined>

/** Sección I — Función principal (filas repetibles). */
export interface FilaFuncion extends FilaBase {
  descripcion: string
}

/** Sección II — Logros y resultados. */
export interface FilaLogro extends FilaBase {
  actividad: string
  resultado?: string
  indicador?: string
  verificacion?: string
}

/** Sección III — Dificultades afrontadas. */
export interface FilaDificultad extends FilaBase {
  dificultad: string
  efecto?: string
  medida?: string
}

/** Sección IV — Agenda pendiente y asuntos que requieren atención. */
export interface FilaPendiente extends FilaBase {
  asunto: string
  estado_accion?: string
  documento_referencia?: string
  plazo?: string
  responsable?: string
}

export interface InformeGestion {
  cabecera?: {
    cargo: string | null
    nivel_organizacional: NivelOrganizacional | null
    responsable: { id: number; nombres: string; apellidos: string; cargo?: string } | null
  }
  id: number
  proceso_transferencia_id: number
  dependencia_id: number
  servidor_responsable_id: number | null
  elaborado_por_id: number
  nivel_organizacional: NivelOrganizacional | null
  cargo_periodo: string | null
  funciones: FilaFuncion[] | null
  logros_items: FilaLogro[] | null
  dificultades_items: FilaDificultad[] | null
  pendientes_items: FilaPendiente[] | null
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
  periodo_gestion?: string | null
  dependencia_id: number
  servidor_responsable_id?: number | null
  nivel_organizacional?: NivelOrganizacional | null
  cargo_periodo?: string | null
  funciones: FilaFuncion[]
  logros_items: FilaLogro[]
  dificultades_items?: FilaDificultad[]
  pendientes_items?: FilaPendiente[]
  estado?: EstadoInformeGestion
}
