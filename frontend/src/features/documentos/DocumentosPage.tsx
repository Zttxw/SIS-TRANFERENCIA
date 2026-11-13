import { useState } from 'react'
import {
  Building2,
  Calendar,
  FilePlus,
  FileText,
  Filter,
  Pencil,
  Search,
  Trash2,
} from 'lucide-react'

import { useDependenciaActiva } from '@/auth/hooks'
import { Can } from '@/auth/Can'
import { AlertaBloqueoEntrega } from '@/components/anexos/AlertaBloqueoEntrega'
import { AnexoHeader } from '@/components/anexos/AnexoHeader'
import { UsuarioRegistro } from '@/components/anexos/UsuarioRegistro'
import { ObservacionesAnexoPanel } from '@/components/anexos/ObservacionesAnexoPanel'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Spinner } from '@/components/ui/spinner'
import { useEstadoEntrega } from '@/features/dashboard/use-dashboard'
import {
  useActualizarDocumento,
  useCrearDocumento,
  useDocumentos,
  useEliminarDocumento,
  useResumenDocumentosPendientes,
} from './use-documentos'
import { DocumentoModal } from './DocumentoModal'
import { nombreEstadoDocumento } from './estados-documentos'
import type { DocumentoPendiente, GuardarDocumentoPayload } from '@/types/documentos'

