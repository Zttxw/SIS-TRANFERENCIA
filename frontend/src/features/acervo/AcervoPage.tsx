import { useState } from 'react'
import {
  Building2,
  FolderArchive,
  HardDrive,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'

import { useDependenciaActiva } from '@/auth/hooks'
import { Can } from '@/auth/Can'
import { AlertaBloqueoEntrega } from '@/components/anexos/AlertaBloqueoEntrega'
import { AnexoHeader } from '@/components/anexos/AnexoHeader'
import { ObservacionesAnexoPanel } from '@/components/anexos/ObservacionesAnexoPanel'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Spinner } from '@/components/ui/spinner'
import { useEstadoEntrega } from '@/features/dashboard/use-dashboard'
import {
  useActualizarAcervo,
  useAcervo,
  useCrearAcervo,
  useEliminarAcervo,
} from './use-acervo'
import { AcervoModal } from './AcervoModal'
import type { AcervoDocumental, GuardarAcervoPayload, TipoAcervo } from '@/types/acervo'

export function AcervoPage() {
  const { dependenciaId, setDependenciaId } = useDependenciaActiva()
  const [pagina, setPagina] = useState(1)
  const [busqueda, setBusqueda] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState<TipoAcervo | ''>('')

  const [modalAbierto, setModalAbierto] = useState(false)
  const [acervoAEditar, setAcervoAEditar] = useState<AcervoDocumental | null>(null)

  const { data: estadoData } = useEstadoEntrega(dependenciaId)
  const { data: paginado, isLoading } = useAcervo({
    dependencia_id: dependenciaId ?? undefined,
    tipo: tipoFiltro || undefined,
    search: busqueda || undefined,
    page: pagina,
    per_page: 15,
  })

  const crearMut = useCrearAcervo()
  const actualizarMut = useActualizarAcervo()
  const eliminarMut = useEliminarAcervo()

  const estadoEntrega = estadoData?.entrega?.estado ?? null
  const esModificable =
    !estadoEntrega || estadoEntrega === 'borrador' || estadoEntrega === 'observada'
  const dependencia = estadoData?.dependencia

  const handleGuardar = (payload: GuardarAcervoPayload) => {
    if (acervoAEditar) {
      actualizarMut.mutate(
        { id: acervoAEditar.id, payload },
        {
          onSuccess: () => {
            setModalAbierto(false)
            setAcervoAEditar(null)
          },
        },
      )
    } else {
      crearMut.mutate(payload, {
        onSuccess: () => {
          setModalAbierto(false)
        },
      })
    }
  }

  const handleEliminar = (acervo: AcervoDocumental) => {
    if (confirm(`¿Confirma eliminar la serie "${acervo.serie_documental}" del Anexo 03?`)) {
      eliminarMut.mutate(acervo.id)
    }
  }

  if (!dependenciaId) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <AnexoHeader
          numeroAnexo="Anexo 03"
          titulo="Inventario de Acervo Documental"
          subtitulo="Seleccione un centro de costo en la parte superior para consultar o registrar el acervo documental."
        />
        <Card className="border-dashed p-10 text-center">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground/60" />
          <h2 className="mt-4 text-base font-semibold">Selección de Centro de Costo requerida</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
            Utilice el selector de dependencias en la barra superior para gestionar el acervo documental del despacho.
          </p>
          <div className="mt-4 flex justify-center">
            <Button onClick={() => setDependenciaId(48)} className="gap-2">
              <Building2 className="h-4 w-4" />
              Cargar Oficina de Tecnología de la Información (OTI)
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const series = paginado?.data ?? []
  const meta = paginado?.meta

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <AnexoHeader
        numeroAnexo="Anexo 03"
        titulo="Inventario de Acervo Documental (Físico y Digital)"
        subtitulo="Series documentales, expedientes custodiados y archivos de gestión de la unidad (Directiva N.° 001-2026-MDSJ/A §7.3)"
        dependenciaCodigo={dependencia?.codigo}
        dependenciaNombre={dependencia?.nombre}
        acciones={
          <Can permiso="anexos.registrar">
            <Button
              size="sm"
              className="gap-1.5"
              disabled={!esModificable}
              onClick={() => {
                setAcervoAEditar(null)
                setModalAbierto(true)
              }}
            >
              <Plus className="h-4 w-4" />
              Nueva Serie Documental
            </Button>
          </Can>
        }
      />

      <AlertaBloqueoEntrega estadoEntrega={estadoEntrega} />

      {/* Barra de filtros y formato */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por serie documental, periodo o ubicación..."
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value)
                  setPagina(1)
                }}
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                aria-label="Filtrar por formato de acervo"
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                value={tipoFiltro}
                onChange={(e) => {
                  setTipoFiltro(e.target.value as TipoAcervo | '')
                  setPagina(1)
                }}
              >
                <option value="">Todos los formatos</option>
                <option value="fisico">Físico (Papel / Archivadores)</option>
                <option value="digital">Digital (Repositorios / Nube)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Acervo Documental */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b bg-muted/40 font-medium text-muted-foreground">
              <tr>
                <th className="p-3">Formato</th>
                <th className="p-3">Serie / Tipología Documental</th>
                <th className="p-3">Periodo</th>
                <th className="p-3">Cantidad</th>
                <th className="p-3">Ubicación</th>
                <th className="p-3">Descripción</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Spinner className="mx-auto h-6 w-6 text-primary" />
                    <p className="mt-2">Cargando inventario de acervo...</p>
                  </td>
                </tr>
              ) : series.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-muted-foreground">
                    <FolderArchive className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                    No se han registrado series documentales para esta dependencia.
                  </td>
                </tr>
              ) : (
                series.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-3 whitespace-nowrap">
                      {item.tipo === 'digital' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                          <HardDrive className="h-3 w-3" />
                          Digital
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                          <FolderArchive className="h-3 w-3" />
                          Físico
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-medium text-foreground max-w-xs">
                      <p className="truncate font-semibold">{item.serie_documental}</p>
                    </td>
                    <td className="p-3 whitespace-nowrap text-muted-foreground">
                      {item.periodo ?? '-'}
                    </td>
                    <td className="p-3 whitespace-nowrap font-medium text-foreground">
                      {item.cantidad_unidades} {item.unidad_conservacion}
                    </td>
                    <td className="p-3 max-w-xs text-muted-foreground">
                      <p className="truncate">{item.ubicacion ?? '-'}</p>
                    </td>
                    <td className="p-3 max-w-xs text-muted-foreground">
                      <p className="line-clamp-2">{item.descripcion ?? '-'}</p>
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <Can permiso="anexos.registrar">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            disabled={!esModificable}
                            onClick={() => {
                              setAcervoAEditar(item)
                              setModalAbierto(true)
                            }}
                            aria-label="Editar serie"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            disabled={!esModificable || eliminarMut.isPending}
                            onClick={() => handleEliminar(item)}
                            aria-label="Eliminar serie"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </Can>
                    </td>
                  </tr>
                ))
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

      {/* Modal Alta / Edición */}
      <AcervoModal
        open={modalAbierto}
        onClose={() => {
          setModalAbierto(false)
          setAcervoAEditar(null)
        }}
        onSave={handleGuardar}
        acervo={acervoAEditar}
        dependenciaId={dependenciaId}
        loading={crearMut.isPending || actualizarMut.isPending}
      />

      {/* Panel de Observaciones */}
      <ObservacionesAnexoPanel
        anexo="acervo"
        observableId={series[0]?.id}
        dependenciaId={dependenciaId ?? undefined}
        esModificable={esModificable}
      />
    </div>
  )
}

