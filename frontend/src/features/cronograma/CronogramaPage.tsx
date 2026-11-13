import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { usePermiso } from '@/auth/hooks'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { DataTable } from '@/components/ui/data-table'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { aplicarErroresAFormulario, notificarError } from '@/lib/api-errors'
import { listarOrganigrama } from '@/features/organization/dependencias.service'
import {
  cronogramaService,
  type ActividadCronograma,
  type ActividadPayload,
} from './cronograma.service'

const valoresIniciales: ActividadPayload = {
  nombre: '',
  etapa: '',
  descripcion: '',
  dependencia_id: null,
  fecha_inicio: '',
  fecha_vencimiento: '',
  hora_vencimiento: '',
  estado: 'pendiente',
  operacion: 'remision',
  orden: 0,
}

/** Etiqueta legible de la operación que gobierna el plazo. */
const ETIQUETA_OPERACION: Record<string, string> = {
  remision: 'Remisión',
}

/**
 * Vencimiento legible: fecha + hora de corte (hora de Lima). Sin hora, se
 * entiende «fin del día». Se muestra tal cual lo guarda el backend, que ya
 * interpreta el corte en America/Lima.
 */
function formatearVencimiento(
  fecha: string | null,
  hora: string | null,
): string {
  if (!fecha) return 'Sin plazo'
  const dia = fecha.slice(0, 10)
  if (!hora) return `${dia} · fin del día`
  return `${dia} · ${hora.slice(0, 5)}`
}

/**
 * Situación del plazo en lenguaje humano: cuántos días faltan o hace cuánto
 * venció. El bloqueo real lo calcula el backend (`vencida`); esto solo orienta.
 */
function situacionPlazo(
  fecha: string | null,
  vencida: boolean,
): { texto: string; tono: 'danger' | 'warning' | 'muted' } {
  if (!fecha) return { texto: 'Sin fecha de vencimiento', tono: 'muted' }
  if (vencida) return { texto: 'Plazo vencido', tono: 'danger' }
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const fin = new Date(`${fecha.slice(0, 10)}T00:00:00`)
  const dias = Math.round((fin.getTime() - hoy.getTime()) / 86_400_000)
  if (dias <= 0) return { texto: 'Vence hoy', tono: 'warning' }
  if (dias === 1) return { texto: 'Vence mañana', tono: 'warning' }
  return {
    texto: `Faltan ${dias} días`,
    tono: dias <= 3 ? 'warning' : 'muted',
  }
}

