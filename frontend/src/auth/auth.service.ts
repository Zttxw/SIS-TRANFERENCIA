/**
 * Servicio de autenticación — llamadas a `/auth/*` sobre el cliente axios.
 * Desenvuelve el wrapper `ApiResponse` y devuelve el payload tipado (plan §3).
 */

import { api } from '@/lib/api'
import type { ApiSuccess } from '@/types/api'
import type { LoginPayload, LoginResponse, Usuario } from '@/types/auth'

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await api.post<ApiSuccess<LoginResponse>>(
    '/auth/login',
    payload,
  )
  return data.data
}

export async function me(): Promise<Usuario> {
  const { data } = await api.get<ApiSuccess<Usuario>>('/auth/me')
  return data.data
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout')
}
