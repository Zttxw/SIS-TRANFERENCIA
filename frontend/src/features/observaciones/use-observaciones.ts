import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import type {
  FiltrosObservaciones,
  RegistrarObservacionPayload,
  SubsanarObservacionPayload,
} from '@/types/observaciones'
import { observacionesService } from './observaciones.service'

export function useObservaciones(filtros: FiltrosObservaciones = {}) {
  return useQuery({
    queryKey: ['observaciones', filtros],
    queryFn: () => observacionesService.listar(filtros),
    staleTime: 1000 * 30,
  })
}

function invalidarTodoElDominio(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['observaciones'] })
  queryClient.invalidateQueries({ queryKey: ['transferencia-estado'] })
  queryClient.invalidateQueries({ queryKey: ['informe-gestion'] })
  queryClient.invalidateQueries({ queryKey: ['documentos'] })
  queryClient.invalidateQueries({ queryKey: ['acervo'] })
  queryClient.invalidateQueries({ queryKey: ['patrimonio'] })
  queryClient.invalidateQueries({ queryKey: ['personal'] })
  queryClient.invalidateQueries({ queryKey: ['nopatrimonial'] })
}

export function useRegistrarObservacion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: RegistrarObservacionPayload) =>
      observacionesService.registrar(payload),
    onSuccess: () => {
      toast.success('Observación registrada con éxito.')
      invalidarTodoElDominio(queryClient)
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message ?? 'No se pudo registrar la observación.'
      toast.error(msg)
    },
  })
}

export function useSubsanarObservacion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SubsanarObservacionPayload) =>
      observacionesService.subsanar(payload),
    onSuccess: () => {
      toast.success(
        'Observación subsanada. Si era la última observación pendiente, la entrega se re-remite automáticamente.',
      )
      invalidarTodoElDominio(queryClient)
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message ?? 'No se pudo subsanar la observación.'
      toast.error(msg)
    },
  })
}

export function useDesestimarObservacion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => observacionesService.desestimar(id),
    onSuccess: () => {
      toast.success('Observación desestimada.')
      invalidarTodoElDominio(queryClient)
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message ?? 'No se pudo desestimar la observación.'
      toast.error(msg)
    },
  })
}
