import { api } from '@/lib/api'
import { descargarArchivo } from '@/lib/descargas'
import type { ApiSuccess } from '@/types/api'
import type {
  ClaveReporte,
  FormatoExport,
  ReporteConciliacion,
  ReporteMatriz,
} from '@/types/reportes'

/** Mapa clave de reporte → payload JSON tipado. */
interface DatosReporte {
  'matriz-anexos': ReporteMatriz
  'conciliacion-patrimonial': ReporteConciliacion
}

export const reportesService = {
  /** Consolidado en JSON para la vista (acotado al ámbito del usuario en backend). */
  async obtener<K extends ClaveReporte>(reporte: K): Promise<DatosReporte[K]> {
    const res = await api.get<ApiSuccess<DatosReporte[K]>>(`/reportes/${reporte}`)
    return res.data.data
  },

  /** Descarga el reporte en Excel o PDF (requiere permiso reportes.exportar). */
  async exportar(reporte: ClaveReporte, formato: FormatoExport): Promise<void> {
    const ext = formato === 'excel' ? 'xlsx' : 'pdf'
    await descargarArchivo(
      `/reportes/${reporte}/export`,
      { formato },
      `reporte-${reporte}.${ext}`,
    )
  },
}
