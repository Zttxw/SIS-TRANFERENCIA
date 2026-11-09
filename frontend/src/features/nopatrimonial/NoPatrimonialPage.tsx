import { useState } from 'react'
import {
  Boxes,
  Building2,
  PackagePlus,
  Pencil,
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
  useActualizarBienNoPatrimonial,
  useCrearBienNoPatrimonial,
  useEliminarBienNoPatrimonial,
  useNoPatrimonial,
} from './use-nopatrimonial'
import { NoPatrimonialModal } from './NoPatrimonialModal'
import type { BienNoPatrimonial, GuardarBienNoPatrimonialPayload } from '@/types/nopatrimonial'

function renderEstadoBadge(estado: string | null) {
  switch (estado) {
    case 'bueno':
      return (
        <span className="inline-flex rounded-full bg-success-soft px-2 py-0.5 text-mini font-semibold text-success-fg">
          Bueno
        </span>
      )
    case 'regular':
      return (
        <span className="inline-flex rounded-full bg-info-soft px-2 py-0.5 text-mini font-semibold text-info-fg">
          Regular
        </span>
      )
    case 'malo':
      return (
        <span className="inline-flex rounded-full bg-warning-soft px-2 py-0.5 text-mini font-semibold text-warning-fg">
          Malo
        </span>
      )
    case 'inservible':
      return (
        <span className="inline-flex rounded-full bg-danger-soft px-2 py-0.5 text-mini font-semibold text-danger-fg">
          Inservible
        </span>
      )
    default:
      return <span className="text-muted-foreground">-</span>
  }
}

export function NoPatrimonialPage() {
  const { dependenciaId } = useDependenciaActiva()
  const [pagina, setPagina] = useState(1)
  const [busqueda, setBusqueda] = useState('')

  const [modalAbierto, setModalAbierto] = useState(false)
  const [bienAEditar, setBienAEditar] = useState<BienNoPatrimonial | null>(null)

  const { data: estadoData } = useEstadoEntrega(dependenciaId)
  const { data: paginado, isLoading } = useNoPatrimonial({
    dependencia_id: dependenciaId ?? undefined,
    search: busqueda || undefined,
    page: pagina,
    per_page: 15,
  })

  const crearMut = useCrearBienNoPatrimonial()
  const actualizarMut = useActualizarBienNoPatrimonial()
  const eliminarMut = useEliminarBienNoPatrimonial()

  const estadoEntrega = estadoData?.entrega?.estado ?? null
  const esModificable =
    !estadoEntrega || estadoEntrega === 'borrador' || estadoEntrega === 'observada'
  const dependencia = estadoData?.dependencia

  const handleGuardar = (payload: GuardarBienNoPatrimonialPayload) => {
    if (bienAEditar) {
      actualizarMut.mutate(
        { id: bienAEditar.id, payload },
        {
          onSuccess: () => {
            setModalAbierto(false)
            setBienAEditar(null)
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

  const handleEliminar = (bien: BienNoPatrimonial) => {
    if (confirm(`¿Confirma retirar "${bien.denominacion}" del Anexo 06?`)) {
      eliminarMut.mutate(bien.id)
    }
  }

  if (!dependenciaId) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <AnexoHeader
          numeroAnexo="Anexo 06"
          titulo="Bienes No Patrimoniales"
          subtitulo="Seleccione un centro de costo en la parte superior para consultar o registrar los bienes auxiliares."
        />
        <Card className="border-dashed p-10 text-center">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground/60" />
          <h2 className="mt-4 text-base font-semibold">Selección de Centro de Costo requerida</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
            Utilice el selector de dependencias en la barra superior para gestionar los bienes no patrimoniales del área.
          </p>
        </Card>
      </div>
    )
  }

  const bienes = paginado?.data ?? []
  const meta = paginado?.meta

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <AnexoHeader
        numeroAnexo="Anexo 06"
        titulo="Inventario de Bienes No Patrimoniales"
        subtitulo="Activos auxiliares, herramientas, suministros y bienes no inventariados en el SIGA oficial (Directiva N.° 001-2026-MDSJ/A §7.6)"
        dependenciaCodigo={dependencia?.codigo}
        dependenciaNombre={dependencia?.nombre}
        acciones={
          <Can permiso="anexos.registrar">
            <Button
              size="sm"
              className="gap-1.5"
              disabled={!esModificable}
              onClick={() => {
                setBienAEditar(null)
                setModalAbierto(true)
              }}
            >
              <PackagePlus className="h-4 w-4" />
              Nuevo Bien No Patrimonial
            </Button>
          </Can>
        }
      />

      <AlertaBloqueoEntrega estadoEntrega={estadoEntrega} />

      {/* Búsqueda */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar bien no patrimonial por denominación, descripción o ubicación..."
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value)
                setPagina(1)
              }}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Bienes No Patrimoniales */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b bg-muted/40 font-medium text-muted-foreground">
              <tr>
                <th className="p-3">Denominación del Activo</th>
                <th className="p-3">Descripción / Detalle</th>
                <th className="p-3">Cantidad</th>
                <th className="p-3">Conservación</th>
                <th className="p-3">Ubicación</th>
                <th className="p-3">Observaciones</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Spinner className="mx-auto h-6 w-6 text-primary" />
                    <p className="mt-2">Cargando bienes no patrimoniales...</p>
                  </td>
                </tr>
              ) : bienes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-muted-foreground">
                    <Boxes className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                    No se registran bienes no patrimoniales declarados en este centro de costo.
                  </td>
                </tr>
              ) : (
                bienes.map((bien) => (
                  <tr key={bien.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-3 font-semibold text-foreground max-w-xs">
                      <p className="truncate">{bien.denominacion}</p>
                    </td>
                    <td className="p-3 max-w-xs text-muted-foreground">
                      <p className="line-clamp-2">{bien.descripcion ?? '-'}</p>
                    </td>
                    <td className="p-3 whitespace-nowrap font-medium text-foreground">
                      {bien.cantidad} {bien.unidad_medida}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {renderEstadoBadge(bien.estado_conservacion)}
                    </td>
                    <td className="p-3 max-w-xs text-muted-foreground">
                      <p className="truncate">{bien.ubicacion ?? '-'}</p>
                    </td>
                    <td className="p-3 max-w-xs text-muted-foreground">
                      <p className="line-clamp-2">{bien.observaciones ?? '-'}</p>
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
                              setBienAEditar(bien)
                              setModalAbierto(true)
                            }}
                            aria-label="Editar bien"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            disabled={!esModificable || eliminarMut.isPending}
                            onClick={() => handleEliminar(bien)}
                            aria-label="Eliminar bien"
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
      <NoPatrimonialModal
        open={modalAbierto}
        onClose={() => {
          setModalAbierto(false)
          setBienAEditar(null)
        }}
        onSave={handleGuardar}
        bien={bienAEditar}
        dependenciaId={dependenciaId}
        loading={crearMut.isPending || actualizarMut.isPending}
      />

      {/* Panel de Observaciones */}
      <ObservacionesAnexoPanel
        anexo="nopatrimonial"
        observableId={bienes[0]?.id}
        dependenciaId={dependenciaId ?? undefined}
        esModificable={esModificable}
      />
    </div>
  )
}

