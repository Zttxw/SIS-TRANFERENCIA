import { useState } from 'react'
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Can } from '@/auth/Can'
import { Button } from '@/components/ui/button'
import { notificarError } from '@/lib/api-errors'
import { reportesService } from './reportes.service'
import type { ClaveReporte, FormatoExport } from '@/types/reportes'

/**
 * Botones de exportación (Excel / PDF) de un reporte, gated por
 * `reportes.exportar`. Encapsulan el estado de carga por formato y la
 * traducción de errores.
 */
export function BotonesExport({ reporte }: { reporte: ClaveReporte }) {
  const [cargando, setCargando] = useState<FormatoExport | null>(null)

  const exportar = async (formato: FormatoExport) => {
    setCargando(formato)
    try {
      await reportesService.exportar(reporte, formato)
      toast.success('Descarga iniciada. Revise su carpeta de descargas.')
    } catch (error) {
      notificarError(error)
    } finally {
      setCargando(null)
    }
  }

  return (
    <Can permiso="reportes.exportar">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={cargando !== null}
          onClick={() => exportar('excel')}
        >
          {cargando === 'excel' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="h-4 w-4 text-success-fg" />
          )}
          Excel
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={cargando !== null}
          onClick={() => exportar('pdf')}
        >
          {cargando === 'pdf' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4 text-primary" />
          )}
          PDF
        </Button>
      </div>
    </Can>
  )
}
