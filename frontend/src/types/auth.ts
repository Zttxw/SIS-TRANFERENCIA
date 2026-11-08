/**
 * Tipos del dominio de autenticación — espejo de `AuthController::perfil()`
 * del backend (plan §3). Un usuario puede tener varias asignaciones de rol
 * sobre distintas dependencias: siempre manejar la lista `roles`.
 */

import type { RolCodigo } from '@/auth/permisos'

export interface Dependencia {
  id: number
  codigo: string
  nombre: string
  nivel: number
  parent_id?: number | null
}

export interface AsignacionRol {
  rol: RolCodigo
  etiqueta: string
  dependencia_id: number | null
}

export interface Servidor {
  id: number
  dependencia_id: number | null
  dni: string
  nombres: string
  apellidos: string
  cargo: string | null
  es_responsable: boolean
  dependencia?: Dependencia | null
}

export interface Usuario {
  id: number
  dni: string
  nombre: string
  email: string | null
  activo: boolean
  roles: AsignacionRol[]
  servidor: Servidor | null
}

export interface LoginPayload {
  dni: string
  password: string
  /** Nombre del dispositivo para el token Sanctum. El backend lo lee como
   *  `dispositivo` (LoginRequest); por defecto 'api'. */
  dispositivo?: string
}

export interface LoginResponse {
  token: string
  usuario: Usuario
}
