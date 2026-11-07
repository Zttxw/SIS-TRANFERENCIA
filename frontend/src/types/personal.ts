export interface Personal {
  id: number
  proceso_transferencia_id: number
  dependencia_id: number
  servidor_id: number | null
  dni: string
  nombres: string
  apellidos: string
  cargo: string
  regimen_laboral: string
  modalidad_contractual: string | null
  situacion_laboral: string | null
  validado: boolean
  fuente: string
  created_at: string
  updated_at: string
  dependencia?: {
    id: number
    codigo: string
    nombre: string
  }
}

export interface GuardarPersonalPayload {
  dependencia_id: number
  servidor_id?: number | null
  dni: string
  nombres: string
  apellidos: string
  cargo: string
  regimen_laboral: string
  modalidad_contractual?: string | null
  situacion_laboral?: string | null
  validado?: boolean
}

export interface FiltrosPersonal {
  dependencia_id?: number
  search?: string
  per_page?: number
  page?: number
}
