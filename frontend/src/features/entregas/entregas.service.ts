import { api } from '@/lib/api'
import { descargarArchivo } from '@/lib/descargas'
import type { ApiPaginated, ApiSuccess } from '@/types/api'
import type {
  ConsolidadoResponse,
  DependenciaResumen,
  EntregaCadenaEtts,
  EnvioEtte,
  EntregaItem,
  EstadoEntregaResponse,
  FiltrosEntregas,
  VerificarEntregaPayload,
} from '@/types/transferencia'

export const entregasService = {
  async listarEntregas(filtros: FiltrosEntregas = {}): Promise<ApiPaginated<EntregaItem>> {
    const params = new URLSearchParams()
    if (filtros.dependencia_id) params.set('dependencia_id', String(filtros.dependencia_id))
    if (filtros.estado) params.set('estado', filtros.estado)
    if (filtros.per_page) params.set('per_page', String(filtros.per_page))
    if (filtros.page) params.set('page', String(filtros.page))

    const res = await api.get<ApiPaginated<EntregaItem>>(`/transferencia/entregas?${params.toString()}`)
    return res.data
  },

  async obtenerEstadoEntrega(dependenciaId: number): Promise<EstadoEntregaResponse> {
    const res = await api.get<ApiSuccess<EstadoEntregaResponse>>('/transferencia/estado', {
      params: { dependencia_id: dependenciaId },
    })
    return res.data.data
  },

  /** El responsable presenta la entrega al coordinador ETTE (D-07). */
  async presentarEntrega(dependenciaId: number): Promise<void> {
    await api.post('/transferencia/presentar', { dependencia_id: dependenciaId })
  },

  /** El coordinador ETTE (o titular suplente) acepta lo entregado. */
  async verificarEntrega(payload: VerificarEntregaPayload): Promise<void> {
    await api.post('/transferencia/verificar', payload)
  },

  /** Subárbol del CC con autoría de cada entrega (D-08, RF-43). */
  async consolidado(dependenciaId: number): Promise<ConsolidadoResponse> {
    const res = await api.get<ApiSuccess<ConsolidadoResponse>>('/transferencia/consolidado', {
      params: { dependencia_id: dependenciaId },
    })
    return res.data.data
  },

  /** ZIP con los PDF finales firmados del CC y de su subárbol remitido. */
  async descargarExpedienteFirmado(dependenciaId: number): Promise<void> {
    await descargarArchivo('/expediente/firmado', { dependencia_id: dependenciaId }, 'expediente-firmado.zip')
  },

  /** Bandeja de los CC que envían al ETTS (D-12). */
  async cadenaEtts(): Promise<EntregaCadenaEtts[]> {
    const res = await api.get<ApiSuccess<EntregaCadenaEtts[]>>('/transferencia/cadena-etts')
    return res.data.data
  },

  async enviosEtte(): Promise<EnvioEtte[]> {
    const res = await api.get<ApiSuccess<EnvioEtte[]>>('/transferencia/envios-ette')
    return res.data.data
  },

  async recibirEnEtts(dependenciaIds: number[]): Promise<void> {
    await api.post('/transferencia/recibir-etts', { dependencia_ids: dependenciaIds })
  },

  async enviarAlEtte(dependenciaIds: number[], comentario?: string): Promise<EnvioEtte> {
    const res = await api.post<ApiSuccess<EnvioEtte>>('/transferencia/enviar-ette', {
      dependencia_ids: dependenciaIds,
      comentario,
    })
    return res.data.data
  },

  async recibirEnEtte(dependenciaIds: number[]): Promise<void> {
    await api.post('/transferencia/recibir-ette', { dependencia_ids: dependenciaIds })
  },

  async descargarConstanciaEnvio(envio: EnvioEtte): Promise<void> {
    await descargarArchivo(`/transferencia/envios-ette/${envio.id}/constancia/pdf`, undefined, `constancia-${envio.codigo}.pdf`)
  },

  async listarCatalogoDependencias(): Promise<DependenciaResumen[]> {
    const res = await api.get<ApiSuccess<DependenciaResumen[]>>('/dependencias', {
      params: { all: true, solo_activas: true },
    })
    return res.data.data
  },
}
