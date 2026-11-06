import { createContext } from 'react'

import type { Permiso } from '@/auth/permisos'
import type { LoginPayload, Usuario } from '@/types/auth'

/** Estado de la sesión: mientras se resuelve `/auth/me`, autenticado o anónimo. */
export type EstadoSesion = 'cargando' | 'autenticado' | 'anonimo'

export interface AuthContextValue {
  estado: EstadoSesion
  usuario: Usuario | null
  /** Set de permisos efectivos (unión de los roles del usuario). */
  permisos: Set<Permiso>
  tiene: (permiso: Permiso) => boolean
  iniciarSesion: (payload: LoginPayload) => Promise<void>
  cerrarSesion: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
