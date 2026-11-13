import { api } from '@/lib/api'
import type { ApiPaginated, ApiSuccess } from '@/types/api'

/** Rol asignado a una cuenta, con la dependencia de su ámbito si la tiene. */
export interface RolAsignado {
  id: number
  rol: string
  dependencia_id: number | null
  dependencia?: { id: number; codigo: string; nombre: string } | null
}

/** Cuenta del sistema (de padrón SGD o externa) con sus roles. */
export interface CuentaUsuario {
  id: number
  dni: string | null
  name: string
  email: string | null
  activo: boolean
  servidor_id: number | null
  servidor?: {
    id: number
    dni: string
    dependencia?: { id: number; codigo: string; nombre: string } | null
  } | null
  asignaciones_rol: RolAsignado[]
}

/** Rol que el panel puede asignar, con su etiqueta y si exige dependencia. */
export interface RolAsignable {
  rol: string
  etiqueta: string
  requiere_dependencia: boolean
}

export interface CrearExternoPayload {
  dni: string
  name: string
  email?: string | null
  password: string
  rol?: string | null
  dependencia_id?: number | null
}

export const usuariosService = {
  async listar(buscar: string, page: number) {
    const params: Record<string, string | number> = { page }
    if (buscar.trim() !== '') params.buscar = buscar.trim()
    const { data } = await api.get<ApiPaginated<CuentaUsuario>>('/usuarios', {
      params,
    })
    return data
  },
  async rolesAsignables() {
    const { data } =
      await api.get<ApiSuccess<RolAsignable[]>>('/usuarios/roles-asignables')
    return data.data
  },
  async crearExterno(payload: CrearExternoPayload) {
    await api.post('/usuarios/externos', payload)
  },
  async asignarRol(
    userId: number,
    payload: { rol: string; dependencia_id?: number | null },
  ) {
    await api.post(`/usuarios/${userId}/roles`, payload)
  },
  async revocarRol(asignacionId: number) {
    await api.delete(`/usuarios/roles/${asignacionId}`)
  },
}
