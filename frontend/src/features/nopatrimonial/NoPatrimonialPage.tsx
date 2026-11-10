import { useState } from 'react'
import { PackagePlus } from 'lucide-react'
import { toast } from 'sonner'

import { useDependenciaActiva } from '@/auth/hooks'
import { AnexoCrudPage } from '@/components/anexos/AnexoCrudPage'
import { BotonDescargarPdf } from '@/components/anexos/BotonDescargarPdf'
import type { ColumnaTabla } from '@/components/ui/data-table'
import { aplicarErroresAFormulario } from '@/lib/api-errors'
import { useEstadoEntrega } from '@/features/dashboard/use-dashboard'
import {
  useActualizarBienNoPatrimonial,
  useCrearBienNoPatrimonial,
  useEliminarBienNoPatrimonial,
  useNoPatrimonial,
} from './use-nopatrimonial'
import { noPatrimonialService } from './nopatrimonial.service'
import { NoPatrimonialModal } from './NoPatrimonialModal'
import type { BienNoPatrimonial } from '@/types/nopatrimonial'

function EstadoBadge({ estado }: { estado: string | null }) {
  const mapa: Record<string, { label: string; clases: string }> = {
    bueno: { label: 'Bueno', clases: 'bg-success-soft text-success-fg' },
    regular: { label: 'Regular', clases: 'bg-info-soft text-info-fg' },
    malo: { label: 'Malo', clases: 'bg-warning-soft text-warning-fg' },
    inservible: { label: 'Inservible', clases: 'bg-danger-soft text-danger-fg' },
  }
  const item = estado ? mapa[estado] : undefined
  if (!item) return <span className="text-muted-foreground">-</span>
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-mini font-semibold ${item.clases}`}>
      {item.label}
    </span>
  )
}

const columnas: ColumnaTabla<BienNoPatrimonial>[] = [
  {
    id: 'denominacion',
    header: 'Denominación del Activo',
    className: 'max-w-xs',
    cell: (bien) => <p className="truncate font-semibold text-foreground">{bien.denominacion}</p>,
  },
  {
    id: 'descripcion',
    header: 'Descripción / Detalle',
    className: 'max-w-xs',
    ocultarEnMovil: true,
    cell: (bien) => <p className="line-clamp-2 text-muted-foreground">{bien.descripcion ?? '-'}</p>,
  },
  {
    id: 'cantidad',
    header: 'Cantidad',
    cell: (bien) => (
      <span className="font-medium text-foreground">
        {bien.cantidad} {bien.unidad_medida}
      </span>
    ),
  },
  {
    id: 'conservacion',
    header: 'Conservación',
    cell: (bien) => <EstadoBadge estado={bien.estado_conservacion} />,
  },
  {
    id: 'ubicacion',
    header: 'Ubicación',
    className: 'max-w-xs',
    ocultarEnMovil: true,
    cell: (bien) => <p className="truncate text-muted-foreground">{bien.ubicacion ?? '-'}</p>,
  },
  {
    id: 'observaciones',
    header: 'Observaciones',
    className: 'max-w-xs',
    ocultarEnMovil: true,
    cell: (bien) => <p className="line-clamp-2 text-muted-foreground">{bien.observaciones ?? '-'}</p>,
  },
]

export function NoPatrimonialPage() {
  const { dependenciaId } = useDependenciaActiva()
  const [pagina, setPagina] = useState(1)
  const [busqueda, setBusqueda] = useState('')

  const { data: estadoData } = useEstadoEntrega(dependenciaId)
  const {
    data: paginado,
    isLoading,
    error,
    refetch,
  } = useNoPatrimonial({
    dependencia_id: dependenciaId ?? undefined,
    search: busqueda || undefined,
    page: pagina,
    per_page: 15,
  })

  const crearMut = useCrearBienNoPatrimonial()
  const actualizarMut = useActualizarBienNoPatrimonial()
  const eliminarMut = useEliminarBienNoPatrimonial()

  const bienes = paginado?.data ?? []

  return (
    <AnexoCrudPage<BienNoPatrimonial>
      numeroAnexo="Anexo 06"
      tituloCorto="Bienes No Patrimoniales"
      titulo="Inventario de Bienes No Patrimoniales"
      subtitulo="Activos auxiliares, herramientas, suministros y bienes no inventariados en el SIGA oficial (Directiva N.° 001-2026-MDSJ/A §7.6)"
      guiaSeleccion="Utilice el selector de dependencias en la barra superior para gestionar los bienes no patrimoniales del área."
      dependenciaId={dependenciaId}
      dependencia={estadoData?.dependencia}
      filas={bienes}
      rowKey={(bien) => bien.id}
      loading={isLoading}
      error={error}
      onReintentar={refetch}
      meta={paginado?.meta}
      onPageChange={setPagina}
      columnas={columnas}
      busqueda={busqueda}
      onBuscar={(v) => {
        setBusqueda(v)
        setPagina(1)
      }}
      placeholderBusqueda="Buscar bien no patrimonial por denominación, descripción o ubicación..."
      accionesExtra={
        <BotonDescargarPdf
          descargar={() => noPatrimonialService.descargarPdf(dependenciaId as number)}
          disabled={!dependenciaId}
          etiqueta="PDF oficial"
        />
      }
      textoNuevo="Nuevo Bien No Patrimonial"
      iconoNuevo={PackagePlus}
      vacio={{
        titulo: 'Sin bienes no patrimoniales',
        descripcion: 'No se registran bienes no patrimoniales declarados en este centro de costo.',
      }}
      confirmarEliminar={(bien) => ({
        title: 'Retirar bien no patrimonial',
        description: `Se retirará "${bien.denominacion}" del Anexo 06. Esta acción no se puede deshacer.`,
      })}
      onEliminar={(bien) => eliminarMut.mutate(bien.id)}
      eliminando={eliminarMut.isPending}
      renderModal={({ open, onClose, registro }) => (
        <NoPatrimonialModal
          open={open}
          onClose={onClose}
          bien={registro}
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
