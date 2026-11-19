import { api } from '@/lib/api'
import { descargarArchivo } from '@/lib/descargas'
import type { ApiSuccess } from '@/types/api'
import type { EstadoFirma, PreparacionFirma, SesionFirma, TipoDocumentoFirma, RequisitosRemision } from './firmaperu.types'

export const firmaperuService = {
  async previsualizar(tipo: TipoDocumentoFirma, dependenciaId: number, signal: AbortSignal, soloGenerado = false) {
    const res = await api.get<Blob>('/firmaperu/previsualizar', {
      params: { tipo_documento: tipo, dependencia_id: dependenciaId, solo_generado: soloGenerado ? 1 : 0 },
      responseType: 'blob', signal, timeout: 60000,
    })
    return res.data
  },
  async requisitosRemision(dependenciaId: number, signal: AbortSignal) {
    const res = await api.get<ApiSuccess<RequisitosRemision>>(`/firmaperu/requisitos-remision/${dependenciaId}`, { signal, timeout: 60000 })
    return res.data.data
  },
  /** Sin previo, el backend agrega la firma sobre la cadena vigente del documento (D-06). */
  async preparar(tipo: TipoDocumentoFirma, dependenciaId: number, signal: AbortSignal, motivoSuplencia?: string) {
    const res = await api.post<ApiSuccess<PreparacionFirma>>('/firmaperu/preparar', {
      tipo_documento: tipo,
      dependencia_id: dependenciaId,
      motivo_suplencia: motivoSuplencia,
    }, { signal, timeout: 60000 })
    return res.data.data
  },
  async sesion(id: string, signal: AbortSignal) {
    const res = await api.get<ApiSuccess<SesionFirma>>(`/firmaperu/sesiones/${id}`, { signal, timeout: 15000 })
    return res.data.data
  },
  async estado(tipo: TipoDocumentoFirma, dependenciaId: number, signal: AbortSignal) {
    const res = await api.get<ApiSuccess<EstadoFirma>>(`/firmaperu/estado/${tipo}/${dependenciaId}`, { signal, timeout: 15000 })
    return res.data.data
  },
  async generarBorrador(tipo: TipoDocumentoFirma, dependenciaId: number) {
    const res = await api.post<ApiSuccess<{ borrador_generado: boolean; borrador_generado_en: string }>>(
      '/firmaperu/generar-borrador',
      { tipo_documento: tipo, dependencia_id: dependenciaId },
      { timeout: 60000 },
    )
    return res.data.data
  },
  descargar(id: string) {
    return descargarArchivo(`/firmaperu/documentos/${id}/descargar`, undefined, 'Anexo-firmado.pdf')
  },
  descargarGenerado(tipo: TipoDocumentoFirma, dependenciaId: number) {
    return descargarArchivo('/firmaperu/previsualizar',
      { tipo_documento: tipo, dependencia_id: dependenciaId, solo_generado: 1 }, `Generado-${tipo}.pdf`)
  },
  /**
   * Firma manuscrita del lado ETTE (D-06): el PDF generado firmado a mano y
   * escaneado. El responsable firma digitalmente encima.
   */
  async subirFirmaManuscrita(tipo: TipoDocumentoFirma, dependenciaId: number, archivo: File, motivoSuplencia?: string) {
    const form = new FormData()
    form.append('tipo_documento', tipo)
    form.append('dependencia_id', String(dependenciaId))
    if (motivoSuplencia) form.append('motivo_suplencia', motivoSuplencia)
    form.append('signed_file', archivo)
    const res = await api.post<ApiSuccess<{ sesion_id: string; estado: string }>>('/firmaperu/subir-manual', form, { timeout: 60000 })
    return res.data.data
  },
  /** Descarga el PDF disponible de un anexo: el firmado vigente si existe, o el generado. */
  descargarDisponible(tipo: TipoDocumentoFirma, dependenciaId: number, estado: EstadoFirma) {
    const firmadoVigente = estado.firmado && estado.vigente !== false
    return firmadoVigente && estado.documento_id
      ? this.descargar(estado.documento_id)
      : this.descargarGenerado(tipo, dependenciaId)
  },
  async verFirmado(id: string, signal: AbortSignal) {
    const res = await api.get<Blob>(`/firmaperu/documentos/${id}/ver`, { responseType: 'blob', signal, timeout: 60000 })
    return res.data
  },
  descargarRecibido(id: string) {
    return descargarArchivo(`/firmaperu/documentos/${id}/recibido`, undefined, 'Anexo-recibido-sin-verificar.pdf')
  },
}
