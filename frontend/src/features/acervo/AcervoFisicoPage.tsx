import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import { useDependenciaActiva } from '@/auth/hooks'
import { Can } from '@/auth/Can'
import { AnexoCrudPage } from '@/components/anexos/AnexoCrudPage'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { aplicarErroresAFormulario } from '@/lib/api-errors'
import { useEstadoEntrega } from '@/features/dashboard/use-dashboard'
import { useActualizarAcervo, useCrearAcervo, useEliminarAcervo, useSeriesAcervo } from './use-acervo'
import { ANEXOS_ACERVO } from './anexos-acervo'
import { AcervoModal } from './AcervoModal'
import { AcervoPorAnio } from './AcervoPorAnio'
import { AcervoLista } from './AcervoLista'
import { SelectorVistaAcervo } from './SelectorVistaAcervo'
import type { AcervoDocumental } from '@/types/acervo'

const ANEXO = ANEXOS_ACERVO.fisico
const DESCRIPCION_VACIO = 'Registre sus archivadores, paquetes, empastados o cajas desde «Nueva Serie Física».'

/**
 * Anexo 03-A: el acervo físico que el centro de costo registra a mano (serie,
 * año, folios, tipo de unidad de conservación y ubicación).
 */
export function AcervoFisicoPage() {
  const { dependenciaId } = useDependenciaActiva()
  const confirmar = useConfirm()
  const { data: estadoData } = useEstadoEntrega(dependenciaId)
  const acervo = useSeriesAcervo(ANEXO.tipo, dependenciaId)

  const crearMut = useCrearAcervo()
  const actualizarMut = useActualizarAcervo()
  const eliminarMut = useEliminarAcervo()

  const estadoEntrega = estadoData?.entrega?.estado ?? null
  const esModificable = !estadoEntrega || estadoEntrega === 'borrador'

  const confirmarEliminarSerie = (item: AcervoDocumental) => ({
    title: 'Eliminar serie documental',
    description: `Se eliminará la serie "${item.serie_documental}" del ${ANEXO.numero}. Esta acción no se puede deshacer.`,
  })

  // Las vistas propias del acervo no usan la tabla de AnexoCrudPage, así que
  // confirman el borrado aquí.
  const eliminarConConfirmacion = async (item: AcervoDocumental) => {
    const ok = await confirmar({ ...confirmarEliminarSerie(item), variant: 'destructive', confirmText: 'Eliminar' })
    if (ok) eliminarMut.mutate(item.id)
  }

  const vistaComun = {
    anexo: ANEXO,
    loading: acervo.isLoading,
    error: acervo.error,
    onReintentar: acervo.refetch,
    esModificable,
    onEliminar: eliminarConConfirmacion,
    eliminando: eliminarMut.isPending,
    descripcionVacio: DESCRIPCION_VACIO,
  }

  return (
    <AnexoCrudPage<AcervoDocumental>
      numeroAnexo={ANEXO.numero}
      tituloCorto={ANEXO.titulo}
      titulo={`Registro del ${ANEXO.titulo}`}
      subtitulo="Archivadores, paquetes, empastados y cajas bajo custodia del centro de costo"
      aviso={
        <aside className="space-y-1 rounded-lg border border-info-border bg-info-soft p-4 text-sm text-info-fg">
          <p>Registre cada serie con su año, sus folios, el tipo de unidad de conservación y su ubicación. Incluya la documentación anterior a septiembre de 2025 que esté bajo su custodia.</p>
          <p>Los documentos del SGD van en el {ANEXOS_ACERVO.digital.numero}; no los registre aquí.</p>
        </aside>
      }
      anexoObservable={ANEXO.claveObservacion}
      guiaSeleccion="Utilice el selector de dependencias en la barra superior para registrar el acervo físico del despacho."
      dependenciaId={dependenciaId}
      dependencia={estadoData?.dependencia}
      estadoEntrega={estadoEntrega}
      esModificable={esModificable}
      filas={acervo.series}
      rowKey={(item) => item.id}
      loading={acervo.isLoading}
      error={acervo.error}
      onReintentar={acervo.refetch}
      meta={acervo.meta}
      onPageChange={acervo.setPagina}
      columnas={[]}
      busqueda={acervo.busqueda}
      onBuscar={acervo.buscar}
      placeholderBusqueda="Buscar por serie, año, tipo de unidad o ubicación..."
      filtrosExtra={<SelectorVistaAcervo vista={acervo.vista} onCambiar={acervo.setVista} />}
      textoNuevo="Nueva Serie Física"
      iconoNuevo={Plus}
      vacio={{ titulo: 'Sin series documentales', descripcion: DESCRIPCION_VACIO }}
      confirmarEliminar={confirmarEliminarSerie}
      onEliminar={(item) => eliminarMut.mutate(item.id)}
      eliminando={eliminarMut.isPending}
      vistaAlternativa={({ abrirAlta, abrirEdicion }) =>
        acervo.vista === 'anio' ? (
          <AcervoPorAnio
            {...vistaComun}
            series={acervo.series}
            onEditar={abrirEdicion}
            total={acervo.meta?.total}
            accionNuevo={
              <Can permiso="anexos.registrar">
                <Button size="sm" className="gap-1.5" disabled={!esModificable} onClick={abrirAlta}>
                  <Plus className="h-4 w-4" />
                  Nueva Serie Física
                </Button>
              </Can>
            }
          />
        ) : (
          <AcervoLista
            {...vistaComun}
            registros={acervo.series}
            onEditar={abrirEdicion}
            meta={acervo.meta}
            onPageChange={acervo.setPagina}
          />
        )
      }
      renderModal={({ open, onClose, registro }) => (
        <AcervoModal
          open={open}
          onClose={onClose}
          acervo={registro}
          dependenciaId={dependenciaId!}
          loading={crearMut.isPending || actualizarMut.isPending}
          onSave={(payload, { setError }) => {
            const onError = (err: unknown) => {
              if (aplicarErroresAFormulario(err, setError)) {
                toast.error('Revise los campos marcados en el formulario.')
              }
            }
            if (registro) {
              actualizarMut.mutate({ id: registro.id, payload }, { onSuccess: onClose, onError })
            } else {
              crearMut.mutate(payload, { onSuccess: onClose, onError })
            }
          }}
        />
      )}
    />
  )
}
