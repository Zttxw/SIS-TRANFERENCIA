import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import * as dashboardService from './dashboard.service'
import type { RemitirEntregaPayload, RevisarEntregaPayload } from '@/types/transferencia'

export function useEstadoEntrega(dependenciaId: number | null) {
  return useQuery({
    queryKey: ['transferencia', 'estado', dependenciaId],
    queryFn: () => dashboardService.obtenerEstadoEntrega(dependenciaId!),
    enabled: typeof dependenciaId === 'number' && dependenciaId > 0,
  })
}

export function useResumenDocumentos(dependenciaId: number | null) {
  return useQuery({
    queryKey: ['documentos-pendientes', 'resumen', dependenciaId],
    queryFn: () => dashboardService.obtenerResumenDocumentos(dependenciaId!),
    enabled: typeof dependenciaId === 'number' && dependenciaId > 0,
  })
}

export function useRemitirEntrega() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: RemitirEntregaPayload) =>
      dashboardService.remitirEntrega(payload),
    onSuccess: (_, variables) => {
      toast.success('Entrega remitida con éxito al nivel superior.')
      queryClient.invalidateQueries({
        queryKey: ['transferencia', 'estado', variables.dependencia_id],
      })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al remitir la entrega.')
    },
  })
}

export function useRevisarEntrega() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: RevisarEntregaPayload) =>
      dashboardService.revisarEntrega(payload),
    onSuccess: (_, variables) => {
      const accion =
        variables.accion === 'consolidar' ? 'consolidada' : 'observada'
      toast.success(`Entrega ${accion} correctamente.`)
      queryClient.invalidateQueries({
        queryKey: ['transferencia', 'estado', variables.dependencia_id],
      })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al revisar la entrega.')
    },
  })
}
