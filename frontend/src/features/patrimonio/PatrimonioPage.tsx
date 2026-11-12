import { Fragment, useState } from 'react'
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Filter,
  HelpCircle,
  List,
  Package,
  Search,
  UserSquare,
  XCircle,
} from 'lucide-react'

import { useAuth, useDependenciaActiva } from '@/auth/hooks'
import { Can } from '@/auth/Can'
import { AlertaBloqueoEntrega } from '@/components/anexos/AlertaBloqueoEntrega'
import { AnexoHeader } from '@/components/anexos/AnexoHeader'
import { BotonDescargarPdf } from '@/components/anexos/BotonDescargarPdf'
import { ObservacionesAnexoPanel } from '@/components/anexos/ObservacionesAnexoPanel'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { useEstadoEntrega } from '@/features/dashboard/use-dashboard'
import { BotonFirmaPeru } from '@/features/firmaperu/BotonFirmaPeru'
import {
  useBienesPatrimoniales,
  useResumenPatrimonial,
  useVerificarBien,
} from './use-patrimonio'
import { patrimonioService } from './patrimonio.service'
import { FilaVerificacionPatrimonio } from './FilaVerificacionPatrimonio'
import { agruparPatrimonioPorServidor } from './agrupar-por-servidor'
import type { BienPatrimonial, EstadoVerificacionBien, VerificarBienPayload } from '@/types/patrimonio'

const FILTRO_ESTADO_OPCIONES = [
  { value: '', label: 'Todos los estados' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'confirmado', label: 'Confirmados' },
  { value: 'con_observacion', label: 'Con observación' },
  { value: 'no_ubicado', label: 'No ubicados' },
]

function renderEstadoBadge(estado?: EstadoVerificacionBien | null) {
  switch (estado) {
    case 'confirmado':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-0.5 text-mini font-semibold text-success-fg">
          <CheckCircle2 className="h-3 w-3" />
          Confirmado
        </span>
      )
    case 'con_observacion':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2.5 py-0.5 text-mini font-semibold text-warning-fg">
          <AlertCircle className="h-3 w-3" />
          Con observación
        </span>
      )
    case 'no_ubicado':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2.5 py-0.5 text-mini font-semibold text-danger-fg">
          <XCircle className="h-3 w-3" />
          No ubicado
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-mini font-medium text-muted-foreground">
          <HelpCircle className="h-3 w-3" />
          Pendiente
        </span>
      )
  }
}

