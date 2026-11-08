import { BarChart3, Clock, FileSpreadsheet } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function ReportesPage() {
  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-[#3484A5]/40 text-[#3484A5] text-[11px] font-semibold bg-[#3484A5]/5">
              Módulo de Reportes
            </Badge>
            <span className="text-xs font-medium text-muted-foreground">
              Directiva CGR N.° 016-2022-CG/PREVI
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
            Generación y Exportación de Reportes
          </h1>
          <p className="text-sm text-muted-foreground">
            Consolidado ejecutivo, matrices de seguimiento y expedientes de rendición de cuentas.
          </p>
        </div>
      </div>

      {/* Tarjeta de Coordinación */}
      <Card className="border-dashed border-2 bg-slate-50/50 p-8 text-center shadow-xs">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#3484A5]/10 text-[#3484A5]">
          <BarChart3 className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-base font-semibold text-foreground">
          Módulo de Reportes en Planificación
        </h2>
        <p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground leading-relaxed">
          Los parámetros para la consolidación de reportes, descargas en Excel/PDF y cruces oficiales
          con el SIGA/SGD se definirán en la mesa técnica de coordinación.
        </p>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-4 w-4 text-[#3484A5]" />
          <span>Fase de configuración inicial</span>
        </div>
      </Card>

      {/* Vista previa de tipos de reportes futuros */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="shadow-xs opacity-75">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-[#3484A5]" />
              Matriz de Anexos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-muted-foreground">
            Resumen consolidado del estado de los anexos 01 al 06 por cada dependencia.
          </CardContent>
        </Card>

        <Card className="shadow-xs opacity-75">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              Conciliación SIGA
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-muted-foreground">
            Balance patrimonial de bienes verificados, faltantes y en almacén.
          </CardContent>
        </Card>

        <Card className="shadow-xs opacity-75">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-amber-600" />
              Observaciones CGR
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-muted-foreground">
            Pliegos observados y tiempos de respuesta de subsanación técnica.
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
