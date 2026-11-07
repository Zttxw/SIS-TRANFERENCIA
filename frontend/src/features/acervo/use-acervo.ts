import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import type { FiltrosAcervo, GuardarAcervoPayload } from '@/types/acervo'
import { acervoService } from './acervo.service'

export function useAcervo(filtros: FiltrosAcervo = {}) {
  return useQuery({
    queryKey: ['acervo-documental', filtros],
    queryFn: () => acervoService.listar(filtros),
    enabled: Boolean(filtros.dependencia_id),
    staleTime: 1000 * 30,
  })
}

export function useCrearAcervo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: GuardarAcervoPayload) => acervoService.crear(payload),
    onSuccess: (_, vars) => {
      toast.success('Serie de acervo documental registrada.')
      queryClient.invalidateQueries({ queryKey: ['acervo-documental'] })
      queryClient.invalidateQueries({ queryKey: ['transferencia-estado', vars.dependencia_id] })
    },
    onError: (error: any) => {
      if (error?.status === 409 || error?.response?.status === 409) {
        toast.error('No se puede registrar: la entrega está bloqueada (remitida o consolidada).')
        return
      }
      const msg = error?.response?.data?.message ?? 'Error al registrar el acervo.'
      toast.error(msg)
    },
  })
}

export function useActualizarAcervo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: GuardarAcervoPayload }) =>
      acervoService.actualizar(id, payload),
    onSuccess: (_, vars) => {
      toast.success('Registro de acervo documental actualizado.')
      queryClient.invalidateQueries({ queryKey: ['acervo-documental'] })
      queryClient.invalidateQueries({ queryKey: ['transferencia-estado', vars.payload.dependencia_id] })
    },
    onError: (error: any) => {
      if (error?.status === 409 || error?.response?.status === 409) {
        toast.error('No se puede actualizar: la entrega está bloqueada (remitida o consolidada).')
        return
      }
      const msg = error?.response?.data?.message ?? 'Error al actualizar el acervo.'
      toast.error(msg)
    },
  })
}

export function useEliminarAcervo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => acervoService.eliminar(id),
    onSuccess: () => {
      toast.success('Registro de acervo eliminado.')
      queryClient.invalidateQueries({ queryKey: ['acervo-documental'] })
      queryClient.invalidateQueries({ queryKey: ['transferencia-estado'] })
    },
    onError: (error: any) => {
      if (error?.status === 409 || error?.response?.status === 409) {
        toast.error('No se puede eliminar: la entrega está bloqueada (remitida o consolidada).')
        return
      }
      const msg = error?.response?.data?.message ?? 'Error al eliminar el acervo.'
      toast.error(msg)
    },
  })
}

