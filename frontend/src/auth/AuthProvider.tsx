import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import * as authService from '@/auth/auth.service'
import { AuthContext, type EstadoSesion } from '@/auth/auth-context'
import { derivarPermisos, type Permiso } from '@/auth/permisos'
import { registrarManejadorSesionCaducada } from '@/lib/api'
import {
  guardarToken,
  haCaducadoPorInactividad,
  limpiarToken,
  marcarCierrePorInactividad,
  obtenerToken,
  registrarActividad,
} from '@/lib/token'
import type { LoginPayload, Usuario } from '@/types/auth'
import { cerrarSesionSinEspera } from './sesion-runtime'

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
  const consultaPerfil = useRef<AbortController | null>(null)
  const revisionSesion = useRef(0)

  const limpiarSesion = useCallback(() => {
    if (limpiando.current) return
    limpiando.current = true
    revisionSesion.current++
    consultaPerfil.current?.abort()
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
    const token = obtenerToken()
    if (!token) return
    const controlador = new AbortController()
    consultaPerfil.current = controlador
    authService
      .me(controlador.signal)
      .then((perfil) => {
        if (!controlador.signal.aborted && obtenerToken() === token) {
          setUsuario(perfil)
          setEstado('autenticado')
        }
      })
      .catch(() => {
        // Token inválido/caducado: el interceptor 401 ya limpia; por si fue
        // otro error, aseguramos el estado anónimo.
        if (!controlador.signal.aborted && obtenerToken() === token) limpiarSesion()
      })
    return () => {
      controlador.abort()
    }
  }, [limpiarSesion])

  const iniciarSesion = useCallback(async (payload: LoginPayload) => {
    consultaPerfil.current?.abort()
    const revision = revisionSesion.current
    const { token, usuario: perfil } = await authService.login(payload)
    if (revision !== revisionSesion.current) {
      void authService.logout(token).catch(() => undefined)
      return
    }
    queryClient.clear()
    guardarToken(token)
    setUsuario(perfil)
    setEstado('autenticado')
  }, [queryClient])

  const cerrarSesion = useCallback(async () => {
    await cerrarSesionSinEspera(() => authService.logout(), limpiarSesion)
  }, [limpiarSesion])

  // Control de inactividad de 1 hora (60 minutos)
  useEffect(() => {
    if (estado !== 'autenticado') return

    let ultimoRegistro = Date.now()
    const INTERVALO_VERIFICACION_MS = 30_000 // cada 30 segundos
    const THROTTLE_ACTIVIDAD_MS = 15_000 // actualizar storage como maximo cada 15s

    const alDetectarActividad = () => {
      const ahora = Date.now()
      if (ahora - ultimoRegistro > THROTTLE_ACTIVIDAD_MS) {
        ultimoRegistro = ahora
        registrarActividad()
      }
    }

    const verificarInactividad = () => {
      if (haCaducadoPorInactividad()) {
        marcarCierrePorInactividad()
        toast.warning('Su sesión ha caducado por inactividad (1 hora). Ingrese nuevamente.', {
          id: 'sesion-inactiva',
          duration: 8000,
        })
        void cerrarSesion()
      }
    }

    const eventos: (keyof WindowEventMap)[] = [
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'mousemove',
    ]
    eventos.forEach((evt) => window.addEventListener(evt, alDetectarActividad, { passive: true }))

    const alCambiarVisibilidad = () => {
      if (document.visibilityState === 'visible') {
        verificarInactividad()
      }
    }
    document.addEventListener('visibilitychange', alCambiarVisibilidad)
    window.addEventListener('focus', alCambiarVisibilidad)

    const timer = setInterval(verificarInactividad, INTERVALO_VERIFICACION_MS)

    return () => {
      eventos.forEach((evt) => window.removeEventListener(evt, alDetectarActividad))
      document.removeEventListener('visibilitychange', alCambiarVisibilidad)
      window.removeEventListener('focus', alCambiarVisibilidad)
      clearInterval(timer)
    }
  }, [estado, cerrarSesion])

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
