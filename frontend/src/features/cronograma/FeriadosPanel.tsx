import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { DataTable } from '@/components/ui/data-table'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { aplicarErroresAFormulario, notificarError } from '@/lib/api-errors'
import { feriadosService, type Feriado, type FeriadoPayload } from './cronograma.service'

const valoresIniciales: FeriadoPayload = { fecha: '', descripcion: '', alcance: 'nacional' }

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

function fechaLegible(iso: string): string {
  const [anio, mes, dia] = iso.slice(0, 10).split('-').map(Number)
  const fecha = new Date(anio, mes - 1, dia)
  return `${DIAS[fecha.getDay()]} ${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${anio}`
}

/**
 * Feriados y días no laborables (RF-22). Cada cambio recalcula en el backend
 * los vencimientos que dependen del plazo CGR, así que también se refresca el
 * cronograma.
 */
export function FeriadosPanel() {
  const cliente = useQueryClient()
  const confirmar = useConfirm()
  const [edicion, setEdicion] = useState<Feriado | 'nuevo' | null>(null)
  const consulta = useQuery({ queryKey: ['feriados'], queryFn: feriadosService.listar })
  const {
    register,
    control,
    reset,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FeriadoPayload>({ defaultValues: valoresIniciales })

  const refrescar = async () => {
    await Promise.all([
      cliente.invalidateQueries({ queryKey: ['feriados'] }),
      cliente.invalidateQueries({ queryKey: ['cronograma'] }),
    ])
  }
  const guardar = useMutation({
    mutationFn: (datos: FeriadoPayload) =>
      feriadosService.guardar(edicion && edicion !== 'nuevo' ? edicion.id : null, datos),
    onSuccess: async () => {
      await refrescar()
      setEdicion(null)
      toast.success('Feriado guardado. Se recalcularon los plazos CGR.')
    },
    onError: (error) => {
      if (!aplicarErroresAFormulario(error, setError)) notificarError(error)
    },
  })
  const eliminar = useMutation({
    mutationFn: feriadosService.eliminar,
    onSuccess: async () => {
      await refrescar()
      toast.success('Feriado eliminado. Se recalcularon los plazos CGR.')
    },
    onError: (error) => notificarError(error),
  })

  const abrir = (feriado: Feriado | 'nuevo') => {
    reset(feriado === 'nuevo' ? valoresIniciales : { ...feriado, fecha: feriado.fecha.slice(0, 10) })
    setEdicion(feriado)
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Feriados y días no laborables</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Los días hábiles van de lunes a viernes, sin estas fechas. Registre aquí los días no laborables
            que declare el Gobierno o la Municipalidad.
          </p>
        </div>
        <Button variant="outline" onClick={() => abrir('nuevo')}>
          Nuevo feriado
        </Button>
      </div>
      <DataTable
        filas={consulta.data}
        loading={consulta.isLoading}
        error={consulta.error}
        onReintentar={() => void consulta.refetch()}
        rowKey={(feriado) => feriado.id}
        vacio={{ titulo: 'No hay feriados registrados' }}
        columnas={[
          { id: 'fecha', header: 'Fecha', cell: (f) => <span className="whitespace-nowrap">{fechaLegible(f.fecha)}</span> },
          { id: 'descripcion', header: 'Descripción', cell: (f) => f.descripcion },
          { id: 'alcance', header: 'Alcance', cell: (f) => (f.alcance === 'nacional' ? 'Nacional' : 'Local') },
          {
            id: 'acciones',
            header: 'Acciones',
            cell: (f) => (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => abrir(f)}>
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={eliminar.isPending}
                  onClick={async () => {
                    if (
                      await confirmar({
                        title: 'Eliminar feriado',
                        description: `${fechaLegible(f.fecha)} · ${f.descripcion}`,
                        confirmText: 'Eliminar',
                        variant: 'destructive',
                      })
                    )
                      eliminar.mutate(f.id)
                  }}
                >
                  Eliminar
                </Button>
              </div>
            ),
          },
        ]}
      />
      <Dialog
        open={edicion !== null}
        onClose={() => {
          if (!guardar.isPending) setEdicion(null)
        }}
        title={edicion === 'nuevo' ? 'Nuevo feriado' : 'Editar feriado'}
      >
        <form onSubmit={handleSubmit((datos) => guardar.mutate(datos))} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="feriado-fecha">Fecha *</Label>
            <Input id="feriado-fecha" type="date" {...register('fecha', { required: 'Ingrese la fecha.' })} />
            {errors.fecha && <p className="text-xs text-danger-fg">{errors.fecha.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="feriado-descripcion">Descripción *</Label>
            <Input
              id="feriado-descripcion"
              maxLength={200}
              {...register('descripcion', { required: 'Ingrese la descripción.' })}
            />
            {errors.descripcion && <p className="text-xs text-danger-fg">{errors.descripcion.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="feriado-alcance">Alcance</Label>
            <Controller
              name="alcance"
              control={control}
              render={({ field }) => (
                <Select
                  id="feriado-alcance"
                  value={field.value}
                  onChange={field.onChange}
                  options={[
                    { value: 'nacional', label: 'Nacional' },
                    { value: 'local', label: 'Local (Cusco o Municipalidad)' },
                  ]}
                />
              )}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={guardar.isPending} onClick={() => setEdicion(null)}>
              Cancelar
            </Button>
            <Button type="submit" loading={guardar.isPending}>
              Guardar
            </Button>
          </div>
        </form>
      </Dialog>
    </section>
  )
}