export function DocumentosPage() {
  const { dependenciaId } = useDependenciaActiva()
  const [pagina, setPagina] = useState(1)
  const [busqueda, setBusqueda] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('')

  const [modalAbierto, setModalAbierto] = useState(false)
  const [docAEditar, setDocAEditar] = useState<DocumentoPendiente | null>(null)

  const { data: estadoData } = useEstadoEntrega(dependenciaId)
  const { data: resumen } = useResumenDocumentosPendientes(dependenciaId)
  const { data: paginado, isLoading } = useDocumentos({
    dependencia_id: dependenciaId ?? undefined,
    estado_atencion: estadoFiltro || undefined,
    search: busqueda || undefined,
    page: pagina,
    per_page: 15,
  })

  const crearMut = useCrearDocumento()
  const actualizarMut = useActualizarDocumento()
  const eliminarMut = useEliminarDocumento()

  const estadoEntrega = estadoData?.entrega?.estado ?? null
  const esModificable =
    !estadoEntrega || estadoEntrega === 'borrador' || estadoEntrega === 'observada'
  const dependencia = estadoData?.dependencia

  const handleGuardar = async (payload: GuardarDocumentoPayload) => {
    if (docAEditar) {
      await actualizarMut.mutateAsync(
        { id: docAEditar.id, payload },
        {
          onSuccess: () => {
            setModalAbierto(false)
            setDocAEditar(null)
          },
        },
      )
    } else {
      await crearMut.mutateAsync(payload, {
        onSuccess: () => {
          setModalAbierto(false)
        },
      })
    }
  }

  const handleEliminar = (doc: DocumentoPendiente) => {
    if (confirm(`¿Confirma eliminar el pendiente manual "${doc.asunto}"?`)) {
      eliminarMut.mutate(doc.id)
    }
  }

  if (!dependenciaId) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <AnexoHeader
          numeroAnexo="SGD"
          titulo="Documentos pendientes de la oficina"
          subtitulo="Seleccione un centro de costo en la barra superior para visualizar los documentos pendientes."
        />
        <Card className="border-dashed p-10 text-center">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground/60" />
          <h2 className="mt-4 text-base font-semibold">Selección de Centro de Costo requerida</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
            Seleccione el despacho o centro de costo en el selector superior para gestionar sus asuntos pendientes.
          </p>
        </Card>
      </div>
    )
  }

  const documentos = paginado?.data ?? []
  const meta = paginado?.meta

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <AnexoHeader
        numeroAnexo="SGD"
        titulo="Documentos pendientes de la oficina"
        subtitulo="Trámites por continuar en la siguiente gestión."
        dependenciaCodigo={dependencia?.codigo}
        dependenciaNombre={dependencia?.nombre}
        acciones={
          <Can permiso="anexos.registrar">
            <Button
              size="sm"
              className="gap-1.5"
              disabled={!esModificable}
              onClick={() => {
                setDocAEditar(null)
                setModalAbierto(true)
              }}
            >
              <FilePlus className="h-4 w-4" />
              Agregar pendiente manual
            </Button>
          </Can>
        }
      />

      <AlertaBloqueoEntrega estadoEntrega={estadoEntrega} />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <FileText className="h-4 w-4 text-info-fg" />
          SGD: última importación
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Pencil className="h-4 w-4" />
          Manual: agregado por la oficina
        </span>
      </div>

      {/* KPI Resumen */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="bg-muted/20">
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-medium text-muted-foreground">Total de registros</span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground">
              {resumen?.total_pendientes ?? 0}
            </div>
            <p className="text-nota text-muted-foreground">SGD + manuales</p>
          </CardContent>
        </Card>

        {Object.entries(resumen?.por_estado ?? {}).map(([estado, cantidad]) => (
          <Card key={estado} className="bg-muted/20">
            <CardHeader className="p-4 pb-1">
              <span className="text-xs font-medium text-muted-foreground">
                {nombreEstadoDocumento(estado)}
              </span>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-foreground">{cantidad}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros y búsqueda */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por N.° expediente, asunto o tipo de documento..."
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value)
                  setPagina(1)
                }}
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                aria-label="Filtrar por estado de atención"
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                value={estadoFiltro}
                onChange={(e) => {
                  setEstadoFiltro(e.target.value)
                  setPagina(1)
                }}
              >
                <option value="">Todos los estados</option>
                <option value="0">No leído (SGD)</option>
                <option value="1">Recibido sin atender (SGD)</option>
                <option value="SIN ESTADO">Sin estado informado</option>
                <option value="PENDIENTE">PENDIENTE</option>
                <option value="EN TRÁMITE">EN TRÁMITE</option>
                <option value="CON OBSERVACIONES">CON OBSERVACIONES</option>
                <option value="URGENTE">URGENTE</option>
                <option value="ATENDIDO">ATENDIDO</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Documentos */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b bg-muted/40 font-medium text-muted-foreground">
              <tr>
                <th className="p-3">N.° Doc / Exp</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Asunto / Descripción</th>
                <th className="p-3">Fecha</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Acción Pendiente</th>
                <th className="p-3">Origen</th>
                <th className="p-3">Registrado por</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    <Spinner className="mx-auto h-6 w-6 text-primary" />
                    <p className="mt-2">Cargando documentos pendientes...</p>
                  </td>
                </tr>
              ) : documentos.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-muted-foreground">
                    <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                    No se encontraron documentos pendientes registrados para esta dependencia.
                  </td>
                </tr>
              ) : (
                documentos.map((doc) => {
                  const esSgd = doc.fuente === 'sgd'
                  return (
                    <tr key={doc.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3 font-mono font-medium text-foreground whitespace-nowrap">
                        {doc.numero_documento ?? 'S/N'}
                      </td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {doc.tipo_documento ?? '-'}
                      </td>
                      <td className="p-3 max-w-xs font-normal text-foreground">
                        <p className="line-clamp-2">{doc.asunto}</p>
                      </td>
                      <td className="p-3 whitespace-nowrap text-muted-foreground">
                        {doc.fecha_documento ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {doc.fecha_documento.slice(0, 10)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="inline-flex rounded-full bg-secondary px-2 py-0.5 text-mini font-semibold text-secondary-foreground uppercase">
                          {nombreEstadoDocumento(doc.estado_atencion)}
                        </span>
                      </td>
                      <td className="p-3 max-w-xs text-muted-foreground">
                        <p className="line-clamp-2">{doc.accion_pendiente ?? '-'}</p>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {esSgd ? (
                          <span className="inline-flex rounded border border-info-border bg-info-soft px-1.5 py-0.5 text-mini font-medium text-info-fg">
                            SGD
                          </span>
                        ) : (
                          <span className="inline-flex rounded border border-muted bg-muted px-1.5 py-0.5 text-mini font-medium text-muted-foreground">
                            Manual
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <UsuarioRegistro
                          usuario={doc.registro_auditoria?.usuario}
                          fecha={doc.registro_auditoria?.created_at ?? doc.created_at}
                          fuente={doc.fuente}
                        />
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* Edición: permitida sólo para registros manuales y si la entrega es modificable */}
                          <Can permiso="anexos.registrar">
                            {!esSgd && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  disabled={!esModificable}
                                  onClick={() => {
                                    setDocAEditar(doc)
                                    setModalAbierto(true)
                                  }}
                                  aria-label="Editar documento"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  disabled={!esModificable || eliminarMut.isPending}
                                  onClick={() => handleEliminar(doc)}
                                  aria-label="Eliminar documento"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </Can>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

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

      {/* Modal de Alta/Edición */}
      <DocumentoModal
        open={modalAbierto}
        onClose={() => {
          setModalAbierto(false)
          setDocAEditar(null)
        }}
        onSave={handleGuardar}
        documento={docAEditar}
        dependenciaId={dependenciaId}
        loading={crearMut.isPending || actualizarMut.isPending}
      />

      {/* Bandeja de Observaciones del Anexo */}
      <ObservacionesAnexoPanel
        anexo="documento"
        observableId={documentos[0]?.id}
        dependenciaId={dependenciaId ?? undefined}
        esModificable={esModificable}
      />
    </div>
  )
}
