import { useQuery } from '@tanstack/react-query'
import { firmaperuService } from './firmaperu.service'

export function useRequisitosRemision(dependenciaId: number | null, enabled = true) {
  return useQuery({
    queryKey: ['requisitos-remision', dependenciaId],
    queryFn: ({ signal }) => firmaperuService.requisitosRemision(dependenciaId!, signal),
    enabled: Boolean(dependenciaId) && enabled,
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: false,
  })
}
