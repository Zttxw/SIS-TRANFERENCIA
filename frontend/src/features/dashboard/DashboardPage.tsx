import { Link } from 'react-router-dom'
import {
  Archive,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Circle,
  ClipboardList,
  FileCheck2,
  FolderTree,
  Package,
  PackageOpen,
  ShieldAlert,
  Users,
} from 'lucide-react'

import { useAuth, useDependenciaActiva } from '@/auth/hooks'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { TableroOperativoView } from './TableroOperativoView'
import { useEstadoEntrega } from './use-dashboard'

/**
 * Dashboard de «mi entrega»: avance de los anexos de la dependencia activa. El
 * sistema es una herramienta de apoyo para completar y generar los anexos; el
 * flujo de remisión/consolidación lo lleva el SGD.
 *
 * - Admin / ETTS sin dependencia concreta → Tablero de avance institucional.
 * - Dependencia seleccionada → cuadro de los anexos 01–07 con su estado.
 */
export function DashboardPage() {
  const { usuario } = useAuth()
  const { dependenciaId, setDependenciaId } = useDependenciaActiva()
  const esGlobal = usuario?.es_global === true

  const { data: estadoData, isLoading, error } = useEstadoEntrega(dependenciaId)

  if (!dependenciaId) {
    if (!esGlobal) {
      return (
        <div className="flex min-h-[400px] items-center justify-center">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      )
    }
    return <TableroOperativoView onSeleccionarDependencia={(id) => setDependenciaId(id)} />
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    )
  }

  if (error || !estadoData) {
    return (
      <Card className="border-destructive/40 bg-destructive/5 p-8 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
        <h2 className="mt-3 text-lg font-semibold text-destructive">
          No se pudo cargar el avance de los anexos
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : 'Error al consultar los datos de la dependencia.'}
        </p>
      </Card>
    )
  }

  const {
    dependencia,
    anexo02_gestion,
    anexo03_acervo,
    anexo04_patrimonio,
    anexo05_personal,
    anexo06_nopatrimonial,
  } = estadoData

  const filasAnexos = [
    {
      id: 'anexo01',
      codigo: 'Anexo 01',
      nombre: 'Estructura Orgánica y Centros de Costo',
      icono: FolderTree,
      fuente: 'SGD / ROF',
      resumen: dependencia.parent_id
        ? `Nivel ${dependencia.nivel} · Dependencia subordinada`
        : `Nivel ${dependencia.nivel} · Órgano de primer nivel`,
      detalle: 'Organigrama y centros de costo institucionales',
      ruta: '/organigrama',
      accion: 'Ver Organigrama',
      completado: true,
    },
    {
      id: 'anexo02',
      codigo: 'Anexo 02',
      nombre: 'Informe de Gestión',
      icono: ClipboardList,
      fuente: 'Manual',
      resumen: anexo02_gestion.existe ? 'Informe registrado' : 'Pendiente de formulación',
      detalle: 'Funciones, logros, dificultades y agenda pendiente',
      ruta: '/gestion',
      accion: 'Ver / Completar',
      completado: anexo02_gestion.existe,
    },
    {
      id: 'anexo03',
      codigo: 'Anexo 03',
      nombre: 'Acervo Documental',
      icono: Archive,
      fuente: 'SGD / Manual',
      resumen: `${anexo03_acervo.total_series} series documentales registradas`,
      detalle: 'Inventario físico y digital de archivos de gestión',
      ruta: '/acervo',
      accion: 'Ver / Completar',
      completado: anexo03_acervo.total_series > 0,
    },
    {
      id: 'anexo04',
      codigo: 'Anexo 04',
      nombre: 'Bienes Patrimoniales',
      icono: Package,
      fuente: 'SIGA / Manual',
      resumen: `${anexo04_patrimonio.confirmados} de ${anexo04_patrimonio.total_bienes} verificados (${anexo04_patrimonio.porcentaje_avance}%)`,
      detalle: `${anexo04_patrimonio.pendientes} bienes pendientes de cotejo físico`,
      ruta: '/patrimonio',
      accion: 'Ver / Cotejar',
      esPatrimonio: true,
      avance: anexo04_patrimonio.porcentaje_avance,
      completado: anexo04_patrimonio.pendientes === 0 && anexo04_patrimonio.total_bienes > 0,
    },
    {
      id: 'anexo05',
      codigo: 'Anexo 05',
      nombre: 'Personal de la Dependencia',
      icono: Users,
      fuente: 'SGD',
      resumen: `${anexo05_personal.total_personal} servidores en el padrón`,
      detalle: 'Relación de servidores, régimen y situación contractual',
      ruta: '/personal',
      accion: 'Ver / Completar',
      completado: anexo05_personal.total_personal > 0,
    },
    {
      id: 'anexo06',
      codigo: 'Anexo 06',
      nombre: 'Bienes No Patrimoniales',
      icono: PackageOpen,
      fuente: 'Manual',
      resumen:
        anexo06_nopatrimonial.total_bienes > 0
          ? `${anexo06_nopatrimonial.total_bienes} bienes registrados`
          : 'Sin registros (puede No Aplicar)',
      detalle: 'Activos auxiliares o no catalogados en SIGA',
      ruta: '/nopatrimonial',
      accion: 'Ver / Completar',
      completado: true,
    },
    {
      id: 'anexo07',
      codigo: 'Anexo 07',
      nombre: 'Acta de Transferencia y Entrega',
      icono: FileCheck2,
      fuente: 'Sistema',
      resumen: 'Acta generable para la firma física',
      detalle: 'Acta formal de entrega de cargo',
      ruta: '/acta',
      accion: 'Ver / Generar',
      completado: true,
    },
  ]

  const anexosNucleo = filasAnexos.filter((a) =>
    ['anexo02', 'anexo03', 'anexo04', 'anexo05'].includes(a.id),
  )
  const completos = anexosNucleo.filter((a) => a.completado).length

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Barra de contexto */}
      <div className="flex flex-col gap-3 border-b border-border pb-3 text-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
          <span className="font-semibold uppercase tracking-tight text-foreground">
            {usuario?.servidor?.cargo || (esGlobal ? 'Administración Municipal' : 'Servidor Público')}
          </span>
          <span>·</span>
          <span className="font-mono font-semibold text-primary">[{dependencia.codigo}]</span>
          <span className="max-w-sm truncate font-medium text-foreground">{dependencia.nombre}</span>
        </div>
        {esGlobal && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDependenciaId(null)}
            className="h-7 gap-1.5 self-start text-xs sm:self-auto"
          >
            <BarChart3 className="h-3.5 w-3.5 text-primary" />
            Volver al Tablero Global
          </Button>
        )}
      </div>

      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Mis anexos de transferencia
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Verifique la información precargada, complete lo que falte y genere el PDF
          oficial de cada anexo para la entrega física.
        </p>
      </div>

      {/* Resumen de avance de anexos núcleo */}
      <Card className="bg-muted/15">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2.5">
            {completos === anexosNucleo.length ? (
              <CheckCircle2 className="h-5 w-5 text-success" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="text-sm font-medium text-foreground">
              {completos} de {anexosNucleo.length} anexos obligatorios con información registrada
            </span>
          </div>
          <div className="h-2 w-40 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(completos / anexosNucleo.length) * 100}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Cuadro de anexos */}
      <Card className="overflow-hidden border shadow-xs">
        <CardHeader className="border-b border-border bg-muted px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground sm:text-sm">
            <ClipboardList className="h-4 w-4 text-primary" />
            Información a verificar y completar
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border p-0 text-xs">
          {filasAnexos.map((anexo) => {
            const Icono = anexo.icono
            return (
              <div
                key={anexo.id}
                className="flex flex-col justify-between gap-3 p-3.5 transition-colors hover:bg-muted sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 items-start gap-3 sm:w-[42%]">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icono className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-foreground">
                      {anexo.codigo} · {anexo.nombre}
                    </span>
                    <p className="mt-0.5 truncate text-nota text-muted-foreground">{anexo.detalle}</p>
                  </div>
                </div>

                <div className="shrink-0 sm:w-[14%]">
                  <span className="inline-block rounded border border-border bg-muted px-2 py-0.5 text-mini font-mono font-semibold text-foreground">
                    {anexo.fuente}
                  </span>
                </div>

                <div className="min-w-0 sm:w-[26%]">
                  <p className="truncate text-xs font-medium text-foreground">{anexo.resumen}</p>
                  {anexo.esPatrimonio && typeof anexo.avance === 'number' && (
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-success transition-all"
                          style={{ width: `${anexo.avance}%` }}
                        />
                      </div>
                      <span className="text-mini font-mono font-bold text-success-fg">{anexo.avance}%</span>
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 items-center justify-end sm:w-[18%]">
                  <Link
                    to={anexo.ruta}
                    className={buttonVariants({
                      variant: 'outline',
                      size: 'sm',
                      className: 'h-7 gap-1 px-2.5 text-xs font-medium',
                    })}
                  >
                    {anexo.accion}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