export function PatrimonioPage() {
  const { usuario } = useAuth()
  const { dependenciaId } = useDependenciaActiva()
  const esGlobal = usuario?.es_global === true

  const [pagina, setPagina] = useState(1)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<EstadoVerificacionBien | ''>('')

  // Id del bien cuya fila de verificación está desplegada en línea (o null).
  const [filaExpandidaId, setFilaExpandidaId] = useState<number | null>(null)
  const [vista, setVista] = useState<'lista' | 'servidor'>('lista')

  const { data: estadoData } = useEstadoEntrega(dependenciaId)
  const { data: resumen } = useResumenPatrimonial(dependenciaId)
  const { data: paginado, isLoading } = useBienesPatrimoniales({
    dependencia_id: dependenciaId ?? undefined,
    estado_verificacion: filtroEstado || undefined,
    search: busqueda || undefined,
    page: pagina,
    per_page: 15,
  })

  const verificarMut = useVerificarBien()

  const estadoEntrega = estadoData?.entrega?.estado ?? null
  const esModificable =
    !estadoEntrega || estadoEntrega === 'borrador' || estadoEntrega === 'observada'
  const dependencia = estadoData?.dependencia

  const alternarFila = (bienId: number) =>
    setFilaExpandidaId((actual) => (actual === bienId ? null : bienId))

  const handleGuardarVerificacion = (bienId: number, payload: VerificarBienPayload) => {
    verificarMut.mutate(
      { id: bienId, payload },
      { onSuccess: () => setFilaExpandidaId(null) },
    )
  }

  if (!dependenciaId && !esGlobal) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <AnexoHeader
          numeroAnexo="Anexo 04"
          titulo="Inventario Patrimonial de Bienes Muebles (SIGA)"
          subtitulo="Seleccione un centro de costo en la parte superior para consultar y verificar los bienes patrimoniales."
        />
        <Card className="border-dashed p-10 text-center">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground/60" />
          <h2 className="mt-4 text-base font-semibold">Selección de Centro de Costo requerida</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
            Utilice el selector de dependencias en la barra superior para cotejar los bienes patrimoniales del despacho.
          </p>
        </Card>
      </div>
    )
  }

  const bienes = paginado?.data ?? []
  const meta = paginado?.meta
  const totalColumnas = dependenciaId ? 8 : 9
  const esVistaServidor = vista === 'servidor'

  // Render de una fila de bien + su fila de verificación expandida (reutilizado
  // por la vista Lista y la vista Por servidor).
  const renderFilaBien = (bien: BienPatrimonial) => {
    const verif = bien.verificacion
    const estadoVerif = verif?.estado ?? 'pendiente'
    const expandida = filaExpandidaId === bien.id

    return (
      <Fragment key={bien.id}>
        <tr className={cn('transition-colors', expandida ? 'bg-muted/30' : 'hover:bg-muted/20')}>
          <td className="p-3 font-mono font-bold text-foreground whitespace-nowrap">
            {bien.codigo_patrimonial}
          </td>
          <td className="p-3 max-w-xs font-medium text-foreground">
            <p className="line-clamp-2">{bien.denominacion}</p>
          </td>
          {!dependenciaId && (
            <td className="p-3 max-w-[200px] text-nota text-muted-foreground truncate">
              <span className="font-mono text-primary font-semibold block">
                [{bien.dependencia?.codigo}]
              </span>
              <span className="truncate block">{bien.dependencia?.nombre}</span>
            </td>
          )}
          <td className="p-3 whitespace-nowrap text-muted-foreground">
            <div>{bien.marca ? `${bien.marca}` : 'S/M'}</div>
            <div className="text-mini text-muted-foreground/80">
              {bien.modelo ? `Mod: ${bien.modelo}` : ''} {bien.serie ? `· S/N: ${bien.serie}` : ''}
            </div>
          </td>
          <td className="p-3 whitespace-nowrap font-mono text-muted-foreground">
            {bien.valor != null ? `S/. ${Number(bien.valor).toFixed(2)}` : '-'}
          </td>
          <td className="p-3 max-w-[180px] text-muted-foreground truncate">
            {bien.servidor ? (
              `${bien.servidor.apellidos}, ${bien.servidor.nombres}`
            ) : (
              <span className="italic text-muted-foreground/60">Sin custodio</span>
            )}
          </td>
          <td className="p-3 whitespace-nowrap">{renderEstadoBadge(estadoVerif)}</td>
          <td className="p-3 whitespace-nowrap capitalize text-muted-foreground">
            {verif?.estado_conservacion ?? '-'}
          </td>
          <td className="p-3 text-right whitespace-nowrap">
            <Can permiso="bienes.verificar">
              <Button
                variant={estadoVerif === 'pendiente' && !expandida ? 'default' : 'outline'}
                size="sm"
                className="h-8 gap-1.5 border border-sky-700 bg-sky-700 px-3 text-xs font-semibold text-white shadow-sm hover:bg-sky-800"
                disabled={!esModificable}
                aria-expanded={expandida}
                onClick={() => alternarFila(bien.id)}
              >
                {expandida ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ClipboardCheck className="h-3.5 w-3.5" />
                )}
                {expandida ? 'Cerrar' : estadoVerif === 'pendiente' ? 'Verificar' : 'Editar'}
              </Button>
            </Can>
          </td>
        </tr>

        {expandida && (
          <FilaVerificacionPatrimonio
            bien={bien}
            colSpan={totalColumnas}
            loading={verificarMut.isPending}
            onCancelar={() => setFilaExpandidaId(null)}
            onGuardar={(payload) => handleGuardarVerificacion(bien.id, payload)}
          />
        )}
      </Fragment>
    )
  }

  const gruposServidor = esVistaServidor ? agruparPatrimonioPorServidor(bienes) : []

  const toggleVista = (
    <div className="flex items-center rounded-md border p-0.5">
      <Button
        type="button"
        variant={vista === 'lista' ? 'secondary' : 'ghost'}
        size="sm"
        className="h-7 gap-1.5 px-2.5"
        onClick={() => setVista('lista')}
        aria-pressed={vista === 'lista'}
      >
        <List className="h-3.5 w-3.5" />
        Lista
      </Button>
      <Button
        type="button"
        variant={esVistaServidor ? 'secondary' : 'ghost'}
        size="sm"
        className="h-7 gap-1.5 px-2.5"
        onClick={() => setVista('servidor')}
        aria-pressed={esVistaServidor}
      >
        <UserSquare className="h-3.5 w-3.5" />
        Por servidor
      </Button>
    </div>
  )

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AnexoHeader
        numeroAnexo="Anexo 04"
        titulo="Inventario Físico de Bienes Patrimoniales (SIGA-MEF)"
        subtitulo={
          dependencia
            ? "Cotejo de existencia física, estado de conservación y conciliación de activos (Directiva N.° 001-2026-MDSJ/A §7.4)"
            : "Inventario consolidado institucional de los bienes patrimoniales catalogados en el SIGA. Seleccione un centro de costo en el selector superior para acotar la verificación a un despacho."
        }
        dependenciaCodigo={dependencia?.codigo}
        dependenciaNombre={dependencia?.nombre ?? (esGlobal ? 'Municipalidad Distrital de San Jerónimo (Visión Global)' : undefined)}
        acciones={
          <>
            <BotonFirmaPeru key={dependenciaId} tipoDocumento="anexo04" dependenciaId={dependenciaId} />
            <BotonDescargarPdf
              descargar={() => patrimonioService.descargarPdf(dependenciaId as number)}
              disabled={!dependenciaId}
              etiqueta="PDF oficial"
            />
          </>
        }
      />

      {dependenciaId && <AlertaBloqueoEntrega estadoEntrega={estadoEntrega} />}

      {/* Tarjetas de Resumen y Avance */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="bg-muted/20">
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-medium text-muted-foreground">Total Bienes SIGA</span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground">
              {resumen?.total_bienes ?? 0}
            </div>
            <p className="text-nota text-muted-foreground">
              Valorizado: S/. {(resumen?.valor_total ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-success-soft border-success-border">
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-medium text-success-fg">
              Confirmados en Campo
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-success-fg">
              {resumen?.confirmados ?? 0}
            </div>
            <p className="text-nota text-success-fg">
              {resumen?.porcentaje_avance ?? 0}% de avance
            </p>
          </CardContent>
        </Card>

        <Card className="bg-warning-soft border-warning-border">
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-medium text-warning-fg">
              Pendientes de Verificación
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-warning-fg">
              {resumen?.pendientes ?? 0}
            </div>
            <p className="text-nota text-warning-fg">
              Por cotejar en campo
            </p>
          </CardContent>
        </Card>

        <Card className="bg-danger-soft border-danger-border">
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-medium text-danger-fg">
              Observados o No Ubicados
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-danger-fg">
              {(resumen?.no_ubicados ?? 0) + (resumen?.con_observacion ?? 0)}
            </div>
            <p className="text-nota text-danger-fg">
              {resumen?.no_ubicados ?? 0} no ubicados · {resumen?.con_observacion ?? 0} observados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de progreso global */}
      <Card className="border-sky-200 bg-sky-50/50 p-5 dark:border-sky-900 dark:bg-sky-950/20">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-muted-foreground">Progreso de verificación patrimonial:</span>
            <span className="font-bold text-foreground">{resumen?.porcentaje_avance ?? 0}%</span>
          </div>
          <div role="progressbar" aria-label="Progreso de verificación patrimonial" aria-valuemin={0} aria-valuemax={100} aria-valuenow={resumen?.porcentaje_avance ?? 0} className="h-3 w-full overflow-hidden rounded-full border border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all duration-500"
              style={{ width: `${resumen?.porcentaje_avance ?? 0}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {(resumen?.porcentaje_avance ?? 0) === 0
              ? 'Verificación sin iniciar. Pulse Verificar en cada bien para registrar el resultado.'
              : `${resumen?.pendientes ?? 0} bienes pendientes de verificación.`}
          </p>
        </div>
      </Card>

      {/* Búsqueda y Filtro de Estado */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código patrimonial (12 dígitos), denominación, marca o serie..."
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value)
                  setPagina(1)
                }}
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-2">
              {toggleVista}
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select
                className="w-52"
                options={FILTRO_ESTADO_OPCIONES}
                value={filtroEstado}
                onChange={(v) => {
                  setFiltroEstado(v as EstadoVerificacionBien | '')
                  setPagina(1)
                }}
                placeholder="Todos los estados"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Bienes Patrimoniales */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b bg-muted/40 font-medium text-muted-foreground">
              <tr>
                <th className="p-3">Cód. Patrimonial</th>
                <th className="p-3">Denominación del Bien (SIGA)</th>
                {!dependenciaId && <th className="p-3">Centro de Costo</th>}
                <th className="p-3">Marca / Modelo / Serie</th>
                <th className="p-3">Valor (S/.)</th>
                <th className="p-3">Custodio Asignado</th>
                <th className="p-3">Estado Verificación</th>
                <th className="p-3">Conservación</th>
                <th className="p-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={totalColumnas} className="py-12 text-center text-muted-foreground">
                    <Spinner className="mx-auto h-6 w-6 text-primary" />
                    <p className="mt-2">Cargando bienes patrimoniales...</p>
                  </td>
                </tr>
              ) : bienes.length === 0 ? (
                <tr>
                  <td colSpan={totalColumnas} className="py-10 text-center text-muted-foreground">
                    <Package className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                    {!dependenciaId
                      ? 'No se encontraron bienes patrimoniales registrados en el pliego.'
                      : 'No se encontraron bienes patrimoniales registrados en esta dependencia.'}
                  </td>
                </tr>
              ) : esVistaServidor ? (
                gruposServidor.map((grupo) => (
                  <Fragment key={grupo.servidorId ?? 'sin-custodio'}>
                    <tr className="bg-muted/40">
                      <td colSpan={totalColumnas} className="px-3 py-2">
                        <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
                          <UserSquare className="h-3.5 w-3.5 text-primary" />
                          {grupo.etiqueta}
                          <span className="font-normal text-muted-foreground">
                            · {grupo.bienes.length} bien{grupo.bienes.length !== 1 ? 'es' : ''}
                          </span>
                        </span>
                      </td>
                    </tr>
                    {grupo.bienes.map(renderFilaBien)}
                  </Fragment>
                ))
              ) : (
                bienes.map(renderFilaBien)
              )}
            </tbody>
          </table>
        </div>

        {esVistaServidor && meta && meta.last_page > 1 && (
          <p className="px-4 py-2 text-nota text-warning-fg">
            Agrupando por servidor los {bienes.length} bienes de esta página. Use la
            paginación para ver el resto del inventario.
          </p>
        )}

        {meta && (
          <Pagination
            currentPage={meta.current_page}
            lastPage={meta.last_page}
            total={meta.total}
            from={meta.from}
            to={meta.to}
            onPageChange={(p) => setPagina(p)}
            disabled={isLoading}
          />
        )}
      </Card>

      {/* Panel de Observaciones */}
      <ObservacionesAnexoPanel
        anexo="patrimonio"
        observableId={bienes[0]?.id}
        dependenciaId={dependenciaId ?? undefined}
        esModificable={esModificable}
      />
    </div>
  )
}
