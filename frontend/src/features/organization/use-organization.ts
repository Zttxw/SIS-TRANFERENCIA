import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'
import type { ApiSuccess } from '@/types/api'
import type { DependenciaResumen } from '@/types/transferencia'

/** Catálogo completo de dependencias activas (para el árbol organizacional). */
export function useCatalogoDependencias() {
  return useQuery({
    queryKey: ['dependencias', 'arbol-completo'],
    queryFn: async () => {
      const res = await api.get<ApiSuccess<DependenciaResumen[]>>('/dependencias', {
        params: { all: true, solo_activas: true, solo_ambito: false },
      })
      return res.data.data
    },
    staleTime: 1000 * 60 * 5,
  })
}
