import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { notificarError } from '@/lib/api-errors'
import type {
  FiltrosAcervo,
  FiltrosDocumentosSgd,
  GuardarAcervoPayload,
  TipoAcervo,
} from '@/types/acervo'
import { acervoService } from './acervo.service'

const CONFLICTO_ACERVO =
  'No se puede guardar: la entrega de este centro de costo está bloqueada (ya se cerró para revisión y firma).'

export function useAcervo(filtros: FiltrosAcervo = {}) {
  return useQuery({
    queryKey: ['acervo-documental', filtros],
    queryFn: ({ signal }) => acervoService.listar(filtros, signal),
    enabled: Boolean(filtros.dependencia_id),
    staleTime: 1000 * 30,
  })
}

export type VistaAcervo = 'lista' | 'anio'

/**
 * Series de un anexo del acervo (03-A o 03-B) con su búsqueda, paginación y
 * vista. La vista por año agrupa en cliente: trae todas las series (sin paginar).
 */
export function useSeriesAcervo(tipo: TipoAcervo, dependenciaId: number | null) {
  const [pagina, setPagina] = useState(1)
  const [busqueda, setBusqueda] = useState('')
  const [vista, setVista] = useState<VistaAcervo>('anio')
  const esVistaAnio = vista === 'anio'

  const consulta = useAcervo({
    dependencia_id: dependenciaId ?? undefined,
    tipo,
    search: busqueda || undefined,
    page: esVistaAnio ? 1 : pagina,
    per_page: esVistaAnio ? 500 : 15,
  })

  return {
    ...consulta,
    series: consulta.data?.data ?? [],
    meta: consulta.data?.meta,
    vista,
    setVista,
    setPagina,
    busqueda,
    buscar: (valor: string) => {
      setBusqueda(valor)
      setPagina(1)
    },
  }
}

/**
 * Documentos individuales del SGD de una fila-resumen de acervo digital.
 * Solo se dispara cuando `habilitado` (la serie está expandida). Mantiene la
 * página previa mientras pagina/busca para que la tabla no parpadee.
 */
export function useDocumentosSgd(
  acervoId: number | null,
  filtros: FiltrosDocumentosSgd = {},
  habilitado = false,
) {
  return useQuery({
    queryKey: ['acervo-documentos-sgd', acervoId, filtros],
    queryFn: ({ signal }) => acervoService.documentosSgd(acervoId as number, filtros, signal),
    enabled: habilitado && Boolean(acervoId),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60,
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
    onError: (error) => notificarError(error, { conflicto: CONFLICTO_ACERVO }),
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
    onError: (error) => notificarError(error, { conflicto: CONFLICTO_ACERVO }),
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
    onError: (error) =>
      notificarError(error, {
        conflicto:
          'No se puede eliminar: la entrega está bloqueada (ya se cerró para revisión y firma).',
      }),
  })
}
