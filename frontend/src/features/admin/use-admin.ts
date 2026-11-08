import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import axios from 'axios'

import { adminService } from './admin.service'
import type { ActivarCuentaPayload, FiltrosServidores } from '@/types/admin'

export const SERVIDORES_QUERY_KEY = 'servidores'
export const PREPARAR_ACTIVACION_QUERY_KEY = 'preparar-activacion'

export function useServidores(filtros?: FiltrosServidores) {
  return useQuery({
    queryKey: [SERVIDORES_QUERY_KEY, filtros?.buscar ?? '', filtros?.page ?? 1],
    queryFn: () => adminService.listarServidores(filtros),
    placeholderData: (prev) => prev,
  })
}

export function usePrepararActivacion(servidorId: number | null) {
  return useQuery({
    queryKey: [PREPARAR_ACTIVACION_QUERY_KEY, servidorId],
    queryFn: () => {
      if (!servidorId) throw new Error('Servidor no especificado')
      return adminService.prepararActivacion(servidorId)
    },
    enabled: typeof servidorId === 'number' && servidorId > 0,
    retry: false,
  })
}

export function useActivarCuenta() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      servidorId,
      payload,
    }: {
      servidorId: number
      payload: ActivarCuentaPayload
    }) => adminService.activarCuenta(servidorId, payload),
    onSuccess: (data) => {
      toast.success(`Cuenta de acceso activada con éxito para ${data.nombre} (DNI ${data.dni})`)
      queryClient.invalidateQueries({ queryKey: [SERVIDORES_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [PREPARAR_ACTIVACION_QUERY_KEY] })
    },
    onError: (error) => {
      let mensaje = 'Error al activar la cuenta'
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        mensaje = error.response.data.message
      }
      toast.error(mensaje)
    },
  })
}

