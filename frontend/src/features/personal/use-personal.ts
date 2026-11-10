import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { notificarError } from '@/lib/api-errors'
import type { FiltrosPersonal, GuardarPersonalPayload } from '@/types/personal'
import { personalService } from './personal.service'

const CONFLICTO =
  'No se puede modificar: la entrega de este centro de costo está bloqueada (remitida o consolidada).'

export function usePersonal(filtros: FiltrosPersonal = {}) {
  return useQuery({
    queryKey: ['personal-asignado', filtros],
    queryFn: () => personalService.listar(filtros),
    enabled: Boolean(filtros.dependencia_id),
    staleTime: 1000 * 30,
  })
}

export function useGuardarPersonal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: GuardarPersonalPayload) => personalService.guardar(payload),
    onSuccess: (_, vars) => {
      toast.success('Servidor registrado / actualizado en el Anexo 05.')
      queryClient.invalidateQueries({ queryKey: ['personal-asignado'] })
      queryClient.invalidateQueries({ queryKey: ['transferencia-estado', vars.dependencia_id] })
    },
    onError: (error) => notificarError(error, { conflicto: CONFLICTO }),
  })
}

export function useEliminarPersonal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => personalService.eliminar(id),
    onSuccess: () => {
      toast.success('Servidor retirado de la relación del Anexo 05.')
      queryClient.invalidateQueries({ queryKey: ['personal-asignado'] })
      queryClient.invalidateQueries({ queryKey: ['transferencia-estado'] })
    },
    onError: (error) =>
      notificarError(error, {
        conflicto: 'No se puede eliminar: la entrega está bloqueada (remitida o consolidada).',
      }),
  })
}

