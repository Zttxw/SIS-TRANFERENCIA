import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import axios from 'axios'

import { actaService } from './acta.service'
import type { SubirEvidenciaPayload } from '@/types/acta'

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
      // No reintentar en 409 Conflict (estado no consolidado) ni en 403 Forbidden
      if (axios.isAxiosError(error) && (error.response?.status === 409 || error.response?.status === 403)) {
        return false
      }
      return failureCount < 2
    },
  })
}

export function useSubirEvidencia() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SubirEvidenciaPayload) => actaService.subirEvidencia(payload),
    onSuccess: () => {
      toast.success('Documento / evidencia adjunta subida con éxito')
      queryClient.invalidateQueries({ queryKey: [ACTA_QUERY_KEY] })
    },
    onError: (error) => {
      const mensaje = axios.isAxiosError(error)
        ? error.response?.data?.message || 'Error al subir la evidencia'
        : 'Error al subir la evidencia'
      toast.error(mensaje)
    },
  })
}

export function useDescargarEvidencia() {
  return useMutation({
    mutationFn: ({ id, nombreArchivo }: { id: number; nombreArchivo: string }) =>
      actaService.descargarEvidencia(id, nombreArchivo),
    onError: (error) => {
      const mensaje = axios.isAxiosError(error)
        ? error.response?.data?.message || 'Error al descargar la evidencia'
        : 'Error al descargar el archivo'
      toast.error(mensaje)
    },
  })
}
