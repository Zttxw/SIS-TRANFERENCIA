import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { notificarError } from '@/lib/api-errors'
import type { ApiPaginated } from '@/types/api'
import type { BienPatrimonial, FiltrosPatrimonio, VerificarBienPayload } from '@/types/patrimonio'
import { patrimonioService } from './patrimonio.service'

export function useBienesPatrimoniales(filtros: FiltrosPatrimonio = {}) {
  return useQuery({
    queryKey: ['bienes-patrimoniales', filtros],
    queryFn: ({ signal }) => patrimonioService.listarBienes(filtros, signal),
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
    onSuccess: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['bienes-patrimoniales'] })
      queryClient.setQueriesData<ApiPaginated<BienPatrimonial>>(
        { queryKey: ['bienes-patrimoniales'] },
        (actual) => actual && ({
          ...actual,
          data: actual.data.map((bien) => bien.id === data.id ? data : bien),
        }),
      )
      const label =
        data.verificacion?.estado === 'confirmado'
          ? 'Bien confirmado en campo'
          : data.verificacion?.estado === 'no_ubicado'
            ? 'Bien registrado como no ubicado'
            : 'Observación física registrada'
      toast.success(label)
      queryClient.invalidateQueries({ queryKey: ['bienes-patrimoniales'] })
      queryClient.invalidateQueries({
        queryKey: ['patrimonio-resumen'],
        predicate: (consulta) => !consulta.queryKey[1] || consulta.queryKey[1] === data.dependencia_id,
      })
      queryClient.invalidateQueries({
        queryKey: ['transferencia-estado', data.dependencia_id],
        refetchType: 'none',
      })
    },
    onError: (error) =>
      notificarError(error, {
        conflicto:
          'No se puede verificar: la entrega de esta dependencia está congelada o consolidada.',
      }),
  })
}

