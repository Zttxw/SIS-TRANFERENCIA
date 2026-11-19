import { ApiError } from '@/types/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import * as dashboardService from './dashboard.service'
import type { RemitirEntregaPayload } from '@/types/transferencia'

export function useTableroOperativo() {
  return useQuery({
    queryKey: ['transferencia', 'tablero'],
    queryFn: () => dashboardService.obtenerTableroOperativo(),
    refetchInterval: 60000,
  })
}

export function useEstadoEntrega(dependenciaId: number | null) {
  return useQuery({
    queryKey: ['transferencia-estado', dependenciaId],
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
      toast.success('Entrega remitida.')
      queryClient.invalidateQueries({
        queryKey: ['transferencia-estado', variables.dependencia_id],
      })
      queryClient.invalidateQueries({ queryKey: ['transferencia', 'tablero'] })
      queryClient.invalidateQueries({ queryKey: ['entregas'] })
    },
    onError: (error: Error) => {
      // Los hijos pendientes se muestran en el diálogo para confirmar (D-08).
      if (error instanceof ApiError && error.errors?.hijos_pendientes) return
      toast.error(error.message || 'Error al remitir la entrega.')
    },
  })
}

