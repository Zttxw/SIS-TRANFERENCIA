import { useContext } from 'react'

import { AuthContext, type AuthContextValue } from '@/auth/auth-context'
import {
  DependenciaContext,
  type DependenciaContextValue,
} from '@/auth/dependencia-context'
import type { Permiso } from '@/auth/permisos'

/** Acceso al estado de sesión. Debe usarse dentro de <AuthProvider>. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>.')
  }
  return ctx
}

/** True si el usuario tiene el permiso dado (gating de UI; plan §5). */
export function usePermiso(permiso: Permiso): boolean {
  return useAuth().tiene(permiso)
}

/** Dependencia activa seleccionada. Debe usarse dentro de <DependenciaProvider>. */
export function useDependenciaActiva(): DependenciaContextValue {
  const ctx = useContext(DependenciaContext)
  if (!ctx) {
    throw new Error(
      'useDependenciaActiva debe usarse dentro de <DependenciaProvider>.',
    )
  }
  return ctx
}
