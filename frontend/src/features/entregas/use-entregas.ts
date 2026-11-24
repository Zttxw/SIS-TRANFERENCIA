import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import type {
  FiltrosEntregas,
  SuplenciaEttePayload,
} from '@/types/transferencia'
import { entregasService } from './entregas.service'

export function useEntregas(filtros: FiltrosEntregas = {}) {
  return useQuery({
    queryKey: ['entregas', filtros],
    queryFn: () => entregasService.listarEntregas(filtros),
    staleTime: 1000 * 20,
  })
}

export function useCatalogoDependencias() {
  return useQuery({
    queryKey: ['dependencias', 'arbol-completo'],
    queryFn: () => entregasService.listarCatalogoDependencias(),
    staleTime: 1000 * 60 * 5,
  })
}

export function useEstadoEntrega(dependenciaId?: number | null) {
  return useQuery({
    queryKey: ['transferencia-estado', dependenciaId],
    queryFn: () => entregasService.obtenerEstadoEntrega(dependenciaId!),
    enabled: Boolean(dependenciaId),
    staleTime: 1000 * 30,
  })
}

function invalidarFlujo(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['entregas'] })
  queryClient.invalidateQueries({ queryKey: ['transferencia-estado'] })
  queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  queryClient.invalidateQueries({ queryKey: ['observaciones'] })
}

function mensajeError(error: any, porDefecto: string): string {
  return error?.response?.data?.message ?? porDefecto
}

export function usePresentarEntrega() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dependenciaId: number) => entregasService.presentarEntrega(dependenciaId),
    onSuccess: () => {
      toast.success('Entrega cerrada para la revisión y firma con el coordinador ETTE. Los anexos quedan bloqueados para edición.')
      invalidarFlujo(queryClient)
      // Al presentar se congelan los documentos pendientes del Anexo 02 (D-09).
      queryClient.invalidateQueries({ queryKey: ['informe-gestion'] })
    },
    onError: (error: any) => toast.error(mensajeError(error, 'No se pudo cerrar la entrega para firma.')),
  })
}

export function useTitularesEtte(habilitado: boolean) {
  return useQuery({
    queryKey: ['entregas', 'titulares-ette'],
    queryFn: () => entregasService.titularesEtte(),
    enabled: habilitado,
    staleTime: 1000 * 60 * 5,
  })
}

export function useSuplenciaEtte() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SuplenciaEttePayload) => entregasService.designarSuplenciaEtte(payload),
    onSuccess: (_, payload) => {
      toast.success(payload.titular_id ? 'Titular ETTE designado en suplencia del coordinador.' : 'Firmará el coordinador ETTE asignado.')
      invalidarFlujo(queryClient)
      // El firmante ETTE cambia el estado de firma y el receptor del acta.
      queryClient.invalidateQueries({ queryKey: ['firmaperu'] })
      queryClient.invalidateQueries({ queryKey: ['acta'] })
    },
    onError: (error: any) => toast.error(mensajeError(error, 'No se pudo designar la suplencia.')),
  })
}

export function useConsolidado(dependenciaId?: number | null, habilitado = true) {
  return useQuery({
    queryKey: ['entregas', 'consolidado', dependenciaId],
    queryFn: () => entregasService.consolidado(dependenciaId!),
    enabled: Boolean(dependenciaId) && habilitado,
    staleTime: 1000 * 30,
  })
}

export function useCadenaEtts() {
  return useQuery({
    queryKey: ['entregas', 'cadena-etts'],
    queryFn: () => entregasService.cadenaEtts(),
    staleTime: 1000 * 20,
  })
}

export function useEnviosEtte() {
  return useQuery({
    queryKey: ['entregas', 'envios-ette'],
    queryFn: () => entregasService.enviosEtte(),
    staleTime: 1000 * 20,
  })
}

type PasoCadena = 'recibir-etts' | 'enviar-ette' | 'recibir-ette'

const MENSAJE_PASO: Record<PasoCadena, string> = {
  'recibir-etts': 'Recepción registrada en el ETTS.',
  'enviar-ette': 'Entregas enviadas al ETTE. Descargue la constancia del lote.',
  'recibir-ette': 'Recepción registrada en el ETTE.',
}

/** Un paso de la cadena ETTS → ETTE sobre uno o varios CC (D-12). */
export function usePasoCadena(paso: PasoCadena) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ dependenciaIds, comentario }: { dependenciaIds: number[]; comentario?: string }) =>
      paso === 'recibir-etts'
        ? entregasService.recibirEnEtts(dependenciaIds)
        : paso === 'enviar-ette'
          ? entregasService.enviarAlEtte(dependenciaIds, comentario).then(() => undefined)
          : entregasService.recibirEnEtte(dependenciaIds),
    onSuccess: () => {
      toast.success(MENSAJE_PASO[paso])
      invalidarFlujo(queryClient)
      queryClient.invalidateQueries({ queryKey: ['anexo01-institucional'] })
    },
    onError: (error: any) => toast.error(mensajeError(error, 'No se pudo registrar el paso.')),
  })
}
