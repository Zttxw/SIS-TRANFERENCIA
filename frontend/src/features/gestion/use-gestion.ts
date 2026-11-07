import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import type { GuardarInformeGestionPayload } from '@/types/gestion'
import { gestionService } from './gestion.service'

export function useInformeGestion(dependenciaId?: number | null) {
  return useQuery({
    queryKey: ['informe-gestion', dependenciaId],
    queryFn: () => (dependenciaId ? gestionService.obtenerInforme(dependenciaId) : null),
    enabled: Boolean(dependenciaId),
    staleTime: 1000 * 30,
  })
}

export function useGuardarInformeGestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: GuardarInformeGestionPayload) =>
      gestionService.guardarInforme(payload),
    onSuccess: (data) => {
      const estado = data.estado === 'completado' ? 'completado' : 'guardado en borrador'
      toast.success(`Informe de gestión ${estado} con éxito.`)
      queryClient.invalidateQueries({ queryKey: ['informe-gestion', data.dependencia_id] })
      queryClient.invalidateQueries({ queryKey: ['transferencia-estado', data.dependencia_id] })
    },
    onError: (error: any) => {
      if (error?.status === 409 || error?.response?.status === 409) {
        toast.error(
          'No se puede editar: los anexos ya fueron remitidos y la entrega está bloqueada.',
        )
        return
      }
      const mensaje =
        error?.response?.data?.message ??
        error?.message ??
        'Error al guardar el informe de gestión.'
      toast.error(mensaje)
    },
  })
}
