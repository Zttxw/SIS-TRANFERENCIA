import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import * as authService from '@/auth/auth.service'
import { AuthContext, type EstadoSesion } from '@/auth/auth-context'
import { derivarPermisos, type Permiso } from '@/auth/permisos'
import { registrarManejadorSesionCaducada } from '@/lib/api'
import { guardarToken, limpiarToken, obtenerToken } from '@/lib/token'
import type { LoginPayload, Usuario } from '@/types/auth'

/**
 * Proveedor de sesión (plan E2). Al montar:
 *  - si hay token en localStorage, intenta `/auth/me` → autenticado o anónimo;
 *  - si no hay token, queda anónimo sin llamar al backend.
 * Registra el manejador de 401 global para cerrar sesión cuando el token caduca.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [estado, setEstado] = useState<EstadoSesion>(() =>
    obtenerToken() ? 'cargando' : 'anonimo',
  )

  // Evita re-entrar en la limpieza de sesión si llegan varios 401 seguidos.
  const limpiando = useRef(false)

  const limpiarSesion = useCallback(() => {
    if (limpiando.current) return
    limpiando.current = true
    limpiarToken()
    setUsuario(null)
    setEstado('anonimo')
    queryClient.clear()
    // Permite futuras limpiezas tras completar el ciclo de render.
    queueMicrotask(() => {
      limpiando.current = false
    })
  }, [queryClient])

  // Conecta el interceptor de 401 del cliente axios con el estado de React.
  useEffect(() => {
    registrarManejadorSesionCaducada(limpiarSesion)
  }, [limpiarSesion])

  // Carga inicial del perfil si hay token persistido.
  useEffect(() => {
    if (!obtenerToken()) return
    let cancelado = false
    authService
      .me()
      .then((perfil) => {
        if (!cancelado) {
          setUsuario(perfil)
          setEstado('autenticado')
        }
      })
      .catch(() => {
        // Token inválido/caducado: el interceptor 401 ya limpia; por si fue
        // otro error, aseguramos el estado anónimo.
        if (!cancelado) limpiarSesion()
      })
    return () => {
      cancelado = true
    }
  }, [limpiarSesion])

  const iniciarSesion = useCallback(async (payload: LoginPayload) => {
    const { token, usuario: perfil } = await authService.login(payload)
    guardarToken(token)
    setUsuario(perfil)
    setEstado('autenticado')
  }, [])

  const cerrarSesion = useCallback(async () => {
    try {
      await authService.logout()
    } catch {
      // Aunque falle la revocación remota, limpiamos la sesión local.
    } finally {
      limpiarSesion()
    }
  }, [limpiarSesion])

  const permisos = useMemo<Set<Permiso>>(
    () => derivarPermisos(usuario?.roles ?? []),
    [usuario],
  )

  const tiene = useCallback(
    (permiso: Permiso) => permisos.has(permiso),
    [permisos],
  )

  const value = useMemo(
    () => ({ estado, usuario, permisos, tiene, iniciarSesion, cerrarSesion }),
    [estado, usuario, permisos, tiene, iniciarSesion, cerrarSesion],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
