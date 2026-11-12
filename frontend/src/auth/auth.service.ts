/**
 * Servicio de autenticación — llamadas a `/auth/*` sobre el cliente axios.
 * Desenvuelve el wrapper `ApiResponse` y devuelve el payload tipado (plan §3).
 */

import { api } from '@/lib/api'
import { obtenerToken } from '@/lib/token'
import type { ApiSuccess } from '@/types/api'
import type { LoginPayload, LoginResponse, Usuario } from '@/types/auth'

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await api.post<ApiSuccess<LoginResponse>>(
    '/auth/login',
    payload,
    { timeout: 15000 },
  )
  return data.data
}

export async function me(signal?: AbortSignal): Promise<Usuario> {
  const { data } = await api.get<ApiSuccess<Usuario>>('/auth/me', { signal, timeout: 15000 })
  return data.data
}

export async function logout(token = obtenerToken()): Promise<void> {
  if (!token) return
  await api.post('/auth/logout', undefined, { timeout: 5000, headers: { Authorization: `Bearer ${token}` } })
}
