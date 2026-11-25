import { useDependenciaActiva } from '@/auth/hooks'
import { AnexoLayout } from '@/components/anexos/AnexoLayout'
import { BarraBusquedaAnexo } from '@/components/anexos/BarraBusquedaAnexo'
import { useEstadoEntrega } from '@/features/dashboard/use-dashboard'
import { useSeriesAcervo } from './use-acervo'
import { ANEXOS_ACERVO } from './anexos-acervo'
import { AcervoPorAnio } from './AcervoPorAnio'
import { AcervoLista } from './AcervoLista'
import { SelectorVistaAcervo } from './SelectorVistaAcervo'

const ANEXO = ANEXOS_ACERVO.digital
const DESCRIPCION_VACIO = 'El SGD no registra documentos emitidos ni recibidos por este centro de costo. Si tiene archivo físico, regístrelo en el '
  + `${ANEXOS_ACERVO.fisico.numero}.`

/**
 * Anexo 03-B: el acervo digital precargado del SGD (una serie por tipo de
 * documento, separada en emitidos y recibidos). Es de solo lectura: cambia al
 * reingerir el SGD. Cada serie despliega sus documentos en vivo.
 */
export function AcervoDigitalPage() {
  const { dependenciaId } = useDependenciaActiva()
  const { data: estadoData } = useEstadoEntrega(dependenciaId)
  const acervo = useSeriesAcervo(ANEXO.tipo, dependenciaId)

  const estadoEntrega = estadoData?.entrega?.estado ?? null
  const esModificable = !estadoEntrega || estadoEntrega === 'borrador'

  const vistaComun = {
    anexo: ANEXO,
    loading: acervo.isLoading,
    error: acervo.error,
    onReintentar: acervo.refetch,
    esModificable,
    descripcionVacio: DESCRIPCION_VACIO,
  }

  return (
    <AnexoLayout
      numeroAnexo={ANEXO.numero}
      tituloCorto={ANEXO.titulo}
      titulo={`Registro del ${ANEXO.titulo}`}
      subtitulo="Documentos emitidos y recibidos en el Sistema de Gestión Documental"
      guiaSeleccion="Utilice el selector de dependencias en la barra superior para consultar el acervo digital del despacho."
      dependenciaId={dependenciaId}
      dependencia={estadoData?.dependencia}
      estadoEntrega={estadoEntrega}
      esModificable={esModificable}
      anexoObservable={ANEXO.claveObservacion}
    >
      <aside className="space-y-1 rounded-lg border border-info-border bg-info-soft p-4 text-sm text-info-fg">
        <p>Se precarga del SGD (disponible desde septiembre de 2025): una serie por tipo de documento, separada en emitidos y recibidos, con su número de documentos. No se edita aquí.</p>
        <p>Despliegue una serie para consultar sus documentos y abrir su PDF.</p>
      </aside>
      <BarraBusquedaAnexo
        busqueda={acervo.busqueda}
        onBuscar={acervo.buscar}
        placeholder="Buscar por serie o año..."
        filtrosExtra={<SelectorVistaAcervo vista={acervo.vista} onCambiar={acervo.setVista} />}
      />
      {acervo.vista === 'anio' ? (
        <AcervoPorAnio {...vistaComun} series={acervo.series} total={acervo.meta?.total} />
      ) : (
        <AcervoLista {...vistaComun} registros={acervo.series} meta={acervo.meta} onPageChange={acervo.setPagina} />
      )}
    </AnexoLayout>
  )
}
