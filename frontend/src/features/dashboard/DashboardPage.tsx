import { estaEnFirma, fueRemitida } from '@/types/transferencia'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Archive,
  HardDrive,
  ArrowRight,
  BarChart3,
  Building2,
  Calendar,
  ClipboardList,
  Clock,
  FileCheck2,
  FileText,
  FolderTree,
  History,
  Package,
  PackageOpen,
  ShieldAlert,
  Users,
} from 'lucide-react'

import { useAuth, useDependenciaActiva, useModulo } from '@/auth/hooks'
import { puedeConsultarActa } from '@/auth/sesion-runtime'
import { QueSigueCard } from '@/components/anexos/QueSigueCard'
import { CoordinadorEtteAviso } from './CoordinadorEtteAviso'
import type { TipoDocumentoFirma } from '@/features/firmaperu/firmaperu.types'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { EntregaCentroCostoCard } from '@/features/entregas/EntregaCentroCostoCard'
import { ResumenAnexos } from './ResumenAnexos'
import { TablaAnexos } from './TablaAnexos'
import { TableroOperativoView } from './TableroOperativoView'
import { EquipoDashboard } from './EquipoDashboard'
import { AnexosEntidadPage } from '@/features/anexos-entidad/AnexosEntidadPage'
import { useEstadoEntrega, useResumenDocumentos } from './use-dashboard'
import { DocumentosIndicadorModal } from '@/features/documentos/DocumentosIndicadorModal'
import { nombreEstadoDocumento } from '@/features/documentos/estados-documentos'

/**
 * Vista de Dashboard / Mi Entrega de Información.
 * Diseño compacto, simple y operativo basado en la arquitectura oficial de la MDSJ:
 * - Para Administrador Global sin dependencia: Tablero Operativo Institucional.
 * - Para Despachos / Servidores: Cuadro compacto de 7 Anexos + Tarjeta lateral de Remisión y Trazabilidad.
 */
