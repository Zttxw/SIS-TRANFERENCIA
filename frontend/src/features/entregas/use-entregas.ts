import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import type {
  FiltrosEntregas,
  RemitirEntregaPayload,
  RevisarEntregaPayload,
} from '@/types/transferencia'
import { entregasService } from './entregas.service'

export function useEntregas(filtros: FiltrosEntregas = {}) {
  return useQuery({
    queryKey: ['entregas', filtros],
    queryFn: () => entregasService.listarEntregas(filtros),
    staleTime: 1000 * 20,
  })
}

export function useCatalogoDependencias() {
  return useQuery({
    queryKey: ['dependencias', 'arbol-completo'],
    queryFn: () => entregasService.listarCatalogoDependencias(),
    staleTime: 1000 * 60 * 5,
  })
}

export function useEstadoEntrega(dependenciaId?: number | null) {
  return useQuery({
    queryKey: ['transferencia-estado', dependenciaId],
    queryFn: () => entregasService.obtenerEstadoEntrega(dependenciaId!),
    enabled: Boolean(dependenciaId),
    staleTime: 1000 * 30,
  })
}

export function useRemitirEntrega() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: RemitirEntregaPayload) => entregasService.remitirEntrega(payload),
    onSuccess: () => {
      toast.success('Entrega remitida con éxito al superior jerárquico.')
      queryClient.invalidateQueries({ queryKey: ['entregas'] })
      queryClient.invalidateQueries({ queryKey: ['transferencia-estado'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message ?? 'No se pudo remitir la entrega.'
      toast.error(msg)
    },
  })
}

export function useRevisarEntrega() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: RevisarEntregaPayload) => entregasService.revisarEntrega(payload),
    onSuccess: (_data, variables) => {
      const accion = variables.accion === 'consolidar' ? 'consolidada' : 'observada'
      toast.success(`Entrega ${accion} con éxito.`)
      queryClient.invalidateQueries({ queryKey: ['entregas'] })
      queryClient.invalidateQueries({ queryKey: ['transferencia-estado'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['observaciones'] })
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message ?? 'No se pudo procesar la revisión de la entrega.'
      toast.error(msg)
    },
  })
}

