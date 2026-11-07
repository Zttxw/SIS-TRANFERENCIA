import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import type { FiltrosNoPatrimonial, GuardarBienNoPatrimonialPayload } from '@/types/nopatrimonial'
import { noPatrimonialService } from './nopatrimonial.service'

export function useNoPatrimonial(filtros: FiltrosNoPatrimonial = {}) {
  return useQuery({
    queryKey: ['bienes-no-patrimoniales', filtros],
    queryFn: () => noPatrimonialService.listar(filtros),
    enabled: Boolean(filtros.dependencia_id),
    staleTime: 1000 * 30,
  })
}

export function useCrearBienNoPatrimonial() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: GuardarBienNoPatrimonialPayload) =>
      noPatrimonialService.crear(payload),
    onSuccess: (_, vars) => {
      toast.success('Bien no patrimonial registrado en el Anexo 06.')
      queryClient.invalidateQueries({ queryKey: ['bienes-no-patrimoniales'] })
      queryClient.invalidateQueries({ queryKey: ['transferencia-estado', vars.dependencia_id] })
    },
    onError: (error: any) => {
      if (error?.status === 409 || error?.response?.status === 409) {
        toast.error('No se puede registrar: la entrega está bloqueada (remitida o consolidada).')
        return
      }
      const msg = error?.response?.data?.message ?? 'Error al registrar el bien.'
      toast.error(msg)
    },
  })
}

export function useActualizarBienNoPatrimonial() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: GuardarBienNoPatrimonialPayload }) =>
      noPatrimonialService.actualizar(id, payload),
    onSuccess: (_, vars) => {
      toast.success('Bien no patrimonial actualizado.')
      queryClient.invalidateQueries({ queryKey: ['bienes-no-patrimoniales'] })
      queryClient.invalidateQueries({ queryKey: ['transferencia-estado', vars.payload.dependencia_id] })
    },
    onError: (error: any) => {
      if (error?.status === 409 || error?.response?.status === 409) {
        toast.error('No se puede actualizar: la entrega está bloqueada (remitida o consolidada).')
        return
      }
      const msg = error?.response?.data?.message ?? 'Error al actualizar el bien.'
      toast.error(msg)
    },
  })
}

export function useEliminarBienNoPatrimonial() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => noPatrimonialService.eliminar(id),
    onSuccess: () => {
      toast.success('Bien retirado del Anexo 06.')
      queryClient.invalidateQueries({ queryKey: ['bienes-no-patrimoniales'] })
      queryClient.invalidateQueries({ queryKey: ['transferencia-estado'] })
    },
    onError: (error: any) => {
      if (error?.status === 409 || error?.response?.status === 409) {
        toast.error('No se puede eliminar: la entrega está bloqueada (remitida o consolidada).')
        return
      }
      const msg = error?.response?.data?.message ?? 'Error al eliminar el bien.'
      toast.error(msg)
    },
  })
}

