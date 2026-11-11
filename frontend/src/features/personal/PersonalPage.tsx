import { useState } from 'react'
import { Briefcase, UserCheck, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

import { useDependenciaActiva } from '@/auth/hooks'
import { AnexoCrudPage } from '@/components/anexos/AnexoCrudPage'
import { BotonDescargarPdf } from '@/components/anexos/BotonDescargarPdf'
import type { ColumnaTabla } from '@/components/ui/data-table'
import { aplicarErroresAFormulario } from '@/lib/api-errors'
import { useEstadoEntrega } from '@/features/dashboard/use-dashboard'
import { personalService } from './personal.service'
import { useEliminarPersonal, useGuardarPersonal, usePersonal } from './use-personal'
import { PersonalModal } from './PersonalModal'
import type { Personal } from '@/types/personal'

const columnas: ColumnaTabla<Personal>[] = [
  {
    id: 'dni',
    header: 'DNI',
    cell: (s) => <span className="font-mono font-medium text-foreground">{s.dni}</span>,
  },
  {
    id: 'nombre',
    header: 'Apellidos y Nombres',
    cell: (s) => (
      <span className="font-semibold text-foreground">
        {s.apellidos}, {s.nombres}
      </span>
    ),
  },
  {
    id: 'cargo',
    header: 'Cargo / Función',
    cell: (s) => (
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <Briefcase className="h-3.5 w-3.5 text-primary" />
        {s.cargo}
      </span>
    ),
  },
  {
    id: 'regimen',
    header: 'Régimen Laboral',
    cell: (s) => (
      <span className="inline-flex rounded-full bg-secondary px-2 py-0.5 text-mini font-semibold text-secondary-foreground">
        {s.regimen_laboral}
      </span>
    ),
  },
  {
    id: 'modalidad',
    header: 'Modalidad',
    ocultarEnMovil: true,
    cell: (s) => <span className="text-muted-foreground">{s.modalidad_contractual ?? '-'}</span>,
  },
  {
    id: 'situacion',
    header: 'Situación',
    cell: (s) => (
      <span className="inline-flex items-center gap-1 rounded bg-success-soft px-1.5 py-0.5 text-mini font-medium text-success-fg">
        <UserCheck className="h-3 w-3" />
        {s.situacion_laboral ?? 'ACTIVO'}
      </span>
    ),
  },
]

export function PersonalPage() {
  const { dependenciaId } = useDependenciaActiva()
  const [pagina, setPagina] = useState(1)
  const [busqueda, setBusqueda] = useState('')

  const { data: estadoData } = useEstadoEntrega(dependenciaId)
  const {
    data: paginado,
    isLoading,
    error,
    refetch,
  } = usePersonal({
    dependencia_id: dependenciaId ?? undefined,
    search: busqueda || undefined,
    page: pagina,
    per_page: 15,
  })

  const guardarMut = useGuardarPersonal()
  const eliminarMut = useEliminarPersonal()

  const estadoEntrega = estadoData?.entrega?.estado ?? null
  const esModificable =
    !estadoEntrega || estadoEntrega === 'borrador' || estadoEntrega === 'observada'

  const colaboradores = paginado?.data ?? []

  return (
    <AnexoCrudPage<Personal>
      numeroAnexo="Anexo 05"
      tituloCorto="Padrón de Personal Asignado"
      titulo="Personal y Colaboradores Asignados a la Unidad"
      subtitulo="Padrón oficial de servidores, regímenes laborales y situación contractual (Directiva N.° 001-2026-MDSJ/A §7.5)"
      anexoObservable="personal"
      guiaSeleccion="Utilice el selector de dependencias en la barra superior para gestionar el padrón de servidores asignados."
      dependenciaId={dependenciaId}
      dependencia={estadoData?.dependencia}
      estadoEntrega={estadoEntrega}
      esModificable={esModificable}
      filas={colaboradores}
      rowKey={(s) => s.id}
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
      placeholderBusqueda="Buscar servidor por DNI, nombres, apellidos o cargo..."
      accionesExtra={
        <BotonDescargarPdf
          descargar={() => personalService.descargarPdf(dependenciaId as number)}
          disabled={!dependenciaId}
          etiqueta="PDF oficial"
        />
      }
      textoNuevo="Registrar Servidor"
      iconoNuevo={UserPlus}
      vacio={{
        titulo: 'Sin servidores registrados',
        descripcion: 'No se han registrado servidores para esta dependencia.',
      }}
      confirmarEliminar={(s) => ({
        title: 'Retirar servidor',
        description: `Se retirará a ${s.nombres} ${s.apellidos} del Anexo 05. Esta acción no se puede deshacer.`,
      })}
      onEliminar={(s) => eliminarMut.mutate(s.id)}
      eliminando={eliminarMut.isPending}
      renderModal={({ open, onClose, registro }) => (
        <PersonalModal
          open={open}
          onClose={onClose}
          personal={registro}
          dependenciaId={dependenciaId!}
          loading={guardarMut.isPending}
          onSave={(payload, { setError }) => {
            guardarMut.mutate(payload, {
              onSuccess: onClose,
              onError: (err) => {
                if (aplicarErroresAFormulario(err, setError)) {
                  toast.error('Revise los campos marcados en el formulario.')
                }
              },
            })
          }}
        />
      )}
    />
  )
}
