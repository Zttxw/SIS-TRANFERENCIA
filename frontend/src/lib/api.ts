/**
 * Cliente axios central (plan §3, §4, E1).
 *
 * - baseURL `/api`: en dev el proxy de Vite lo redirige al backend Laravel
 *   (vite.config.ts), evitando CORS. En prod se sirve tras el mismo origen o
 *   se ajusta con VITE_API_URL.
 * - Interceptor de petición: inyecta `Authorization: Bearer <token>`.
 * - Interceptor de respuesta: normaliza cualquier error a `ApiError`
 *   (401/403/409/422 + red), para que la UI reaccione de forma uniforme.
 */

import axios, { AxiosError, type AxiosInstance } from 'axios'

import { ApiError, type ApiErrorBody } from '@/types/api'

import { limpiarToken, obtenerToken } from './token'
import { perteneceASesionActual } from '@/auth/sesion-runtime'

const baseURL = import.meta.env.VITE_API_URL ?? '/api'

export const api: AxiosInstance = axios.create({
  baseURL,
  headers: { Accept: 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = obtenerToken()
  if (token && !config.headers.has('Authorization')) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/**
 * Callback que el contexto de auth registra para reaccionar a un 401 global
 * (limpiar sesión en memoria y redirigir). Se mantiene desacoplado para no
 * importar React aquí.
 */
let alCaducarSesion: (() => void) | null = null

export function registrarManejadorSesionCaducada(fn: () => void): void {
  alCaducarSesion = fn
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    // Error de red / sin respuesta del servidor.
    if (!error.response) {
      return Promise.reject(
        new ApiError({
          status: 0,
          message:
            'No se pudo conectar con el servidor. Verifica tu conexión o que el backend esté activo.',
          isNetworkError: true,
        }),
      )
    }

    const { status, data } = error.response
    const message =
      data?.message ?? error.message ?? 'Ocurrió un error inesperado.'

    if (status === 401 && perteneceASesionActual(error.config?.headers.get('Authorization'), obtenerToken())) {
      limpiarToken()
      alCaducarSesion?.()
    }

    return Promise.reject(
      new ApiError({
        status,
        message,
        errors: data?.errors,
        data,
      }),
    )
  },
)
