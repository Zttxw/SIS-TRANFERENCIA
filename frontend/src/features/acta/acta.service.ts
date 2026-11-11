import { api } from '@/lib/api'
import { descargarArchivo } from '@/lib/descargas'
import type { ApiSuccess } from '@/types/api'
import type { ActaTransferencia, EvidenciaItem, SubirEvidenciaPayload } from '@/types/acta'

export const actaService = {
  /**
   * Obtiene el Acta oficial de Transferencia (Anexo 07) para la dependencia dada.
   * Devuelve 409 Conflict si la entrega no está en estado CONSOLIDADA.
   */
  async obtenerActa(dependenciaId: number): Promise<ActaTransferencia> {
    const res = await api.get<ApiSuccess<ActaTransferencia>>('/transferencia/acta', {
      params: { dependencia_id: dependenciaId },
    })
    return res.data.data
  },

  /**
   * Descarga el PDF oficial del Acta (Anexo 07) generado por el backend. Exige
   * entrega CONSOLIDADA (el backend responde 409 en otro caso).
   */
  async descargarPdf(dependenciaId: number): Promise<void> {
    await descargarArchivo(
      '/transferencia/acta/pdf',
      { dependencia_id: dependenciaId },
      'Anexo07-Acta.pdf',
    )
  },

  /**
   * Descarga el expediente completo (todos los anexos de la dependencia en un
   * solo PDF). Exige entrega CONSOLIDADA (409 en otro caso).
   */
  async descargarExpediente(dependenciaId: number): Promise<void> {
    await descargarArchivo(
      '/expediente/pdf',
      { dependencia_id: dependenciaId },
      'Expediente-Transferencia.pdf',
    )
  },

  /**
   * Sube un archivo de evidencia o documento suscrito al storage seguro.
   */
  async subirEvidencia(payload: SubirEvidenciaPayload): Promise<EvidenciaItem> {
    const formData = new FormData()
    formData.append('archivo', payload.archivo)
    formData.append('tipo', payload.tipo)
    formData.append('id', String(payload.id))
    if (payload.descripcion) {
      formData.append('descripcion', payload.descripcion)
    }

    const res = await api.post<ApiSuccess<EvidenciaItem>>('/evidencias', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return res.data.data
  },

  /**
   * Descarga segura de un archivo de evidencia adjunto al acta o expediente.
   */
  async descargarEvidencia(id: number, nombreArchivo: string): Promise<void> {
    const res = await api.get<Blob>(`/evidencias/${id}/descargar`, {
      responseType: 'blob',
    })

    const url = window.URL.createObjectURL(new Blob([res.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', nombreArchivo)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  },
}
