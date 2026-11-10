import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { notificarError } from '@/lib/api-errors'
import type { FiltrosNoPatrimonial, GuardarBienNoPatrimonialPayload } from '@/types/nopatrimonial'
import { noPatrimonialService } from './nopatrimonial.service'

const CONFLICTO =
  'No se puede guardar: la entrega de este centro de costo está bloqueada (remitida o consolidada).'

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
    onError: (error) => notificarError(error, { conflicto: CONFLICTO }),
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
    onError: (error) => notificarError(error, { conflicto: CONFLICTO }),
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
    onError: (error) =>
      notificarError(error, {
        conflicto: 'No se puede eliminar: la entrega está bloqueada (remitida o consolidada).',
      }),
  })
}

