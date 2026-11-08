import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Boxes,
  Building2,
  Clock,
  FileCheck,
  FileSpreadsheet,
  FileText,
  FolderArchive,
  History,
  Send,
  ShieldAlert,
  ShieldCheck,
  Users,
} from 'lucide-react'

import { useAuth, useDependenciaActiva } from '@/auth/hooks'
import { Can } from '@/auth/Can'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import type { EstadoEntrega } from '@/types/transferencia'
import { RemitirModal } from './RemitirModal'
import { RevisarModal } from './RevisarModal'
import { TableroOperativoView } from './TableroOperativoView'
import { useEstadoEntrega, useResumenDocumentos } from './use-dashboard'

function renderBadgeEstado(estado: EstadoEntrega | null) {
  switch (estado) {
    case 'consolidada':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          Consolidada
        </span>
      )
    case 'remitida':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-400">
          <Clock className="h-3.5 w-3.5" />
          Remitida (En espera de revisión)
        </span>
      )
    case 'observada':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-700 dark:text-red-400">
          <AlertCircle className="h-3.5 w-3.5" />
          Observada (Requiere subsanación)
        </span>
      )
    case 'subsanada':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-400">
          <History className="h-3.5 w-3.5" />
          Subsanada (Reevaluación)
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
          <FileText className="h-3.5 w-3.5" />
          Borrador (En preparación)
        </span>
      )
  }
}

