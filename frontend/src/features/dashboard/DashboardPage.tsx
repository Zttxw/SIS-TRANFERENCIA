import { Link } from 'react-router-dom'
import {
  Archive,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Circle,
  ClipboardList,
  Clock,
  FileCheck2,
  FolderTree,
  Package,
  PackageOpen,
  ShieldAlert,
  Users,
} from 'lucide-react'

import { useAuth, useDependenciaActiva } from '@/auth/hooks'
import { BotonDescargarPdf } from '@/components/anexos/BotonDescargarPdf'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { acervoService } from '@/features/acervo/acervo.service'
import { actaService } from '@/features/acta/acta.service'
import { gestionService } from '@/features/gestion/gestion.service'
import { noPatrimonialService } from '@/features/nopatrimonial/nopatrimonial.service'
import { patrimonioService } from '@/features/patrimonio/patrimonio.service'
import { personalService } from '@/features/personal/personal.service'
import { TableroOperativoView } from './TableroOperativoView'
import { useEstadoEntrega } from './use-dashboard'

/**
 * Dashboard de generación de anexos institucionales: avance de los anexos oficiales
 * de la dependencia activa según la Directiva N.° 001-2026-MDSJ/A.
 *
 * El sistema es una herramienta de captura y generación de PDF; la remisión formal
 * y firmas se realizan mediante el SGD institucional.
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

  const anexo02Completado = Boolean(anexo02_gestion?.existe)
  const anexo03Completado = (anexo03_acervo?.total_series ?? 0) > 0
  const anexo04Completado =
    (anexo04_patrimonio?.total_bienes ?? 0) > 0 && anexo04_patrimonio?.pendientes === 0
  const anexo05Completado = (anexo05_personal?.total_personal ?? 0) > 0
  const anexo06Completado = (anexo06_nopatrimonial?.total_bienes ?? 0) > 0
  const anexo07Completado =
    anexo02Completado && anexo03Completado && anexo04Completado && anexo05Completado

  const filasAnexos = [
    {
      id: 'anexo01',
      codigo: 'Anexo 01',
      nombre: 'Relación de Centros de Costo',
      icono: FolderTree,
      fuente: 'SGD / ROF',
      resumen: `[${dependencia.codigo}] ${dependencia.nombre} · Nivel ${dependencia.nivel}`,
      detalle: 'Catálogo de dependencias y centros de costo institucionales (Directiva §7)',
      ruta: '/organigrama',
      accion: 'Ver Centros de Costo',
      completado: true,
      descargar: undefined,
    },
    {
      id: 'anexo02',
      codigo: 'Anexo 02',
      nombre: 'Informe de Gestión',
      icono: ClipboardList,
      fuente: 'Manual',
      resumen: anexo02Completado ? 'Informe formulado y guardado' : 'Pendiente de formulación',
      detalle: 'Funciones, logros, dificultades y agenda pendiente',
      ruta: '/gestion',
      accion: 'Ver / Completar',
      completado: anexo02Completado,
      descargar: anexo02Completado ? () => gestionService.descargarPdf(dependencia.id) : undefined,
    },
    {
      id: 'anexo03',
      codigo: 'Anexo 03',
      nombre: 'Registro del Acervo Documentario',
      icono: Archive,
      fuente: 'SGD / Manual',
      resumen: anexo03Completado
        ? `${anexo03_acervo.total_series} series documentales registradas`
        : 'Sin series documentales registradas',
      detalle: 'Inventario físico y digital de archivos de gestión',
      ruta: '/acervo',
      accion: 'Ver / Completar',
      completado: anexo03Completado,
      descargar: anexo03Completado ? () => acervoService.descargarPdf(dependencia.id) : undefined,
    },
    {
      id: 'anexo04',
      codigo: 'Anexo 04',
      nombre: 'Inventario de Bienes Patrimoniales',
      icono: Package,
      fuente: 'SIGA / Manual',
      resumen:
        (anexo04_patrimonio?.total_bienes ?? 0) > 0
          ? `${anexo04_patrimonio.confirmados} de ${anexo04_patrimonio.total_bienes} verificados (${anexo04_patrimonio.porcentaje_avance}%)`
          : 'Sin bienes patrimoniales asignados',
      detalle:
        (anexo04_patrimonio?.pendientes ?? 0) > 0
          ? `${anexo04_patrimonio.pendientes} bienes pendientes de cotejo físico`
          : 'Inventario físico verificado conforme a SIGA',
      ruta: '/patrimonio',
      accion: 'Ver / Cotejar',
      esPatrimonio: true,
      avance: anexo04_patrimonio?.porcentaje_avance,
      completado: anexo04Completado,
      descargar:
        (anexo04_patrimonio?.total_bienes ?? 0) > 0
          ? () => patrimonioService.descargarPdf(dependencia.id)
          : undefined,
    },
    {
      id: 'anexo05',
      codigo: 'Anexo 05',
      nombre: 'Información del Personal a Cargo',
      icono: Users,
      fuente: 'SGD',
      resumen: anexo05Completado
        ? `${anexo05_personal.total_personal} servidores en el padrón`
        : 'Sin servidores registrados',
      detalle: 'Relación de servidores, régimen y situación contractual',
      ruta: '/personal',
      accion: 'Ver / Completar',
      completado: anexo05Completado,
      descargar: anexo05Completado ? () => personalService.descargarPdf(dependencia.id) : undefined,
    },
    {
      id: 'anexo06',
      codigo: 'Anexo 06',
      nombre: 'Bienes No Patrimoniales',
      icono: PackageOpen,
      fuente: 'Manual',
      resumen: anexo06Completado
        ? `${anexo06_nopatrimonial.total_bienes} bienes registrados`
        : 'Sin registros',
      detalle: 'Activos auxiliares o no catalogados en SIGA',
      ruta: '/nopatrimonial',
      accion: 'Ver / Completar',
      completado: anexo06Completado,
      descargar: anexo06Completado ? () => noPatrimonialService.descargarPdf(dependencia.id) : undefined,
    },
    {
      id: 'anexo07',
      codigo: 'Anexo 07',
      nombre: 'Acta de Transferencia y Entrega',
      icono: FileCheck2,
      fuente: 'Sistema',
      resumen: anexo07Completado
        ? 'Acta lista para generación y firma física'
        : 'Requiere completar los anexos sustantivos previos',
      detalle: 'Acta formal de cierre y entrega de cargo (Directiva §7.10)',
      ruta: '/acta',
      accion: 'Ver / Generar',
      completado: anexo07Completado,
      descargar: () => actaService.descargarPdf(dependencia.id),
    },
  ]

  const completos = filasAnexos.filter((a) => a.completado).length
  const totalAnexos = filasAnexos.length

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Barra de contexto institucional */}
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
          Anexos de Transferencia de Gestión
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Verifique la información precargada, complete los datos de su centro de costo y genere los
          PDF oficiales para la remisión mediante el SGD.
        </p>
      </div>

      {/* Resumen de avance general */}
      <Card className="bg-muted/15 border shadow-xs">
        <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4">
          <div className="flex items-center gap-2.5">
            {completos === totalAnexos ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="text-sm font-medium text-foreground">
              {completos} de {totalAnexos} anexos oficiales completados
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-2 w-44 overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full transition-all duration-300 ${
                  completos === totalAnexos ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-primary'
                }`}
                style={{ width: `${(completos / totalAnexos) * 100}%` }}
              />
            </div>
            <span className="text-xs font-mono font-bold text-foreground">
              {Math.round((completos / totalAnexos) * 100)}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Cuadro de anexos */}
      <Card className="overflow-hidden border shadow-xs">
        <CardHeader className="border-b border-border bg-muted/30 px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground sm:text-sm">
            <ClipboardList className="h-4 w-4 text-primary" />
            Control de Anexos Oficiales (Directiva N.° 001-2026-MDSJ/A)
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border p-0 text-xs">
          {filasAnexos.map((anexo) => {
            const Icono = anexo.icono
            return (
              <div
                key={anexo.id}
                className="flex flex-col justify-between gap-3 p-3.5 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center"
              >
                {/* Columna 1: Código y Título */}
                <div className="flex min-w-0 items-start gap-3 sm:w-[38%]">
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

                {/* Columna 2: Estado (2 estados claros: COMPLETADO vs POR COMPLETAR) */}
                <div className="shrink-0 sm:w-[16%]">
                  {anexo.completado ? (
                    <span className="inline-flex items-center gap-1.5 rounded border border-emerald-600/30 bg-emerald-500/10 px-2 py-0.5 text-mini font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                      COMPLETADO
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded border border-amber-600/30 bg-amber-500/10 px-2 py-0.5 text-mini font-mono font-bold text-amber-700 dark:text-amber-400">
                      <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                      POR COMPLETAR
                    </span>
                  )}
                </div>

                {/* Columna 3: Resumen de datos */}
                <div className="min-w-0 sm:w-[26%]">
                  <p className="truncate text-xs font-medium text-foreground">{anexo.resumen}</p>
                  {anexo.esPatrimonio && typeof anexo.avance === 'number' && (
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-emerald-600 transition-all"
                          style={{ width: `${anexo.avance}%` }}
                        />
                      </div>
                      <span className="text-mini font-mono font-bold text-foreground">
                        {anexo.avance}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Columna 4: Acciones (Descargar PDF si está disponible + Enlace) */}
                <div className="flex shrink-0 items-center justify-end gap-2 sm:w-[20%]">
                  {anexo.descargar && (
                    <BotonDescargarPdf
                      descargar={anexo.descargar}
                      etiqueta="PDF"
                      className="h-7 px-2 text-xs font-mono font-semibold"
                    />
                  )}
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
