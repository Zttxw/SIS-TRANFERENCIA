import { QueryClient } from '@tanstack/react-query'

import { ApiError } from '@/types/api'

/**
 * Cliente de TanStack Query. No reintentar en errores de autorización/validación
 * (401/403/409/422): reintentar no cambia el resultado y solo retrasa el
 * feedback. Reintentar una vez el resto (fallos de red transitorios).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (fallos, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false
        }
        return fallos < 1
      },
    },
    mutations: {
      retry: false,
    },
  },
})
