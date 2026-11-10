import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

import { actaService } from './acta.service'

export const ACTA_QUERY_KEY = 'acta'

export function useActa(dependenciaId?: number | null) {
  return useQuery({
    queryKey: [ACTA_QUERY_KEY, dependenciaId],
    queryFn: () => {
      if (!dependenciaId) throw new Error('Dependencia no seleccionada')
      return actaService.obtenerActa(dependenciaId)
    },
    enabled: typeof dependenciaId === 'number' && dependenciaId > 0,
    retry: (failureCount, error) => {
      // No reintentar en 403 Forbidden (fuera de ámbito / sin permiso).
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        return false
      }
      return failureCount < 2
    },
  })
}
