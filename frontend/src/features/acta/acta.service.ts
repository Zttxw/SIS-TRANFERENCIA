import { api } from '@/lib/api'
import { descargarArchivo } from '@/lib/descargas'
import type { ApiSuccess } from '@/types/api'
import type { ActaTransferencia } from '@/types/acta'

export const actaService = {
  /**
   * Obtiene el Acta (Anexo 07) para la dependencia dada, materializada con los
   * datos disponibles. El flujo de remisión lo lleva el SGD.
   */
  async obtenerActa(dependenciaId: number): Promise<ActaTransferencia> {
    const res = await api.get<ApiSuccess<ActaTransferencia>>('/transferencia/acta', {
      params: { dependencia_id: dependenciaId },
    })
    return res.data.data
  },

  /**
   * Descarga el PDF oficial del Acta (Anexo 07) generado por el backend.
   */
  async descargarPdf(dependenciaId: number): Promise<void> {
    await descargarArchivo(
      '/transferencia/acta/pdf',
      { dependencia_id: dependenciaId },
      'Anexo07-Acta.pdf',
    )
  },
}
