import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import type { FiltrosDocumentos, GuardarDocumentoPayload } from '@/types/documentos'
import { documentosService } from './documentos.service'

export function useDocumentos(filtros: FiltrosDocumentos = {}) {
  return useQuery({
    queryKey: ['documentos-pendientes', filtros],
    queryFn: () => documentosService.listar(filtros),
    enabled: Boolean(filtros.dependencia_id),
    staleTime: 1000 * 30,
  })
}

export function useResumenDocumentosPendientes(dependenciaId?: number | null) {
  return useQuery({
    queryKey: ['documentos-pendientes-resumen', dependenciaId],
    queryFn: () => (dependenciaId ? documentosService.obtenerResumen(dependenciaId) : null),
    enabled: Boolean(dependenciaId),
    staleTime: 1000 * 30,
  })
}

export function useCrearDocumento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: GuardarDocumentoPayload) => documentosService.crear(payload),
    onSuccess: (_, vars) => {
      toast.success('Documento pendiente registrado con éxito.')
      queryClient.invalidateQueries({ queryKey: ['documentos-pendientes'] })
      queryClient.invalidateQueries({ queryKey: ['documentos-pendientes-resumen', vars.dependencia_id] })
      queryClient.invalidateQueries({ queryKey: ['transferencia-estado', vars.dependencia_id] })
    },
    onError: (error: any) => {
      if (error?.status === 409 || error?.response?.status === 409) {
        toast.error('No se puede registrar: la entrega está bloqueada (remitida o consolidada).')
        return
      }
      const msg = error?.response?.data?.message ?? 'Error al registrar el documento.'
      toast.error(msg)
    },
  })
}

export function useActualizarDocumento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: GuardarDocumentoPayload }) =>
      documentosService.actualizar(id, payload),
    onSuccess: (_, vars) => {
      toast.success('Documento pendiente actualizado.')
      queryClient.invalidateQueries({ queryKey: ['documentos-pendientes'] })
      queryClient.invalidateQueries({ queryKey: ['documentos-pendientes-resumen', vars.payload.dependencia_id] })
      queryClient.invalidateQueries({ queryKey: ['transferencia-estado', vars.payload.dependencia_id] })
    },
    onError: (error: any) => {
      if (error?.status === 409 || error?.response?.status === 409) {
        toast.error('No se puede actualizar: la entrega está bloqueada (remitida o consolidada).')
        return
      }
      const msg = error?.response?.data?.message ?? 'Error al actualizar el documento.'
      toast.error(msg)
    },
  })
}

export function useEliminarDocumento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => documentosService.eliminar(id),
    onSuccess: () => {
      toast.success('Documento eliminado del Anexo 01.')
      queryClient.invalidateQueries({ queryKey: ['documentos-pendientes'] })
      queryClient.invalidateQueries({ queryKey: ['documentos-pendientes-resumen'] })
      queryClient.invalidateQueries({ queryKey: ['transferencia-estado'] })
    },
    onError: (error: any) => {
      if (error?.status === 409 || error?.response?.status === 409) {
        toast.error('No se puede eliminar: la entrega está bloqueada (remitida o consolidada).')
        return
      }
      const msg = error?.response?.data?.message ?? 'Error al eliminar el documento.'
      toast.error(msg)
    },
  })
}

