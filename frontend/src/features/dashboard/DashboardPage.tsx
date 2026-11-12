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
import { QueSigueCard } from '@/components/anexos/QueSigueCard'
import { FilaFirmaAnexo } from '@/features/firmaperu/FilaFirmaAnexo'
import type { TipoDocumentoFirma } from '@/features/firmaperu/firmaperu.types'
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
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-semibold text-success-fg">
          <ShieldCheck className="h-3.5 w-3.5" />
          Consolidada
        </span>
      )
    case 'remitida':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-info-soft px-2.5 py-0.5 text-xs font-semibold text-info-fg">
          <Clock className="h-3.5 w-3.5" />
          Remitida (En revisión)
        </span>
      )
    case 'observada':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-danger-soft px-2.5 py-0.5 text-xs font-semibold text-danger-fg">
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
        <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-semibold text-warning-fg">
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

  // Lista oficial de los 7 Anexos normativos según Directiva N.° 001-2026-MDSJ/GM.
  // `tipoFirma` marca los documentos que se firman en «Mi entrega» (02-07); el
  // anexo 01 (organigrama) se firma en su propio módulo, no aquí.
  const filasAnexos: Array<{
    id: string
    tipoFirma?: TipoDocumentoFirma
    codigo: string
    nombre: string
    icono: typeof FolderTree
    fuente: string
    colorFuente: string
    resumen: string
    detalle: string
    ruta: string
    accion: string
    estado: string
    completado: boolean
    esPatrimonio?: boolean
    avance?: number
  }> = [
    {
      id: 'anexo01',
      codigo: 'Anexo 01',
      nombre: 'Estructura Orgánica y Centros de Costo',
      icono: FolderTree,
      fuente: 'SGD / ROF',
      colorFuente: 'bg-info-soft text-info-fg border-info-border',
      resumen: dependencia.parent_id
        ? `Nivel ${dependencia.nivel} · Dependencia subordinada`
        : `Nivel ${dependencia.nivel} · Órgano de primer nivel`,
      detalle: 'Carga oficial del organigrama y centros de costo institucionales',
      ruta: '/organigrama',
      accion: 'Ver Organigrama',
      estado: 'Disponible',
      completado: true,
    },
    {
      id: 'anexo02',
      tipoFirma: 'anexo02' as TipoDocumentoFirma,
      codigo: 'Anexo 02',
      nombre: 'Informe de Gestión',
      icono: ClipboardList,
      fuente: 'Manual',
      colorFuente: 'bg-muted text-foreground border-border',
      resumen: anexo02_gestion.estado === 'completado'
        ? 'Informe de gestión completado'
        : anexo02_gestion.existe
          ? 'Informe guardado en borrador'
          : 'Pendiente de formulación',
      detalle: 'Memoria, funciones, logros y dificultades de la unidad',
      ruta: '/gestion',
      accion: 'Ver / Completar',
      estado: anexo02_gestion.estado === 'completado'
        ? 'Completado'
        : anexo02_gestion.existe ? 'En borrador' : 'Pendiente',
      completado: anexo02_gestion.estado === 'completado',
    },
    {
      id: 'anexo03',
      tipoFirma: 'anexo03' as TipoDocumentoFirma,
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
      estado: anexo03_acervo.total_series > 0 ? 'Registrado' : 'Pendiente',
    },
    {
      id: 'anexo04',
      tipoFirma: 'anexo04' as TipoDocumentoFirma,
      codigo: 'Anexo 04',
      nombre: 'Bienes Patrimoniales',
      icono: Package,
      fuente: 'SIGA / Manual',
      colorFuente: 'bg-success-soft text-success-fg border-success-border',
      resumen: `${anexo04_patrimonio.confirmados} de ${anexo04_patrimonio.total_bienes} verificados (${anexo04_patrimonio.porcentaje_avance}%)`,
      detalle: `${anexo04_patrimonio.pendientes} bienes muebles pendientes de cotejo físico`,
      ruta: '/patrimonio',
      accion: 'Ver / Cotejar',
      esPatrimonio: true,
      avance: anexo04_patrimonio.porcentaje_avance,
      completado: anexo04_patrimonio.confirmados === anexo04_patrimonio.total_bienes && anexo04_patrimonio.total_bienes > 0,
      estado: anexo04_patrimonio.confirmados === anexo04_patrimonio.total_bienes && anexo04_patrimonio.total_bienes > 0
        ? 'Verificado' : 'Pendiente de verificación',
    },
    {
      id: 'anexo05',
      tipoFirma: 'anexo05' as TipoDocumentoFirma,
      codigo: 'Anexo 05',
      nombre: 'Personal de la Dependencia',
      icono: Users,
      fuente: 'SGD',
      colorFuente: 'bg-secondary/10 text-secondary border-secondary/30',
      resumen: `${anexo05_personal.total_personal} servidores en padrón operativo`,
      detalle: 'Relación de servidores, régimen y situación contractual',
      ruta: '/personal',
      accion: 'Ver / Completar',
      completado: anexo05_personal.total_personal > 0,
      estado: anexo05_personal.total_personal > 0 ? 'Registrado' : 'Pendiente',
    },
    {
      id: 'anexo06',
      tipoFirma: 'anexo06' as TipoDocumentoFirma,
      codigo: 'Anexo 06',
      nombre: 'Bienes No Patrimoniales',
      icono: PackageOpen,
      fuente: 'Manual',
      colorFuente: 'bg-muted text-foreground border-border',
      resumen:
        anexo06_nopatrimonial.total_bienes > 0
          ? `${anexo06_nopatrimonial.total_bienes} bienes registrados`
          : 'Sin registros adicionales',
      detalle: 'Activos auxiliares o no catalogados en SIGA',
      ruta: '/nopatrimonial',
      accion: 'Ver / Completar',
      completado: true,
      estado: anexo06_nopatrimonial.total_bienes > 0 ? 'Registrado' : 'Sin registros',
    },
    {
      id: 'anexo07',
      tipoFirma: 'anexo07' as TipoDocumentoFirma,
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
      estado: estadoEntrega === 'consolidada' ? 'Consolidada' : 'Pendiente de consolidación',
    },
  ]

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* ========================================================
          BARRA DE CONTEXTO SUPERIOR Y PLAZOS INSTITUCIONALES
          ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs border-b border-border pb-3">
        <div className="flex items-center gap-2 flex-wrap text-muted-foreground">
          <span className="font-semibold text-foreground uppercase tracking-tight">
            {usuario?.servidor?.cargo || (esGlobal ? 'Administración Municipal' : 'Servidor Público')}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="font-mono text-primary font-semibold">[{dependencia.codigo}]</span>
          <span className="font-medium truncate max-w-sm text-foreground">
            {dependencia.nombre}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="font-semibold text-primary">Mi entrega</span>
        </div>

        {/* Fechas de corte y plazos estilo píldora */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted text-foreground font-mono text-nota font-medium border border-border">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span>
              Fecha de corte: <strong className="text-foreground">31/10/2026</strong>
            </span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-warning-soft text-warning-fg font-mono text-nota font-semibold border border-warning-border">
            <Clock className="h-3.5 w-3.5 text-warning-fg" />
            <span>
              Plazo de entrega: <strong className="text-warning-fg">07/11/2026</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Retorno al Tablero Global (Exclusiva para Administrador / ETTS) */}
      {esGlobal && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-primary/10 border border-primary/25 rounded-xl p-3 sm:px-4">
          <div className="flex items-center gap-2.5">
            <Building2 className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs sm:text-sm font-semibold text-foreground">
              Despacho en inspección: <span className="font-mono text-primary">[{dependencia.codigo}]</span> {dependencia.nombre}
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDependenciaId(null)}
            className="h-7 text-xs gap-1.5 self-start sm:self-auto border-primary/40 hover:bg-primary/15 cursor-pointer"
          >
            <BarChart3 className="h-3.5 w-3.5 text-primary" />
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

      {/* ¿Qué sigue? — una sugerencia contextual, descartable */}
      <QueSigueCard
        estadoEntrega={estadoEntrega}
        esEditable={esEditable}
        anexos={filasAnexos
          .filter((a) => ['anexo02', 'anexo03', 'anexo04', 'anexo05'].includes(a.id))
          .map((a) => ({ nombre: a.nombre, ruta: a.ruta, completado: a.completado }))}
      />

      {/* ========================================================
          LAYOUT PRINCIPAL: DOS COLUMNAS (8 COLS + 4 COLS)
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ========================================================
            COLUMNA IZQUIERDA: INFORMACIÓN A VERIFICAR Y COMPLETAR
            ======================================================== */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="border shadow-xs overflow-hidden">
            <CardHeader className="py-3 px-4 border-b border-border bg-muted">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  <span>Información a verificar y completar</span>
                </CardTitle>
                <span className="text-nota font-mono text-primary font-semibold">
                  7 Anexos Normativos
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-0 divide-y divide-border text-xs">
              {filasAnexos.map((anexo) => {
                const Icono = anexo.icono
                return (
                  <div key={anexo.id} className="p-3.5 hover:bg-muted transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Identificación y Título */}
                    <div className="flex items-start gap-3 min-w-0 sm:w-[42%]">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                        <Icono className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground hover:text-primary transition-colors">
                            {anexo.codigo} · {anexo.nombre}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-mini font-semibold ${
                              anexo.completado
                                ? 'border-success-border bg-success-soft text-success-fg'
                                : 'border-warning-border bg-warning-soft text-warning-fg'
                            }`}
                          >
                            {anexo.completado
                              ? <CheckCircle2 className="h-3 w-3" />
                              : <Clock className="h-3 w-3" />}
                            {anexo.estado}
                          </span>
                        </div>
                        <p className="text-nota text-muted-foreground truncate mt-0.5">
                          {anexo.detalle}
                        </p>
                      </div>
                    </div>

                    {/* Fuente de Datos */}
                    <div className="sm:w-[15%] shrink-0">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-mini font-mono font-semibold border ${anexo.colorFuente}`}
                      >
                        {anexo.fuente}
                      </span>
                    </div>

                    {/* Resumen y Avance */}
                    <div className="sm:w-[25%] min-w-0">
                      <p className="font-medium text-foreground text-xs truncate">
                        {anexo.resumen}
                      </p>
                      {anexo.esPatrimonio && typeof anexo.avance === 'number' && (
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full bg-success rounded-full transition-all duration-300"
                              style={{ width: `${anexo.avance}%` }}
                            />
                          </div>
                          <span className="text-mini font-mono font-bold text-success-fg">
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
                            'h-7 text-xs px-2.5 font-medium border-primary/30 text-primary hover:bg-primary/10 gap-1 cursor-pointer',
                        })}
                      >
                        <span>{anexo.accion}</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>

                  {/* Firma del documento (02-07). El acta 07 se firma solo con
                      la entrega consolidada. No afecta la edición del anexo. */}
                  {anexo.tipoFirma && (
                    <FilaFirmaAnexo
                      tipoDocumento={anexo.tipoFirma}
                      dependenciaId={dependencia.id}
                      bloqueado={anexo.tipoFirma === 'anexo07' && estadoEntrega !== 'consolidada'}
                      notaBloqueo="Requiere entrega consolidada"
                    />
                  )}
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Módulo Operativo: Documentos SGD (Asuntos Pendientes) */}
          <Card className="border shadow-xs overflow-hidden">
            <CardHeader className="py-2.5 px-4 border-b border-border bg-muted">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span>Documentos SGD · Reporte de Asuntos Pendientes</span>
                </CardTitle>
                <span className="inline-block px-2 py-0.5 rounded text-mini font-mono font-semibold border bg-info-soft text-info-fg border-info-border">
                  Fuente: SGD
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <p className="font-semibold text-foreground">
                  {resumenDocs?.total_pendientes ?? 0} expedientes o documentos pendientes precargados
                </p>
                <p className="text-nota text-muted-foreground">
                  Información precargada del SGD para verificar trámites no concluidos antes de remitir la entrega.
                </p>
              </div>
              <Link
                to="/documentos"
                className={buttonVariants({
                  variant: 'outline',
                  size: 'sm',
                  className:
                    'h-7 text-xs px-2.5 font-medium border-primary/30 text-primary hover:bg-primary/10 gap-1 shrink-0 cursor-pointer',
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
            <CardHeader className="py-3 px-4 border-b border-border bg-muted">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Send className="h-4 w-4 text-primary" />
                  <span>Remitir mi entrega</span>
                </CardTitle>
                <div>{renderBadgeEstado(estadoEntrega)}</div>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3.5 text-xs">
              <p className="text-muted-foreground leading-relaxed">
                Al remitir, su información pasará a revisión formal de{' '}
                <strong className="text-foreground">{superiorRevisor}</strong>. Solo podrá
                modificarla si se le solicita una corrección mediante observación.
              </p>

              {/* Alerta contextual según estado */}
              {esEditable ? (
                <div className="rounded-lg bg-warning-soft border border-warning-border p-3 text-warning-fg space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-warning-fg">
                    <AlertCircle className="h-3.5 w-3.5 text-warning-fg shrink-0" />
                    <span>Verificación obligatoria</span>
                  </div>
                  <p className="text-nota text-warning-fg leading-normal">
                    Asegúrese de haber revisado los bienes patrimoniales y el acervo documental
                    antes de remitir formalmente el paquete de entrega.
                  </p>
                </div>
              ) : estadoEntrega === 'remitida' ? (
                <div className="rounded-lg bg-info-soft border border-info-border p-3 text-info-fg space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-info-fg">
                    <Clock className="h-3.5 w-3.5 text-info-fg shrink-0" />
                    <span>Entrega en revisión</span>
                  </div>
                  <p className="text-nota text-info-fg leading-normal">
                    La entrega se encuentra en custodia del superior jerárquico. La edición queda
                    bloqueada hasta su validación.
                  </p>
                </div>
              ) : estadoEntrega === 'consolidada' ? (
                <div className="rounded-lg bg-success-soft border border-success-border p-3 text-success-fg space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-success-fg">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success-fg shrink-0" />
                    <span>Entrega consolidada</span>
                  </div>
                  <p className="text-nota text-success-fg leading-normal">
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
                      className="w-full h-9 bg-primary hover:bg-primary-hover text-white font-semibold text-xs gap-2 shadow-xs cursor-pointer"
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
                      className="w-full h-9 bg-secondary hover:bg-secondary-hover text-white font-semibold text-xs gap-2 shadow-xs cursor-pointer"
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
                          'w-full h-9 bg-primary hover:bg-primary-hover text-white font-semibold text-xs gap-2 shadow-xs',
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
            <CardHeader className="py-2.5 px-4 border-b border-border bg-muted">
              <CardTitle className="text-nota font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <History className="h-3.5 w-3.5 text-primary" />
                <span>Trazabilidad y Cronograma</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-4 space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Fecha de corte:</span>
                <span className="font-mono font-semibold text-foreground">31/10/2026</span>
              </div>

              <div className="flex justify-between items-center text-muted-foreground">
                <span>Fecha de remisión:</span>
                <span className="font-mono text-foreground">
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
                <span className="font-mono text-foreground">
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
                <span className="font-semibold text-foreground">
                  {haciaEtts ? 'ETTS Institucional' : `Despacho Superior (ID ${dependencia.parent_id})`}
                </span>
              </div>

              {entrega?.comentario && (
                <div className="mt-2 rounded-lg bg-muted p-2.5 text-nota border border-border">
                  <span className="font-semibold text-foreground block mb-0.5">
                    Nota de Remisión:
                  </span>
                  <span className="text-muted-foreground">{entrega.comentario}</span>
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