export function CronogramaPage() {
  const permitido = usePermiso('cronograma.gestionar')
  const cliente = useQueryClient()
  const confirmar = useConfirm()
  const [edicion, setEdicion] = useState<ActividadCronograma | 'nueva' | null>(
    null,
  )
  const [prorroga, setProrroga] = useState<ActividadCronograma | null>(null)
  const [fechaProrroga, setFechaProrroga] = useState('')
  const consulta = useQuery({
    queryKey: ['cronograma'],
    queryFn: cronogramaService.listar,
    enabled: permitido,
  })
  const catalogo = useQuery({
    queryKey: ['dependencias', 'organigrama-cronograma'],
    queryFn: () => listarOrganigrama(),
    enabled: permitido,
  })
  const {
    register,
    control,
    reset,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ActividadPayload>({ defaultValues: valoresIniciales })

  const actualizar = async () => {
    await cliente.invalidateQueries({ queryKey: ['cronograma'] })
  }
  const guardar = useMutation({
    mutationFn: (datos: ActividadPayload) =>
      cronogramaService.guardar(
        edicion && edicion !== 'nueva' ? edicion.id : null,
        {
          ...datos,
          etapa: datos.etapa?.trim() || null,
          descripcion: datos.descripcion?.trim() || null,
          fecha_inicio: datos.fecha_inicio || null,
          fecha_vencimiento: datos.fecha_vencimiento || null,
          hora_vencimiento: datos.hora_vencimiento || null,
        },
      ),
    onSuccess: async () => {
      await actualizar()
      setEdicion(null)
      toast.success('Actividad guardada.')
    },
    onError: (error) => {
      if (!aplicarErroresAFormulario(error, setError)) notificarError(error)
    },
  })
  const eliminar = useMutation({
    mutationFn: cronogramaService.eliminar,
    onSuccess: async () => {
      await actualizar()
      toast.success('Actividad eliminada.')
    },
    onError: (error) => notificarError(error),
  })
  const extender = useMutation({
    mutationFn: () => cronogramaService.prorrogar(prorroga!.id, fechaProrroga),
    onSuccess: async () => {
      await actualizar()
      setProrroga(null)
      toast.success('Prórroga registrada.')
    },
    onError: (error) => notificarError(error),
  })

  const abrir = (actividad: ActividadCronograma | 'nueva') => {
    reset(
      actividad === 'nueva'
        ? valoresIniciales
        : {
            ...actividad,
            fecha_inicio: actividad.fecha_inicio?.slice(0, 10) ?? '',
            fecha_vencimiento: actividad.fecha_vencimiento?.slice(0, 10) ?? '',
            hora_vencimiento: actividad.hora_vencimiento?.slice(0, 5) ?? '',
          },
    )
    setEdicion(actividad)
  }

  if (!permitido)
    return (
      <p role="alert">
        Su perfil requiere permiso para gestionar el cronograma.
      </p>
    )

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Cronograma de transferencia</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Define las etapas y plazos del proceso. Cuando una actividad de{' '}
            <strong>remisión</strong> vence, el sistema bloquea la remisión de
            las dependencias de su ámbito hasta que se prorrogue el plazo. Las
            horas de corte se interpretan en hora de Lima.
          </p>
        </div>
        <Button onClick={() => abrir('nueva')}>Nueva actividad</Button>
      </div>
      <DataTable
        filas={consulta.data}
        loading={consulta.isLoading}
        error={consulta.error}
        onReintentar={() => void consulta.refetch()}
        rowKey={(actividad) => actividad.id}
        vacio={{ titulo: 'El proceso todavía no tiene actividades' }}
        columnas={[
          {
            id: 'etapa',
            header: 'Etapa',
            cell: (a) => (
              <span className="inline-block rounded bg-muted px-2 py-0.5 text-xs font-medium">
                {a.etapa ?? 'General'}
              </span>
            ),
          },
          {
            id: 'nombre',
            header: 'Actividad',
            cell: (a) => (
              <div>
                <p className="font-medium">{a.nombre}</p>
                <p className="text-xs text-muted-foreground">
                  {a.dependencia?.nombre ?? 'Todo el proceso'} ·{' '}
                  {ETIQUETA_OPERACION[a.operacion] ?? a.operacion}
                </p>
              </div>
            ),
          },
          {
            id: 'fechas',
            header: 'Vencimiento',
            cell: (a) => {
              const sit = situacionPlazo(a.fecha_vencimiento, a.vencida)
              return (
                <div>
                  <p>
                    {formatearVencimiento(
                      a.fecha_vencimiento,
                      a.hora_vencimiento,
                    )}
                  </p>
                  <p
                    className={
                      sit.tono === 'danger'
                        ? 'text-xs text-danger-fg'
                        : sit.tono === 'warning'
                          ? 'text-xs text-warning-fg'
                          : 'text-xs text-muted-foreground'
                    }
                  >
                    {sit.texto}
                  </p>
                </div>
              )
            },
          },
          {
            id: 'estado',
            header: 'Estado',
            cell: (a) => (
              <span
                className={
                  a.vencida
                    ? 'text-danger-fg'
                    : a.estado === 'completada'
                      ? 'text-success-fg'
                      : 'text-info-fg'
                }
              >
                {a.vencida
                  ? 'Vencida'
                  : {
                      pendiente: 'Pendiente',
                      en_curso: 'En curso',
                      completada: 'Completada',
                    }[a.estado]}
              </span>
            ),
          },
          {
            id: 'acciones',
            header: 'Acciones',
            cell: (a) => (
              <div className="flex flex-wrap gap-1">
                <Button variant="ghost" size="sm" onClick={() => abrir(a)}>
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setProrroga(a)
                    setFechaProrroga(a.fecha_vencimiento?.slice(0, 10) ?? '')
                  }}
                >
                  Prorrogar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={eliminar.isPending}
                  onClick={async () => {
                    if (
                      await confirmar({
                        title: 'Eliminar actividad',
                        description: a.nombre,
                        confirmText: 'Eliminar',
                        variant: 'destructive',
                      })
                    )
                      eliminar.mutate(a.id)
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
        title={edicion === 'nueva' ? 'Nueva actividad' : 'Editar actividad'}
      >
        <form
          onSubmit={handleSubmit((datos) => guardar.mutate(datos))}
          className="max-h-[65vh] space-y-3 overflow-y-auto px-1"
        >
          <div className="space-y-1">
            <Label htmlFor="actividad-nombre">Nombre *</Label>
            <Input
              id="actividad-nombre"
              maxLength={200}
              {...register('nombre', { required: 'Ingrese el nombre.' })}
            />
            {errors.nombre && (
              <p className="text-xs text-danger-fg">{errors.nombre.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="actividad-etapa">Etapa</Label>
            <Input
              id="actividad-etapa"
              maxLength={120}
              {...register('etapa')}
            />
            {errors.etapa && (
              <p className="text-xs text-danger-fg">{errors.etapa.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="actividad-descripcion">Descripción</Label>
            <Textarea
              id="actividad-descripcion"
              maxLength={1000}
              {...register('descripcion')}
            />
            {errors.descripcion && (
              <p className="text-xs text-danger-fg">
                {errors.descripcion.message}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="actividad-dependencia">Ámbito</Label>
            <Controller
              name="dependencia_id"
              control={control}
              render={({ field }) => (
                <Select
                  id="actividad-dependencia"
                  buscable
                  value={field.value ?? 0}
                  onChange={(id) => field.onChange(id || null)}
                  options={[
                    { value: 0, label: 'Todo el proceso' },
                    ...(catalogo.data ?? []).map((d) => ({
                      value: d.id,
                      label: `${d.codigo} · ${d.nombre}`,
                    })),
                  ]}
                />
              )}
            />
            {catalogo.isError && (
              <p className="text-xs text-danger-fg">
                No se pudo cargar el catálogo de dependencias.
              </p>
            )}
            {errors.dependencia_id && (
              <p className="text-xs text-danger-fg">
                {errors.dependencia_id.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="actividad-inicio">Inicio</Label>
              <Input
                id="actividad-inicio"
                type="date"
                {...register('fecha_inicio')}
              />
              {errors.fecha_inicio && (
                <p className="text-xs text-danger-fg">
                  {errors.fecha_inicio.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="actividad-fin">Vencimiento</Label>
              <Input
                id="actividad-fin"
                type="date"
                {...register('fecha_vencimiento')}
              />
              {errors.fecha_vencimiento && (
                <p className="text-xs text-danger-fg">
                  {errors.fecha_vencimiento.message}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="actividad-hora">Hora de corte (opcional)</Label>
            <Input
              id="actividad-hora"
              type="time"
              {...register('hora_vencimiento')}
            />
            <p className="text-xs text-muted-foreground">
              Hora de Lima. Si la dejas vacía, el plazo vence al terminar el día.
            </p>
            {errors.hora_vencimiento && (
              <p className="text-xs text-danger-fg">
                {errors.hora_vencimiento.message}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="actividad-estado">Estado</Label>
            <Controller
              name="estado"
              control={control}
              render={({ field }) => (
                <Select
                  id="actividad-estado"
                  value={field.value}
                  onChange={field.onChange}
                  options={[
                    { value: 'pendiente', label: 'Pendiente' },
                    { value: 'en_curso', label: 'En curso' },
                    { value: 'completada', label: 'Completada' },
                  ]}
                />
              )}
            />
            {errors.estado && (
              <p className="text-xs text-danger-fg">{errors.estado.message}</p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Esta actividad controla el plazo de remisión: al vencer, bloquea la
            remisión de su ámbito hasta que se prorrogue.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={guardar.isPending}
              onClick={() => setEdicion(null)}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={guardar.isPending}>
              Guardar
            </Button>
          </div>
        </form>
      </Dialog>
      <Dialog
        open={prorroga !== null}
        onClose={() => {
          if (!extender.isPending) setProrroga(null)
        }}
        title="Prorrogar actividad"
        description={prorroga?.nombre}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            extender.mutate()
          }}
          className="space-y-4"
        >
          <Label htmlFor="fecha-prorroga">Nuevo vencimiento</Label>
          <Input
            id="fecha-prorroga"
            type="date"
            required
            min={
              prorroga?.fecha_vencimiento?.slice(0, 10) ||
              prorroga?.fecha_inicio?.slice(0, 10)
            }
            value={fechaProrroga}
            onChange={(e) => setFechaProrroga(e.target.value)}
          />
          {extender.error && (
            <p role="alert" className="text-sm text-danger-fg">
              {extender.error.message}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setProrroga(null)}
              disabled={extender.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={extender.isPending}>
              Registrar prórroga
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
