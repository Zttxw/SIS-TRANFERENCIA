import { useQuery } from '@tanstack/react-query'

import * as dashboardService from './dashboard.service'

export function useTableroOperativo() {
  return useQuery({
    queryKey: ['transferencia', 'tablero'],
    queryFn: () => dashboardService.obtenerTableroOperativo(),
    refetchInterval: 60000,
  })
}

/** Avance de los anexos de una dependencia (para el dashboard de «mi entrega»). */
export function useEstadoEntrega(dependenciaId: number | null) {
  return useQuery({
    queryKey: ['transferencia', 'estado', dependenciaId],
    queryFn: () => dashboardService.obtenerEstadoEntrega(dependenciaId!),
    enabled: typeof dependenciaId === 'number' && dependenciaId > 0,
  })
}