export function DashboardPage() {
  const { usuario, permisos } = useAuth()
  const { dependenciaId, setDependenciaId } = useDependenciaActiva()
  const esGlobal = usuario?.es_global === true

  // Coordinador ETTE: su portal es el explorador de las dependencias a su cargo
  // (reusa "Anexos de la Entidad" acotado por ámbito), no la vista "Mi entrega".
  const rolesUsuario = new Set(usuario?.roles.map(({ rol }) => rol) ?? [])
  const esDelegado =
    rolesUsuario.has('delegado_ette') &&
    !rolesUsuario.has('ette') &&
    !rolesUsuario.has('etts') &&
    !rolesUsuario.has('administrador')

  const { data: estadoData, isLoading, error } = useEstadoEntrega(dependenciaId)
  const conDocumentosPendientes = useModulo('documentos_pendientes')
  const { data: resumenDocs } = useResumenDocumentos(dependenciaId, conDocumentosPendientes)
  const [indicadorDocumental, setIndicadorDocumental] = useState<{ estado?: string } | null>(null)

  // El portal del delegado no depende de la dependencia activa; se resuelve tras
  // llamar a todos los hooks para no romper su orden.
  if (esDelegado) return <AnexosEntidadPage perfil="delegado" />

  // Si no hay una dependencia concreta seleccionada (visión global de admin / ETTS)
  if (!dependenciaId) {
    if (!esGlobal) {
      return (
        <div className="flex min-h-[400px] items-center justify-center">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      )
    }
    const roles = new Set(usuario?.roles.map(({ rol }) => rol) ?? [])
    const perfil = roles.has('ette') && !roles.has('etts') && !roles.has('administrador')
      ? 'ette' : roles.has('etts') && !roles.has('administrador') ? 'etts' : 'general'
    if (perfil !== 'general') return <EquipoDashboard perfil={perfil} />
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
    anexo03a_acervo_fisico,
    anexo03b_acervo_digital,
    anexo04_patrimonio,
    anexo05_personal,
    anexo06_nopatrimonial,
    entrega,
  } = estadoData

  const estadoEntrega = entrega?.estado ?? 'borrador'
  const esEditable = estadoEntrega === 'borrador'
  const haciaEtts = entrega?.hacia_etts ?? (dependencia.parent_id === null)

  // Lista oficial de los 7 Anexos normativos según Directiva N.° 001-2026-MDSJ/GM.
  // Los indicadores de firma enlazan con el módulo PDF y firma.
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
      tipoFirma: 'anexo01' as TipoDocumentoFirma,
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
      id: 'anexo03a',
      tipoFirma: 'anexo03a' as TipoDocumentoFirma,
      codigo: 'Anexo 03-A',
      nombre: 'Acervo Documentario Físico',
      icono: Archive,
      fuente: 'Manual',
      colorFuente: 'bg-purple-50 text-purple-700 border-purple-200',
      resumen: `${anexo03a_acervo_fisico.total_series} series físicas registradas`,
      detalle: 'Archivadores, paquetes, empastados y cajas bajo custodia',
      ruta: '/acervo-fisico',
      accion: 'Ver / Completar',
      completado: anexo03a_acervo_fisico.total_series > 0,
      estado: anexo03a_acervo_fisico.total_series > 0 ? 'Registrado' : 'Pendiente',
    },
    {
      id: 'anexo03b',
      tipoFirma: 'anexo03b' as TipoDocumentoFirma,
      codigo: 'Anexo 03-B',
      nombre: 'Acervo Documentario Digital',
      icono: HardDrive,
      fuente: 'SGD',
      colorFuente: 'bg-purple-50 text-purple-700 border-purple-200',
      resumen: `${anexo03b_acervo_digital.total_series} series del SGD`,
      detalle: 'Documentos emitidos y recibidos en el SGD (solo lectura)',
      ruta: '/acervo-digital',
      accion: 'Ver',
      completado: anexo03b_acervo_digital.total_series > 0,
      estado: anexo03b_acervo_digital.total_series > 0 ? 'Precargado' : 'Sin documentos en el SGD',
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
        estaEnFirma(estadoEntrega)
          ? 'En firma: el responsable y el coordinador ETTE la suscriben'
          : 'Se firma al cerrar la entrega, con el coordinador ETTE presente',
      detalle: 'Acta formal de cierre y entrega de cargo',
      ruta: '/acta',
      accion: 'Ver acta',
      completado: fueRemitida(estadoEntrega),
      estado: fueRemitida(estadoEntrega) ? 'Remitida' : 'Por suscribir',
    },
  ].filter((anexo) => anexo.id !== 'anexo07' || puedeConsultarActa(permisos))

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto">
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

      {rolesUsuario.has('responsable_centro_costo') && <CoordinadorEtteAviso dependenciaId={dependencia.id} />}

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
        dependenciaId={dependencia.id}
        estadoEntrega={estadoEntrega}
        esEditable={esEditable}
        anexos={filasAnexos
          .filter((a) => ['anexo02', 'anexo03a', 'anexo04', 'anexo05'].includes(a.id))
          .map((a) => ({ nombre: a.nombre, ruta: a.ruta, completado: a.completado }))}
      />

      {/* ========================================================
          TABLA DE ANEXOS — ancho completo
          ======================================================== */}
      <div id="anexos-entrega" className="scroll-mt-20 space-y-4">
        {/* Encabezado + resumen compacto de avance */}
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold tracking-tight text-foreground">
            <ClipboardList className="h-4 w-4 text-primary" />
            Anexos de Transferencia de Gestión
          </h2>
          <Link to="/pdf-firma" className={buttonVariants({ variant: 'outline', size: 'sm', className: 'gap-1.5 text-xs' })}>
            PDF y firma <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <ResumenAnexos filas={filasAnexos} />

        <TablaAnexos
          filas={filasAnexos}
          dependenciaId={dependencia.id}
        />
      </div>

      {/* Entrega del CC: cerrar para firma, firmar con el coordinador y remitir (D-07). */}
      {permisos.has('entregas.remitir') && <EntregaCentroCostoCard estado={estadoData} />}

      {/* ========================================================
          SECUNDARIO: Trazabilidad + Documentos SGD (dos columnas)
          ======================================================== */}
      <div className={cn('grid grid-cols-1 gap-4', conDocumentosPendientes && 'lg:grid-cols-2')}>
        {/* Trazabilidad y Cronograma */}
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
              <span>Cerrada para firma:</span>
              <span className="font-mono text-foreground">
                {entrega?.presentada_en
                  ? new Date(entrega.presentada_en).toLocaleString('es-PE', {
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
                {haciaEtts ? 'ETTS institucional' : 'Centro de costo padre (Anexo 01)'}
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

        {/* Documentos SGD · Reporte de Asuntos Pendientes */}
        {conDocumentosPendientes && <Card className="border shadow-xs overflow-hidden">
          <CardHeader className="py-2.5 px-4 border-b border-border bg-muted">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span>Documentos pendientes de la oficina</span>
              </CardTitle>
              <span className="inline-block px-2 py-0.5 rounded text-mini font-mono font-semibold border bg-info-soft text-info-fg border-info-border">
                SGD + manuales
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <button type="button" onClick={() => setIndicadorDocumental({})} className="text-left font-semibold text-primary underline underline-offset-2">
                {resumenDocs?.total_pendientes ?? 0} documentos por revisar
              </button>
              <div className="flex flex-wrap gap-2">
                {Object.entries(resumenDocs?.por_estado ?? {}).map(([estado, total]) => (
                  <button key={estado} type="button" onClick={() => setIndicadorDocumental({ estado })} className="text-xs text-primary underline underline-offset-2">
                    {nombreEstadoDocumento(estado)} · {total}
                  </button>
                ))}
              </div>
              <p className="text-nota text-muted-foreground">
                SGD: última importación · Manuales: agregados por la oficina.
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
              <span>Revisar pendientes</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>}
      </div>

      {indicadorDocumental && <DocumentosIndicadorModal key={`${dependencia.id}-${indicadorDocumental.estado ?? 'todos'}`}
        dependenciaId={dependencia.id} estado={indicadorDocumental.estado} onClose={() => setIndicadorDocumental(null)} />}

    </div>
  )
}
