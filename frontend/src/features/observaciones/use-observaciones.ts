import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import type { FiltrosObservaciones, RegistrarObservacionPayload } from '@/types/observaciones'
import { observacionesService } from './observaciones.service'

export function useObservaciones(filtros: FiltrosObservaciones = {}, habilitado = true) {
  return useQuery({
    queryKey: ['observaciones', filtros],
    queryFn: () => observacionesService.listar(filtros),
    staleTime: 1000 * 30,
    enabled: habilitado,
  })
}

function invalidar(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['observaciones'] })
  queryClient.invalidateQueries({ queryKey: ['transferencia-estado'] })
  queryClient.invalidateQueries({ queryKey: ['dashboard'] })
}

export function useRegistrarObservacion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: RegistrarObservacionPayload) => observacionesService.registrar(payload),
    onSuccess: () => {
      toast.success('Observación registrada como constancia.')
      invalidar(queryClient)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? 'No se pudo registrar la observación.')
    },
  })
}

export function useRetirarObservacion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => observacionesService.retirar(id),
    onSuccess: () => {
      toast.success('Observación retirada.')
      invalidar(queryClient)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? 'No se pudo retirar la observación.')
    },
  })
}
