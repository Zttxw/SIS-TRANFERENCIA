import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  Archive,
  ArrowRight,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileCheck2,
  FileText,
  FolderTree,
  History,
  Lock,
  Package,
  PackageOpen,
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
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
          <ShieldCheck className="h-3.5 w-3.5" />
          Consolidada
        </span>
      )
    case 'remitida':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
          <Clock className="h-3.5 w-3.5" />
          Remitida (En revisión)
        </span>
      )
    case 'observada':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-semibold text-red-700">
          <AlertCircle className="h-3.5 w-3.5" />
          Observada
        </span>
      )
    case 'subsanada':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
          <History className="h-3.5 w-3.5" />
          Subsanada
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
          <FileText className="h-3.5 w-3.5" />
          Borrador (En preparación)
        </span>
      )
  }
}

/**
 * Vista de Dashboard / Mi Entrega de Información.
 * Diseño compacto, simple y operativo basado en la arquitectura oficial de la MDSJ:
 * - Para Administrador Global sin dependencia: Tablero Operativo Institucional.
 * - Para Despachos / Servidores: Cuadro compacto de 7 Anexos + Tarjeta lateral de Remisión y Trazabilidad.
 */
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
          <Spinner className="h-8 w-8 text-[#3484A5]" />
        </div>
      )
    }
    return <TableroOperativoView onSeleccionarDependencia={(id) => setDependenciaId(id)} />
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner className="h-8 w-8 text-[#3484A5]" />
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

  const {
    dependencia,
    anexo02_gestion,
    anexo03_acervo,
    anexo04_patrimonio,
    anexo05_personal,
    anexo06_nopatrimonial,
    entrega,
  } = estadoData

  const estadoEntrega = entrega?.estado ?? 'borrador'
  const esEditable =
    estadoEntrega === 'borrador' ||
    estadoEntrega === 'observada' ||
    estadoEntrega === 'subsanada'
  const haciaEtts = entrega?.hacia_etts ?? (dependencia.parent_id === null)

  const superiorRevisor = haciaEtts
    ? 'Equipo de Transferencia del Titular Saliente (ETTS Institucional)'
    : 'su superior jerárquico inmediato'

  // Lista oficial de los 7 Anexos normativos según Directiva N.° 001-2026-MDSJ/GM
  const filasAnexos = [
    {
      id: 'anexo01',
      codigo: 'Anexo 01',
      nombre: 'Estructura Orgánica y Centros de Costo',
      icono: FolderTree,
      fuente: 'SGD / ROF',
      colorFuente: 'bg-sky-50 text-sky-700 border-sky-200',
      resumen: dependencia.parent_id
        ? `Nivel ${dependencia.nivel} · Dependencia subordinada`
        : `Nivel ${dependencia.nivel} · Órgano de primer nivel`,
      detalle: 'Carga oficial del organigrama y centros de costo institucionales',
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
      colorFuente: 'bg-slate-100 text-slate-700 border-slate-200',
      resumen: anexo02_gestion.existe
        ? 'Informe registrado y formulado'
        : 'Pendiente de formulación',
      detalle: 'Memoria, funciones, logros y dificultades de la unidad',
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
      colorFuente: 'bg-purple-50 text-purple-700 border-purple-200',
      resumen: `${anexo03_acervo.total_series} series documentales registradas`,
      detalle: 'Inventario físico de archivos y cajas de gestión',
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
      colorFuente: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      resumen: `${anexo04_patrimonio.confirmados} de ${anexo04_patrimonio.total_bienes} verificados (${anexo04_patrimonio.porcentaje_avance}%)`,
      detalle: `${anexo04_patrimonio.pendientes} bienes muebles pendientes de cotejo físico`,
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
      colorFuente: 'bg-teal-50 text-teal-700 border-teal-200',
      resumen: `${anexo05_personal.total_personal} servidores en padrón operativo`,
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
      colorFuente: 'bg-slate-100 text-slate-700 border-slate-200',
      resumen:
        anexo06_nopatrimonial.total_bienes > 0
          ? `${anexo06_nopatrimonial.total_bienes} bienes registrados`
          : 'Sin registros adicionales',
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
      fuente: 'Sistema / Consolidado',
      colorFuente: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      resumen:
        estadoEntrega === 'consolidada'
          ? 'Acta oficial lista para firma y emisión'
          : 'Requiere consolidación previa de la entrega',
      detalle: 'Acta formal de cierre y entrega de cargo',
      ruta: '/acta',
      accion: estadoEntrega === 'consolidada' ? 'Ver / Firmar' : 'Ver / Completar / Enviar',
      completado: estadoEntrega === 'consolidada',
    },
  ]

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* ========================================================
          BARRA DE CONTEXTO SUPERIOR Y PLAZOS INSTITUCIONALES
          ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs border-b border-border pb-3">
        <div className="flex items-center gap-2 flex-wrap text-slate-600">
          <span className="font-semibold text-slate-800 uppercase tracking-tight">
            {usuario?.servidor?.cargo || (esGlobal ? 'Administración Municipal' : 'Servidor Público')}
          </span>
          <span className="text-slate-300">·</span>
          <span className="font-mono text-[#3484A5] font-semibold">[{dependencia.codigo}]</span>
          <span className="font-medium truncate max-w-sm text-slate-700">
            {dependencia.nombre}
          </span>
          <span className="text-slate-300">·</span>
          <span className="font-semibold text-[#3484A5]">Mi entrega</span>
        </div>

        {/* Fechas de corte y plazos estilo píldora */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono text-[11px] font-medium border border-slate-200">
            <Calendar className="h-3.5 w-3.5 text-slate-500" />
            <span>
              Fecha de corte: <strong className="text-slate-800">31/10/2026</strong>
            </span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/15 text-amber-900 font-mono text-[11px] font-semibold border border-amber-300">
            <Clock className="h-3.5 w-3.5 text-amber-700" />
            <span>
              Plazo de entrega: <strong className="text-amber-950">07/11/2026</strong>
            </span>
          </div>
        </div>
      </div>

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

      {/* ========================================================
          TÍTULO Y DESCRIPCIÓN PRINCIPAL
          ======================================================== */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Mi entrega de información
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Verifique la información precargada desde el SGD y el SIGA, complete lo que falte y remita su entrega a su responsable inmediato.
        </p>
      </div>

      {/* ========================================================
          LAYOUT PRINCIPAL: DOS COLUMNAS (8 COLS + 4 COLS)
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ========================================================
            COLUMNA IZQUIERDA: INFORMACIÓN A VERIFICAR Y COMPLETAR
            ======================================================== */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="border shadow-xs overflow-hidden">
            <CardHeader className="py-3 px-4 border-b border-border bg-slate-50/70">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-[#3484A5]" />
                  <span>Información a verificar y completar</span>
                </CardTitle>
                <span className="text-[11px] font-mono text-[#3484A5] font-semibold">
                  7 Anexos Normativos
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-0 divide-y divide-border text-xs">
              {filasAnexos.map((anexo) => {
                const Icono = anexo.icono
                return (
                  <div
                    key={anexo.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 gap-3 hover:bg-slate-50/60 transition-colors"
                  >
                    {/* Identificación y Título */}
                    <div className="flex items-start gap-3 min-w-0 sm:w-[42%]">
                      <div className="h-8 w-8 rounded-lg bg-[#3484A5]/10 flex items-center justify-center text-[#3484A5] shrink-0 mt-0.5">
                        <Icono className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-800 hover:text-[#3484A5] transition-colors">
                            {anexo.codigo} · {anexo.nombre}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {anexo.detalle}
                        </p>
                      </div>
                    </div>

                    {/* Fuente de Datos */}
                    <div className="sm:w-[15%] shrink-0">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${anexo.colorFuente}`}
                      >
                        {anexo.fuente}
                      </span>
                    </div>

                    {/* Resumen y Avance */}
                    <div className="sm:w-[25%] min-w-0">
                      <p className="font-medium text-slate-700 text-xs truncate">
                        {anexo.resumen}
                      </p>
                      {anexo.esPatrimonio && typeof anexo.avance === 'number' && (
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                              style={{ width: `${anexo.avance}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono font-bold text-emerald-700">
                            {anexo.avance}%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="sm:w-[18%] flex items-center justify-end gap-1.5 shrink-0">
                      <Link
                        to={anexo.ruta}
                        className={buttonVariants({
                          variant: 'outline',
                          size: 'sm',
                          className:
                            'h-7 text-xs px-2.5 font-medium border-[#3484A5]/30 text-[#3484A5] hover:bg-[#3484A5]/10 gap-1 cursor-pointer',
                        })}
                      >
                        <span>{anexo.accion}</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Módulo Operativo: Documentos SGD (Asuntos Pendientes) */}
          <Card className="border shadow-xs overflow-hidden">
            <CardHeader className="py-2.5 px-4 border-b border-border bg-slate-50/70">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#3484A5]" />
                  <span>Documentos SGD · Reporte de Asuntos Pendientes</span>
                </CardTitle>
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold border bg-sky-50 text-sky-700 border-sky-200">
                  Fuente: SGD
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <p className="font-semibold text-slate-800">
                  {resumenDocs?.total_pendientes ?? 0} expedientes o documentos pendientes precargados
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Información precargada del SGD para verificar trámites no concluidos antes de remitir la entrega.
                </p>
              </div>
              <Link
                to="/documentos"
                className={buttonVariants({
                  variant: 'outline',
                  size: 'sm',
                  className:
                    'h-7 text-xs px-2.5 font-medium border-[#3484A5]/30 text-[#3484A5] hover:bg-[#3484A5]/10 gap-1 shrink-0 cursor-pointer',
                })}
              >
                <span>Ver Asuntos Pendientes</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* ========================================================
            COLUMNA DERECHA: REMITIR ENTREGA Y REGISTRO DE AUDITORÍA
            ======================================================== */}
        <div className="lg:col-span-4 space-y-4">
          {/* Tarjeta de Remisión */}
          <Card className="border shadow-xs">
            <CardHeader className="py-3 px-4 border-b border-border bg-slate-50/70">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <Send className="h-4 w-4 text-[#3484A5]" />
                  <span>Remitir mi entrega</span>
                </CardTitle>
                <div>{renderBadgeEstado(estadoEntrega)}</div>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3.5 text-xs">
              <p className="text-muted-foreground leading-relaxed">
                Al remitir, su información pasará a revisión formal de{' '}
                <strong className="text-slate-800">{superiorRevisor}</strong>. Solo podrá
                modificarla si se le solicita una corrección mediante observación.
              </p>

              {/* Alerta contextual según estado */}
              {esEditable ? (
                <div className="rounded-lg bg-amber-500/10 border border-amber-300/80 p-3 text-amber-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-950">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                    <span>Verificación obligatoria</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-normal">
                    Asegúrese de haber revisado los bienes patrimoniales y el acervo documental
                    antes de remitir formalmente el paquete de entrega.
                  </p>
                </div>
              ) : estadoEntrega === 'remitida' ? (
                <div className="rounded-lg bg-blue-500/10 border border-blue-300/80 p-3 text-blue-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-blue-950">
                    <Clock className="h-3.5 w-3.5 text-blue-700 shrink-0" />
                    <span>Entrega en revisión</span>
                  </div>
                  <p className="text-[11px] text-blue-800 leading-normal">
                    La entrega se encuentra en custodia del superior jerárquico. La edición queda
                    bloqueada hasta su validación.
                  </p>
                </div>
              ) : estadoEntrega === 'consolidada' ? (
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-300/80 p-3 text-emerald-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                    <span>Entrega consolidada</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-normal">
                    Su despacho ha completado formalmente el cierre de entrega de gestión.
                  </p>
                </div>
              ) : null}

              {/* Botón Principal de Workflow */}
              <div className="pt-1">
                <Can permiso="entregas.remitir">
                  {esEditable && (
                    <Button
                      onClick={() => setModalRemitir(true)}
                      className="w-full h-9 bg-[#3484A5] hover:bg-[#2b718d] text-white font-semibold text-xs gap-2 shadow-xs cursor-pointer"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Remitir mi entrega</span>
                    </Button>
                  )}
                </Can>

                <Can permiso="entregas.revisar">
                  {(estadoEntrega === 'remitida' || estadoEntrega === 'en_revision') && (
                    <Button
                      onClick={() => setModalRevisar(true)}
                      className="w-full h-9 bg-[#2CA792] hover:bg-[#258b7a] text-white font-semibold text-xs gap-2 shadow-xs cursor-pointer"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      <span>Revisar Entrega</span>
                    </Button>
                  )}
                </Can>

                <Can permiso="actas.generar">
                  {estadoEntrega === 'consolidada' && (
                    <Link
                      to="/acta"
                      className={buttonVariants({
                        className:
                          'w-full h-9 bg-[#3484A5] hover:bg-[#2b718d] text-white font-semibold text-xs gap-2 shadow-xs',
                      })}
                    >
                      <FileCheck2 className="h-4 w-4" />
                      <span>Generar Acta de Transferencia</span>
                    </Link>
                  )}
                </Can>

                {!esEditable && estadoEntrega !== 'consolidada' && (
                  <Button
                    disabled
                    variant="outline"
                    className="w-full h-9 text-xs text-muted-foreground gap-2 cursor-not-allowed"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span>Edición bloqueada por trámite</span>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tarjeta de Historial y Auditoría */}
          <Card className="border shadow-xs">
            <CardHeader className="py-2.5 px-4 border-b border-border bg-slate-50/50">
              <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <History className="h-3.5 w-3.5 text-[#3484A5]" />
                <span>Trazabilidad y Cronograma</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-4 space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Fecha de corte:</span>
                <span className="font-mono font-semibold text-slate-800">31/10/2026</span>
              </div>

              <div className="flex justify-between items-center text-muted-foreground">
                <span>Fecha de remisión:</span>
                <span className="font-mono text-slate-800">
                  {entrega?.remitida_en
                    ? new Date(entrega.remitida_en).toLocaleString('es-PE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Aún no remitida'}
                </span>
              </div>

              <div className="flex justify-between items-center text-muted-foreground">
                <span>Última revisión:</span>
                <span className="font-mono text-slate-800">
                  {entrega?.revisada_en
                    ? new Date(entrega.revisada_en).toLocaleString('es-PE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Pendiente'}
                </span>
              </div>

              <div className="flex justify-between items-center text-muted-foreground">
                <span>Destino jerárquico:</span>
                <span className="font-semibold text-slate-800">
                  {haciaEtts ? 'ETTS Institucional' : `Despacho Superior (ID ${dependencia.parent_id})`}
                </span>
              </div>

              {entrega?.comentario && (
                <div className="mt-2 rounded-lg bg-slate-100/80 p-2.5 text-[11px] border border-slate-200">
                  <span className="font-semibold text-slate-800 block mb-0.5">
                    Nota de Remisión:
                  </span>
                  <span className="text-slate-600">{entrega.comentario}</span>
                </div>
              )}
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
