import { useState } from 'react'
import { CalendarRange, List, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { useDependenciaActiva } from '@/auth/hooks'
import { Can } from '@/auth/Can'
import { AnexoCrudPage } from '@/components/anexos/AnexoCrudPage'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { Select } from '@/components/ui/select'
import { aplicarErroresAFormulario } from '@/lib/api-errors'
import { useEstadoEntrega } from '@/features/dashboard/use-dashboard'
import {
  useActualizarAcervo,
  useAcervo,
  useCrearAcervo,
  useEliminarAcervo,
} from './use-acervo'
import { AcervoModal } from './AcervoModal'
import { AcervoPorAnio } from './AcervoPorAnio'
import { AcervoLista } from './AcervoLista'
import type { AcervoDocumental, TipoAcervo } from '@/types/acervo'

type VistaAcervo = 'lista' | 'anio'

const FILTRO_TIPO_OPCIONES = [
  { value: '', label: 'Todos los formatos' },
  { value: 'fisico', label: 'Físico (Papel / Archivadores)' },
  { value: 'digital', label: 'Digital (Repositorios / Nube)' },
]

export function AcervoPage() {
  const { dependenciaId } = useDependenciaActiva()
  const confirmar = useConfirm()
  const [pagina, setPagina] = useState(1)
  const [busqueda, setBusqueda] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState<TipoAcervo | ''>('')
  const [vista, setVista] = useState<VistaAcervo>('lista')

  const esVistaAnio = vista === 'anio'

  const { data: estadoData } = useEstadoEntrega(dependenciaId)
  const {
    data: paginado,
    isLoading,
    error,
    refetch,
  } = useAcervo({
    dependencia_id: dependenciaId ?? undefined,
    tipo: tipoFiltro || undefined,
    search: busqueda || undefined,
    // La vista por año agrupa en cliente: trae todas las series (sin paginar).
    page: esVistaAnio ? 1 : pagina,
    per_page: esVistaAnio ? 500 : 15,
  })

  const crearMut = useCrearAcervo()
  const actualizarMut = useActualizarAcervo()
  const eliminarMut = useEliminarAcervo()

  const estadoEntrega = estadoData?.entrega?.estado ?? null
  const esModificable =
    !estadoEntrega || estadoEntrega === 'borrador' || estadoEntrega === 'observada'

  const series = paginado?.data ?? []

  const confirmarEliminarSerie = (item: AcervoDocumental) => ({
    title: 'Eliminar serie documental',
    description: `Se eliminará la serie "${item.serie_documental}" del Anexo 03. Esta acción no se puede deshacer.`,
  })

  // Borrado con confirmación suave para la vista por año (la de lista lo resuelve
  // AnexoCrudPage con su propio useConfirm).
  const eliminarConConfirmacion = async (item: AcervoDocumental) => {
    const ok = await confirmar({
      ...confirmarEliminarSerie(item),
      variant: 'destructive',
      confirmText: 'Eliminar',
    })
    if (ok) eliminarMut.mutate(item.id)
  }

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
        variant={esVistaAnio ? 'secondary' : 'ghost'}
        size="sm"
        className="h-7 gap-1.5 px-2.5"
        onClick={() => setVista('anio')}
        aria-pressed={esVistaAnio}
      >
        <CalendarRange className="h-3.5 w-3.5" />
        Por año
      </Button>
    </div>
  )

  return (
    <AnexoCrudPage<AcervoDocumental>
      numeroAnexo="Anexo 03"
      tituloCorto="Inventario de Acervo Documental"
      titulo="Inventario de Acervo Documental (Físico y Digital)"
      subtitulo="Series documentales, expedientes custodiados y archivos de gestión de la unidad (Directiva N.° 001-2026-MDSJ/A §7.3)"
      aviso={
        <aside className="space-y-1 rounded-lg border border-info-border bg-info-soft p-4 text-sm text-info-fg">
          <p className="font-semibold">SGD disponible desde septiembre de 2025</p>
          <p>La precarga muestra resúmenes de documentos digitales de los periodos importados, no todo el archivo histórico de la oficina ni sus documentos adjuntos.</p>
          <p>Use «Nueva Serie Documental» para registrar sus archivadores físicos, tomos y cajas: indique serie, desde año, hasta año, cantidad y ubicación. Incluya también la documentación anterior a septiembre de 2025 que esté bajo su custodia.</p>
        </aside>
      }
      anexoObservable="acervo"
      guiaSeleccion="Utilice el selector de dependencias en la barra superior para gestionar el acervo documental del despacho."
      dependenciaId={dependenciaId}
      dependencia={estadoData?.dependencia}
      estadoEntrega={estadoEntrega}
      esModificable={esModificable}
      filas={series}
      rowKey={(item) => item.id}
      loading={isLoading}
      error={error}
      onReintentar={refetch}
      meta={paginado?.meta}
      onPageChange={setPagina}
      columnas={[]}
      busqueda={busqueda}
      onBuscar={(v) => {
        setBusqueda(v)
        setPagina(1)
      }}
      placeholderBusqueda="Buscar por serie documental, periodo o ubicación..."
      filtrosExtra={
        <>
          {toggleVista}
          <Select
            className="w-56"
            options={FILTRO_TIPO_OPCIONES}
            value={tipoFiltro}
            onChange={(v) => {
              setTipoFiltro(v as TipoAcervo | '')
              setPagina(1)
            }}
            placeholder="Todos los formatos"
          />
        </>
      }
      textoNuevo="Nueva Serie Documental"
      iconoNuevo={Plus}
      vacio={{
        titulo: 'Sin series documentales',
        descripcion: 'No hay series para estos filtros. La ausencia de precarga SGD no significa que la oficina no tenga archivo físico. Registre sus archivadores desde «Nueva Serie Documental».',
      }}
      confirmarEliminar={confirmarEliminarSerie}
      onEliminar={(item) => eliminarMut.mutate(item.id)}
      eliminando={eliminarMut.isPending}
      vistaAlternativa={
        esVistaAnio
          ? ({ abrirAlta, abrirEdicion }) => (
              <AcervoPorAnio
                series={series}
                loading={isLoading}
                error={error}
                onReintentar={refetch}
                esModificable={esModificable}
                onEditar={abrirEdicion}
                onEliminar={eliminarConConfirmacion}
                eliminando={eliminarMut.isPending}
                total={paginado?.meta?.total}
                accionNuevo={
                  <Can permiso="anexos.registrar">
                    <Button size="sm" className="gap-1.5" disabled={!esModificable} onClick={abrirAlta}>
                      <Plus className="h-4 w-4" />
                      Nueva Serie Documental
                    </Button>
                  </Can>
                }
              />
            )
          : ({ abrirEdicion }) => (
              <AcervoLista
                registros={series}
                loading={isLoading}
                error={error}
                onReintentar={refetch}
                esModificable={esModificable}
                onEditar={abrirEdicion}
                onEliminar={eliminarConConfirmacion}
                eliminando={eliminarMut.isPending}
                meta={paginado?.meta}
                onPageChange={setPagina}
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
              actualizarMut.mutate(
                { id: registro.id, payload },
                { onSuccess: onClose, onError },
              )
            } else {
              crearMut.mutate(payload, { onSuccess: onClose, onError })
            }
          }}
        />
      )}
    />
  )
}
