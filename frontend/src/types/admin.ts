import type { Dependencia } from './auth'

export interface CuentaUsuarioResumen {
  id: number
  servidor_id: number
  dni: string
  activo: boolean
}

export interface ServidorPadronItem {
  id: number
  proceso_transferencia_id: number
  dependencia_id: number | null
  user_id: number | null
  dni: string
  nombres: string
  apellidos: string
  cargo: string | null
  email: string | null
  regimen_laboral: string | null
  modalidad_contractual: string | null
  situacion_laboral: string | null
  es_responsable: boolean
  fuente: string
  dependencia?: Dependencia | null
  cuenta?: CuentaUsuarioResumen | null
  created_at: string
  updated_at: string
}

export interface RolPropuesto {
  rol: string
  etiqueta: string
  dependencia_id: number | null
  dependencia: string | null
}

export interface PropuestaActivacion {
  servidor: ServidorPadronItem
  tiene_cuenta: boolean
  roles: RolPropuesto[]
}

export interface ActivarCuentaPayload {
  password: string
}

export interface ResultadoActivacion {
  user_id: number
  dni: string
  nombre: string
}

export interface FiltrosServidores {
  buscar?: string
  page?: number
  soloSinCuenta?: boolean
}

