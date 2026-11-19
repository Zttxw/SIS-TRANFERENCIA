import { api } from '@/lib/api'
import type { ApiSuccess } from '@/types/api'
import type { PreparacionFirma } from '@/features/firmaperu/firmaperu.types'

/** Firma de un lado del Anexo 01 institucional. */
export interface FirmaLadoAnexo01 {
  firmante: string
  en_calidad_de: string | null
  origen: 'digital' | 'manuscrita'
  firmado_en: string | null
}

export interface EstadoAnexo01 {
  firma_habilitada: boolean
  pdf_generado_vigente: boolean
  generado_en: string | null
  completo: boolean
  sesion_final_id: string | null
  entidad: FirmaLadoAnexo01 | null
  ette: FirmaLadoAnexo01 | null
  mi_lado: { lado: 'entidad' | 'ette'; en_calidad_de: string | null } | null
}

/**
 * Anexo 01 institucional (fase 6): se genera y firma al cierre, por el ETTS y
 * un titular ETTE, cuando el ETTE ya recibió todas las entregas.
 */
export const anexo01Service = {
  async estado(): Promise<EstadoAnexo01> {
    const res = await api.get<ApiSuccess<EstadoAnexo01>>('/firmaperu/anexo01/estado')
    return res.data.data
  },

  async generar(): Promise<void> {
    await api.post('/firmaperu/anexo01/generar')
  },

  async preparar(signal: AbortSignal): Promise<PreparacionFirma> {
    const res = await api.post<ApiSuccess<PreparacionFirma>>('/firmaperu/anexo01/preparar', {}, { signal, timeout: 60000 })
    return res.data.data
  },

  /** Abre el PDF (firmado más completo o generado) en una pestaña nueva. */
  async abrirPdf(): Promise<void> {
    const res = await api.get<Blob>('/firmaperu/anexo01/pdf', { responseType: 'blob', timeout: 60000 })
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    window.open(url, '_blank', 'noopener')
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  },
}
