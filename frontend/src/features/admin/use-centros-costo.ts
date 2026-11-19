import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { notificarError } from '@/lib/api-errors'
import { centrosCostoService, type FiltrosEquivalencias } from './centros-costo.service'

export const CENTROS_COSTO_QUERY_KEY = 'centros-costo-anexo01'
export const EQUIVALENCIAS_QUERY_KEY = 'equivalencias-centro-costo'

export function useCentrosCosto() {
  return useQuery({
    queryKey: [CENTROS_COSTO_QUERY_KEY],
    queryFn: centrosCostoService.listarCentros,
    staleTime: 5 * 60 * 1000,
  })
}

export function useEquivalencias(filtros: FiltrosEquivalencias) {
  return useQuery({
    queryKey: [EQUIVALENCIAS_QUERY_KEY, filtros],
    queryFn: () => centrosCostoService.listarEquivalencias(filtros),
    placeholderData: (prev) => prev,
  })
}

export function useAsignarEquivalencia() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: ({ id, centroCostoId, esPrincipal }: { id: number; centroCostoId: number | null; esPrincipal: boolean }) =>
      centrosCostoService.asignar(id, centroCostoId, esPrincipal),
    onSuccess: async () => {
      await Promise.all([
        cliente.invalidateQueries({ queryKey: [EQUIVALENCIAS_QUERY_KEY] }),
        cliente.invalidateQueries({ queryKey: [CENTROS_COSTO_QUERY_KEY] }),
      ])
      toast.success('Equivalencia guardada. Ejecute la reasignación para trasladar los registros existentes.')
    },
    onError: (error) => notificarError(error),
  })
}
