import { Link } from 'react-router-dom'
import { Boxes, Printer, ShieldAlert } from 'lucide-react'
import axios from 'axios'

import { useDependenciaActiva } from '@/auth/hooks'
import { AnexoHeader } from '@/components/anexos/AnexoHeader'
import { BotonDescargarPdf } from '@/components/anexos/BotonDescargarPdf'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { useEstadoEntrega } from '@/features/dashboard/use-dashboard'
import { actaService } from './acta.service'
import { ActaImprimible } from './ActaImprimible'
import { useActa } from './use-acta'

/**
 * Anexo 07 — Acta de Transferencia. El sistema la genera con los datos
 * disponibles de la dependencia para la firma física (PDF oficial). El flujo de
 * remisión/consolidación lo lleva el SGD, por lo que el acta no exige estado de
 * entrega.
 */
export function ActaPage() {
  const { dependenciaId } = useDependenciaActiva()
  const { data: estadoData } = useEstadoEntrega(dependenciaId)
  const { data: acta, isLoading, error } = useActa(dependenciaId)

  // 1. Sin dependencia seleccionada
  if (!dependenciaId) {
    return (
      <div className="space-y-6">
        <AnexoHeader
          numeroAnexo="Anexo 07"
          titulo="Acta de Transferencia Administrativa y Entrega de Cargo"
          subtitulo="Formalización del cierre del proceso de transferencia (Directiva N.° 001-2026-MDSJ/A §7.10)"
        />
        <Card className="border-dashed bg-muted/20 p-12 text-center">
          <Boxes className="mx-auto h-12 w-12 text-muted-foreground/60" />
          <h2 className="mt-4 text-base font-semibold">Selección de Centro de Costo requerida</h2>
          <p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground">
            Utilice el selector de dependencias en la barra superior para elegir el centro de
            costo sobre el cual desea generar o consultar el Acta de Transferencia.
          </p>
        </Card>
      </div>
    )
  }

  // 2. Carga
  if (isLoading) {
    return (
      <div className="space-y-6">
        <AnexoHeader
          numeroAnexo="Anexo 07"
          titulo="Acta de Transferencia Administrativa y Entrega de Cargo"
          subtitulo="Generando el acta con los datos disponibles..."
        />
        <div className="flex min-h-[350px] items-center justify-center">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      </div>
    )
  }

  // 3. Error / autorización
  if (error || !acta) {
    const es403 = axios.isAxiosError(error) && error.response?.status === 403
    return (
      <div className="space-y-6">
        <AnexoHeader
          numeroAnexo="Anexo 07"
          titulo="Acta de Transferencia Administrativa y Entrega de Cargo"
        />
        <Card className="border-destructive/40 bg-destructive/5 p-8 text-center shadow-sm">
          <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
          <h2 className="mt-3 text-lg font-semibold text-destructive">
            {es403 ? 'Acceso Restringido' : 'No se pudo cargar el Acta de Transferencia'}
          </h2>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
            {es403
              ? 'Su rol no cuenta con la facultad de generar o consultar actas (permiso requerido: actas.generar).'
              : error instanceof Error
                ? error.message
                : 'Error al consultar la información del acta.'}
          </p>
          <div className="mt-4">
            <Link to="/" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              Retornar al Dashboard
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  // 4. Vista del acta
  const depActual = acta.dependencia ??
    estadoData?.dependencia ?? {
      id: dependenciaId,
      codigo: '—',
      nombre: 'Centro de Costo',
      nivel: 2,
      parent_id: null,
    }

  return (
    <div className="space-y-6">
      <AnexoHeader
        numeroAnexo="Anexo 07"
        titulo="Acta de Transferencia Administrativa y Entrega de Cargo"
        subtitulo="Cierre oficial del procedimiento de transferencia (Directiva N.° 001-2026-MDSJ/A §7.10)"
        dependenciaCodigo={depActual.codigo}
        dependenciaNombre={depActual.nombre}
        acciones={
          <div className="flex flex-wrap items-center gap-2">
            <BotonDescargarPdf
              descargar={() => actaService.descargarPdf(dependenciaId)}
              etiqueta="PDF oficial"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-2 shadow-sm"
            >
              <Printer className="h-4 w-4" />
              Imprimir (vista)
            </Button>
          </div>
        }
      />

      {/* Resumen de control del acta */}
      <Card className="border-l-4 border-l-primary shadow-sm print:hidden">
        <CardContent className="grid gap-4 pt-5 text-xs sm:grid-cols-2 md:grid-cols-3">
          <div>
            <span className="block text-muted-foreground">N.° de Acta:</span>
            <span className="font-mono text-sm font-bold text-foreground">{acta.numero_acta}</span>
          </div>
          <div>
            <span className="block text-muted-foreground">Fecha de formalización:</span>
            <span className="text-sm font-semibold text-foreground">
              {acta.fecha_acta
                ? new Date(acta.fecha_acta).toLocaleDateString('es-PE')
                : '—'}
            </span>
          </div>
          <div>
            <span className="block text-muted-foreground">Centro de costo:</span>
            <span className="text-sm font-semibold text-foreground">
              [{depActual.codigo}] {depActual.nombre}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Vista imprimible del acta */}
      <ActaImprimible acta={acta} dependencia={depActual} />
    </div>
  )
}