export function DashboardPage() {
  const { usuario } = useAuth()
  const { dependenciaId, setDependenciaId } = useDependenciaActiva()
  const esGlobal = usuario?.es_global === true

  const { data: estadoData, isLoading, error } = useEstadoEntrega(dependenciaId)
  const { data: resumenDocs } = useResumenDocumentos(dependenciaId)

  const [modalRemitir, setModalRemitir] = useState(false)
  const [modalRevisar, setModalRevisar] = useState(false)

  // Si no hay una dependencia concreta seleccionada (visión global de admin / ETTS)
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
        <h2 className="mt-3 text-lg font-semibold text-destructive">No se pudo cargar el estado de la entrega</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : 'Error al consultar los datos de la dependencia.'}
        </p>
      </Card>
    )
  }

  const { dependencia, anexo02_gestion, anexo03_acervo, anexo04_patrimonio, anexo05_personal, anexo06_nopatrimonial, entrega } = estadoData
  const estadoEntrega = entrega?.estado ?? 'borrador'
  const esEditable = estadoEntrega === 'borrador' || estadoEntrega === 'observada' || estadoEntrega === 'subsanada'
  const haciaEtts = entrega?.hacia_etts ?? (dependencia.parent_id === null)

  return (
    <div className="space-y-6">
      {/* Barra de Retorno al Tablero Global (Exclusiva para Administrador / ETTS) */}
      {esGlobal && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#3484A5]/10 border border-[#3484A5]/25 rounded-xl p-3 sm:px-4">
          <div className="flex items-center gap-2.5">
            <Building2 className="h-4 w-4 text-[#3484A5] shrink-0" />
            <span className="text-xs sm:text-sm font-semibold text-slate-800">
              Despacho en inspección: <span className="font-mono text-[#3484A5]">[{dependencia.codigo}]</span> {dependencia.nombre}
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDependenciaId(null)}
            className="h-7 text-xs gap-1.5 self-start sm:self-auto border-[#3484A5]/40 hover:bg-[#3484A5]/15 cursor-pointer"
          >
            <BarChart3 className="h-3.5 w-3.5 text-[#3484A5]" />
            <span>Volver al Tablero Global</span>
          </Button>
        </div>
      )}
      {/* Cabecera del Dashboard */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
              {dependencia.codigo}
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              Nivel jerárquico {dependencia.nivel}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
            {dependencia.nombre}
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitoreo y consolidación de la información de entrega de gestión.
          </p>
        </div>

        {/* Acciones de Workflow */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Botón Remitir */}
          <Can permiso="entregas.remitir">
            {esEditable && (
              <Button onClick={() => setModalRemitir(true)} className="gap-2 shadow-sm">
                <Send className="h-4 w-4" />
                Remitir Entrega
              </Button>
            )}
          </Can>

          {/* Botón Revisar */}
          <Can permiso="entregas.revisar">
            {(estadoEntrega === 'remitida' || estadoEntrega === 'en_revision') && (
              <Button onClick={() => setModalRevisar(true)} variant="secondary" className="gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Revisar Entrega
              </Button>
            )}
          </Can>

          {/* Botón Emitir Acta */}
          <Can permiso="actas.generar">
            {estadoEntrega === 'consolidada' ? (
              <Link
                to="/acta"
                className={buttonVariants({ variant: 'default', className: 'gap-2' })}
              >
                <FileCheck className="h-4 w-4" />
                Generar Acta de Transferencia
              </Link>
            ) : (
              <Button variant="outline" className="gap-2" disabled>
                <FileCheck className="h-4 w-4" />
                Acta (Requiere Consolidación)
              </Button>
            )}
          </Can>
        </div>
      </div>

      {/* Tarjeta de Estado de la Entrega */}
      <Card className="overflow-hidden border-l-4 border-l-primary shadow-sm">
        <CardHeader className="bg-muted/20 pb-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Estado de la Entrega Institucional</CardTitle>
              <CardDescription className="text-xs">
                {haciaEtts
                  ? 'Dependencia de 1er nivel · Remisión directa al Equipo de Trabajo de Transferencia (ETTS)'
                  : 'Dependencia subordinada · Remisión jerárquica a la unidad superior'}
              </CardDescription>
            </div>
            <div>{renderBadgeEstado(estadoEntrega)}</div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 pt-4 sm:grid-cols-2 md:grid-cols-4 text-sm">
          <div>
            <span className="text-xs text-muted-foreground block">Fecha de Remisión:</span>
            <span className="font-medium text-foreground">
              {entrega?.remitida_en ? new Date(entrega.remitida_en).toLocaleString('es-PE') : 'Aún no remitida'}
            </span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Última Revisión:</span>
            <span className="font-medium text-foreground">
              {entrega?.revisada_en ? new Date(entrega.revisada_en).toLocaleString('es-PE') : 'Pendiente'}
            </span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Consolidación:</span>
            <span className="font-medium text-foreground">
              {entrega?.consolidada_en ? new Date(entrega.consolidada_en).toLocaleString('es-PE') : 'Pendiente'}
            </span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Destino Jerárquico:</span>
            <span className="font-medium text-foreground">
              {haciaEtts ? 'ETTS Institucional' : `Dependencia Padre (ID ${dependencia.parent_id})`}
            </span>
          </div>

          {entrega?.comentario && (
            <div className="col-span-full rounded-lg bg-muted/40 p-3 text-xs">
              <span className="font-semibold text-foreground">Observación / Nota: </span>
              <span className="text-muted-foreground">{entrega.comentario}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Widget Destacado: Avance de Verificación Patrimonial (Anexo 04) */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                <Boxes className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Anexo 04 · Inventario Físico de Bienes Patrimoniales</CardTitle>
                <CardDescription className="text-xs">
                  Cotejo de campo y verificación de bienes muebles según Directiva N.° 001-2026-MDSJ/A
                </CardDescription>
              </div>
            </div>
            <Link
              to="/patrimonio"
              className={buttonVariants({ variant: 'outline', size: 'sm', className: 'gap-1.5' })}
            >
              Realizar Verificación
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-muted-foreground">Avance de Verificación Física</span>
              <span className="text-primary font-bold">{anexo04_patrimonio.porcentaje_avance}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all duration-500 ease-in-out"
                style={{ width: `${anexo04_patrimonio.porcentaje_avance}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-sm pt-1">
            <div className="rounded-lg bg-muted/30 p-2.5">
              <span className="text-xs text-muted-foreground block">Total Bienes SIGA</span>
              <span className="text-lg font-bold text-foreground">{anexo04_patrimonio.total_bienes}</span>
            </div>
            <div className="rounded-lg bg-emerald-500/10 p-2.5">
              <span className="text-xs text-emerald-700 dark:text-emerald-400 block font-medium">Confirmados</span>
              <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                {anexo04_patrimonio.confirmados}
              </span>
            </div>
            <div className="rounded-lg bg-amber-500/10 p-2.5">
              <span className="text-xs text-amber-700 dark:text-amber-400 block font-medium">Pendientes</span>
              <span className="text-lg font-bold text-amber-700 dark:text-amber-400">
                {anexo04_patrimonio.pendientes}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cuadrícula de los Anexos Restantes */}
      <div>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Anexos de la Transferencia de Gestión
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Anexo 01: Documentos Pendientes */}
          <Card className="hover:border-primary/50 transition-colors shadow-sm flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                  <FileText className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground">
                  Anexo 01
                </span>
              </div>
              <CardTitle className="text-base mt-2">Documentos Pendientes</CardTitle>
              <CardDescription className="text-xs line-clamp-2">
                Asuntos, expedientes y trámites documentarios pendientes de resolución (SGD).
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="flex items-center justify-between text-xs border-t pt-2">
                <span className="text-muted-foreground">Total pendientes:</span>
                <span className="font-bold text-foreground">
                  {resumenDocs?.total_pendientes ?? 0} expedientes
                </span>
              </div>
              <Link
                to="/documentos"
                className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'w-full justify-between' })}
              >
                Acceder al Anexo 01
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>

          {/* Anexo 02: Informe de Gestión */}
          <Card className="hover:border-primary/50 transition-colors shadow-sm flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground">
                  Anexo 02
                </span>
              </div>
              <CardTitle className="text-base mt-2">Informe de Gestión</CardTitle>
              <CardDescription className="text-xs line-clamp-2">
                Memoria de gestión, objetivos institucionales, logros y dificultades de la unidad.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="flex items-center justify-between text-xs border-t pt-2">
                <span className="text-muted-foreground">Estado del informe:</span>
                <span className={`font-bold ${anexo02_gestion.existe ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {anexo02_gestion.existe ? 'Registrado' : 'Pendiente'}
                </span>
              </div>
              <Link
                to="/gestion"
                className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'w-full justify-between' })}
              >
                Acceder al Anexo 02
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>

          {/* Anexo 03: Acervo Documental */}
          <Card className="hover:border-primary/50 transition-colors shadow-sm flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
                  <FolderArchive className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground">
                  Anexo 03
                </span>
              </div>
              <CardTitle className="text-base mt-2">Acervo Documental</CardTitle>
              <CardDescription className="text-xs line-clamp-2">
                Inventario de series documentales, archivos de gestión y acervo digitalizado.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="flex items-center justify-between text-xs border-t pt-2">
                <span className="text-muted-foreground">Series registradas:</span>
                <span className="font-bold text-foreground">
                  {anexo03_acervo.total_series} series
                </span>
              </div>
              <Link
                to="/acervo"
                className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'w-full justify-between' })}
              >
                Acceder al Anexo 03
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>

          {/* Anexo 05: Personal */}
          <Card className="hover:border-primary/50 transition-colors shadow-sm flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600">
                  <Users className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground">
                  Anexo 05
                </span>
              </div>
              <CardTitle className="text-base mt-2">Personal Asignado</CardTitle>
              <CardDescription className="text-xs line-clamp-2">
                Padrón de personal asignado, regímenes laborales y situación contractual.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="flex items-center justify-between text-xs border-t pt-2">
                <span className="text-muted-foreground">Total colaboradores:</span>
                <span className="font-bold text-foreground">
                  {anexo05_personal.total_personal} servidores
                </span>
              </div>
              <Link
                to="/personal"
                className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'w-full justify-between' })}
              >
                Acceder al Anexo 05
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>

          {/* Anexo 06: Bienes No Patrimoniales */}
          <Card className="hover:border-primary/50 transition-colors shadow-sm flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600">
                  <Boxes className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground">
                  Anexo 06
                </span>
              </div>
              <CardTitle className="text-base mt-2">Bienes No Patrimoniales</CardTitle>
              <CardDescription className="text-xs line-clamp-2">
                Bienes auxiliares, suministros y activos no catalogados en el SIGA oficial.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="flex items-center justify-between text-xs border-t pt-2">
                <span className="text-muted-foreground">Bienes registrados:</span>
                <span className="font-bold text-foreground">
                  {anexo06_nopatrimonial.total_bienes} bienes
                </span>
              </div>
              <Link
                to="/nopatrimonial"
                className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'w-full justify-between' })}
              >
                Acceder al Anexo 06
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>

          {/* Observaciones Institucionales */}
          <Card className="hover:border-primary/50 transition-colors shadow-sm flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground">
                  Flujo
                </span>
              </div>
              <CardTitle className="text-base mt-2">Bandeja de Observaciones</CardTitle>
              <CardDescription className="text-xs line-clamp-2">
                Registro y subsanación de observaciones emitidas por revisores o coordinadores.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="flex items-center justify-between text-xs border-t pt-2">
                <span className="text-muted-foreground">Supervisión:</span>
                <span className="font-bold text-foreground">Directiva §7.9</span>
              </div>
              <Link
                to="/observaciones"
                className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'w-full justify-between' })}
              >
                Ver Observaciones
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modales de workflow */}
      <RemitirModal
        open={modalRemitir}
        onClose={() => setModalRemitir(false)}
        dependenciaId={dependencia.id}
        dependenciaNombre={dependencia.nombre}
        haciaEtts={haciaEtts}
      />

      <RevisarModal
        open={modalRevisar}
        onClose={() => setModalRevisar(false)}
        dependenciaId={dependencia.id}
        dependenciaNombre={dependencia.nombre}
      />
    </div>
  )
}
