import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { notificarError } from '@/lib/api-errors'
import {
  usuariosService,
  type CrearExternoPayload,
} from './usuarios.service'

export const USUARIOS_QUERY_KEY = 'usuarios-gestion'
export const ROLES_ASIGNABLES_QUERY_KEY = 'roles-asignables'

export function useUsuarios(buscar: string, page: number) {
  return useQuery({
    queryKey: [USUARIOS_QUERY_KEY, buscar, page],
    queryFn: () => usuariosService.listar(buscar, page),
    placeholderData: (prev) => prev,
  })
}

export function useRolesAsignables(enabled = true) {
  return useQuery({
    queryKey: [ROLES_ASIGNABLES_QUERY_KEY],
    queryFn: usuariosService.rolesAsignables,
    enabled,
    staleTime: Infinity,
  })
}

export function useCrearExterno() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: (payload: CrearExternoPayload) =>
      usuariosService.crearExterno(payload),
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: [USUARIOS_QUERY_KEY] })
      toast.success('Usuario externo creado.')
    },
    onError: (error) => notificarError(error),
  })
}

export function useAsignarRol() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: ({
      userId,
      rol,
      dependencia_id,
    }: {
      userId: number
      rol: string
      dependencia_id?: number | null
    }) => usuariosService.asignarRol(userId, { rol, dependencia_id }),
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: [USUARIOS_QUERY_KEY] })
      toast.success('Rol asignado.')
    },
    onError: (error) => notificarError(error),
  })
}

export function useRevocarRol() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: (asignacionId: number) =>
      usuariosService.revocarRol(asignacionId),
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: [USUARIOS_QUERY_KEY] })
      toast.success('Rol revocado.')
    },
    onError: (error) => notificarError(error),
  })
}
