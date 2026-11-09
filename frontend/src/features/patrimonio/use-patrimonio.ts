import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import type { FiltrosPatrimonio, VerificarBienPayload } from '@/types/patrimonio'
import { patrimonioService } from './patrimonio.service'

export function useBienesPatrimoniales(filtros: FiltrosPatrimonio = {}) {
  return useQuery({
    queryKey: ['bienes-patrimoniales', filtros],
    queryFn: () => patrimonioService.listarBienes(filtros),
    staleTime: 1000 * 30,
  })
}

export function useResumenPatrimonial(dependenciaId?: number | null) {
  return useQuery({
    queryKey: ['patrimonio-resumen', dependenciaId],
    queryFn: () => patrimonioService.obtenerResumen(dependenciaId),
    staleTime: 1000 * 30,
  })
}

export function useVerificarBien() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: VerificarBienPayload }) =>
      patrimonioService.verificarBien(id, payload),
    onSuccess: (data) => {
      const label =
        data.verificacion?.estado === 'confirmado'
          ? 'Bien confirmado en campo'
          : data.verificacion?.estado === 'no_ubicado'
            ? 'Bien registrado como no ubicado'
            : 'Observación física registrada'
      toast.success(label)
      queryClient.invalidateQueries({ queryKey: ['bienes-patrimoniales'] })
      queryClient.invalidateQueries({ queryKey: ['patrimonio-resumen'] })
      queryClient.invalidateQueries({ queryKey: ['transferencia-estado'] })
    },
    onError: (error: any) => {
      if (error?.status === 409 || error?.response?.status === 409) {
        toast.error('No se puede verificar: la entrega de esta dependencia está congelada/consolidada.')
        return
      }
      const msg = error?.response?.data?.message ?? 'Error al registrar la verificación física.'
      toast.error(msg)
    },
  })
}

