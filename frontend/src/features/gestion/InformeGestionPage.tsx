import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  AlertCircle,
  Building2,
  CheckCircle,
  Save,
  User,
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
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { useEstadoEntrega } from '@/features/dashboard/use-dashboard'
import { useGuardarInformeGestion, useInformeGestion } from './use-gestion'
import type { EstadoInformeGestion } from '@/types/gestion'

const informeSchema = z.object({
  principales_funciones: z
    .string()
    .min(10, 'Debe ingresar al menos 10 caracteres describiendo las funciones'),
  logros: z
    .string()
    .min(10, 'Debe ingresar al menos 10 caracteres describiendo los logros'),
  dificultades: z.string().optional().nullable(),
  asuntos_pendientes: z.string().optional().nullable(),
})

type FormValues = z.infer<typeof informeSchema>

export function InformeGestionPage() {
  const { dependenciaId } = useDependenciaActiva()
  const { data: estadoData, isLoading: cargandoEstado } = useEstadoEntrega(dependenciaId)
  const { data: informe, isLoading: cargandoInforme } = useInformeGestion(dependenciaId)
  const guardarMut = useGuardarInformeGestion()

  const [estadoDeseado, setEstadoDeseado] = useState<EstadoInformeGestion>('borrador')

  const dependencia = estadoData?.dependencia
  const estadoEntrega = estadoData?.entrega?.estado ?? null
  const esModificable =
    !estadoEntrega || estadoEntrega === 'borrador' || estadoEntrega === 'observada'

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(informeSchema),
    defaultValues: {
      principales_funciones: '',
      logros: '',
      dificultades: '',
      asuntos_pendientes: '',
    },
  })

  // Sincronizar datos cargados con el formulario
  useEffect(() => {
    if (informe) {
      reset({
        principales_funciones: informe.principales_funciones || '',
        logros: informe.logros || '',
        dificultades: informe.dificultades || '',
        asuntos_pendientes: informe.asuntos_pendientes || '',
      })
    } else {
      reset({
        principales_funciones: '',
        logros: '',
        dificultades: '',
        asuntos_pendientes: '',
      })
    }
  }, [informe, reset])

  const onSubmit = (values: FormValues) => {
    if (!dependenciaId) return

    guardarMut.mutate({
      dependencia_id: dependenciaId,
      principales_funciones: values.principales_funciones,
      logros: values.logros,
      dificultades: values.dificultades || null,
      asuntos_pendientes: values.asuntos_pendientes || null,
      estado: estadoDeseado,
    })
  }

  if (!dependenciaId) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <AnexoHeader
          numeroAnexo="Anexo 02"
          titulo="Informe de Gestión por Centro de Costo"
          subtitulo="Seleccione un centro de costo en la parte superior para consultar o registrar la memoria de gestión."
        />
        <Card className="border-dashed p-10 text-center">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground/60" />
          <h2 className="mt-4 text-base font-semibold">Selección de Centro de Costo requerida</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
            Utilice el selector de dependencias en la barra superior para elegir el despacho o centro de costo
            específico y gestionar su Anexo 02.
          </p>
        </Card>
      </div>
    )
  }

  const isLoading = cargandoEstado || cargandoInforme

  if (isLoading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Spinner className="h-8 w-8 text-primary" />
        <p className="text-sm text-muted-foreground">Cargando Informe de Gestión (Anexo 02)...</p>
      </div>
    )
  }

  const estadoInformeActual = informe?.estado ?? null

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Cabecera del Anexo */}
      <AnexoHeader
        numeroAnexo="Anexo 02"
        titulo="Informe de Gestión por Centro de Costo"
        subtitulo="Memoria descriptiva de funciones, metas cumplidas, dificultades y recomendaciones de gestión (Directiva N.° 001-2026-MDSJ/A §7.2)"
        dependenciaCodigo={dependencia?.codigo}
        dependenciaNombre={dependencia?.nombre}
        acciones={
          <Can permiso="anexos.registrar">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={!esModificable || guardarMut.isPending}
                onClick={() => {
                  setEstadoDeseado('borrador')
                  handleSubmit(onSubmit)()
                }}
              >
                <Save className="h-4 w-4" />
                Guardar Borrador
              </Button>

              <Button
                type="button"
                size="sm"
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={!esModificable || guardarMut.isPending}
                onClick={() => {
                  setEstadoDeseado('completado')
                  handleSubmit(onSubmit)()
                }}
              >
                <CheckCircle className="h-4 w-4" />
                Marcar Completado
              </Button>
            </div>
          </Can>
        }
      />

      {/* Alerta de bloqueo si la entrega está remitida/consolidada */}
      <AlertaBloqueoEntrega estadoEntrega={estadoEntrega} />

      {/* Ficha Informativa de la Unidad y Responsable */}
      <Card className="bg-muted/15">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Centro de Costo / Despacho</span>
              <div className="flex items-center gap-1.5 font-medium text-sm text-foreground">
                <Building2 className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">{dependencia?.nombre ?? 'Despacho institucional'}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Responsable del Despacho</span>
              <div className="flex items-center gap-1.5 font-medium text-sm text-foreground">
                <User className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">
                  {informe?.responsable
                    ? `${informe.responsable.nombres} ${informe.responsable.apellidos}`
                    : 'Titular / Encargado de área'}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Estado del Informe</span>
              <div>
                {estadoInformeActual === 'completado' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <CheckCircle className="h-3 w-3" />
                    Completado
                  </span>
                ) : estadoInformeActual === 'borrador' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                    <Save className="h-3 w-3" />
                    En Borrador
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                    <AlertCircle className="h-3 w-3" />
                    Pendiente de Registro
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulario Principal de Informe de Gestión */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Sección 1: Funciones Desarrolladas */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-primary/10 text-primary font-bold text-xs">
                1
              </div>
              <div>
                <CardTitle className="text-base">
                  Principales Funciones y Actividades Desarrolladas *
                </CardTitle>
                <CardDescription className="text-xs">
                  Detalle las atribuciones y actividades sustantivas ejecutadas en la unidad orgánica según el ROF / MOF.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Textarea
              rows={5}
              disabled={!esModificable || guardarMut.isPending}
              placeholder="Describa de manera ordenada las principales funciones desarrolladas por la unidad orgánica..."
              {...register('principales_funciones')}
              aria-invalid={Boolean(errors.principales_funciones)}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{errors.principales_funciones?.message ?? 'Obligatorio, mínimo 10 caracteres.'}</span>
              <span>{(watch('principales_funciones') || '').length} caracteres</span>
            </div>
          </CardContent>
        </Card>

        {/* Sección 2: Logros de Gestión */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-emerald-500/10 text-emerald-700 font-bold text-xs">
                2
              </div>
              <div>
                <CardTitle className="text-base">
                  Logros Alcanzados en el Periodo de Gestión *
                </CardTitle>
                <CardDescription className="text-xs">
                  Resalte metas institucionales alcanzadas, proyectos ejecutados y mejoras de procesos implementadas.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Textarea
              rows={5}
              disabled={!esModificable || guardarMut.isPending}
              placeholder="Indique los principales resultados y metas institucionales cumplidas..."
              {...register('logros')}
              aria-invalid={Boolean(errors.logros)}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{errors.logros?.message ?? 'Obligatorio, mínimo 10 caracteres.'}</span>
              <span>{(watch('logros') || '').length} caracteres</span>
            </div>
          </CardContent>
        </Card>

        {/* Sección 3: Dificultades y Limitaciones */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-amber-500/10 text-amber-700 font-bold text-xs">
                3
              </div>
              <div>
                <CardTitle className="text-base">
                  Dificultades y Limitaciones Presentadas
                </CardTitle>
                <CardDescription className="text-xs">
                  Aspectos presupuestales, logísticos, normativos o tecnológicos que obstaculizaron el cumplimiento óptimo de metas.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Textarea
              rows={4}
              disabled={!esModificable || guardarMut.isPending}
              placeholder="Indique las contingencias o limitaciones evidenciadas durante el periodo (opcional)..."
              {...register('dificultades')}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Opcional</span>
              <span>{(watch('dificultades') || '').length} caracteres</span>
            </div>
          </CardContent>
        </Card>

        {/* Sección 4: Asuntos Pendientes y Recomendaciones */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-purple-500/10 text-purple-700 font-bold text-xs">
                4
              </div>
              <div>
                <CardTitle className="text-base">
                  Asuntos Pendientes y Recomendaciones para la Gestión Entrante
                </CardTitle>
                <CardDescription className="text-xs">
                  Procesos clave en trámite, recomendaciones técnicas y contingencias urgentes a considerar.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Textarea
              rows={4}
              disabled={!esModificable || guardarMut.isPending}
              placeholder="Señale las acciones prioritarias a las que el servidor entrante debe dar atención inmediata..."
              {...register('asuntos_pendientes')}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Opcional</span>
              <span>{(watch('asuntos_pendientes') || '').length} caracteres</span>
            </div>
          </CardContent>
        </Card>

        {/* Barra de Acciones Inferior */}
        <Can permiso="anexos.registrar">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card p-4 shadow-sm">
            <div className="text-xs text-muted-foreground">
              {isDirty ? (
                <span className="text-amber-600 font-medium">Hay cambios no guardados en el formulario.</span>
              ) : (
                <span>Todos los cambios guardados.</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!esModificable || guardarMut.isPending}
                onClick={() => {
                  setEstadoDeseado('borrador')
                  handleSubmit(onSubmit)()
                }}
              >
                <Save className="mr-1.5 h-4 w-4" />
                Guardar como Borrador
              </Button>

              <Button
                type="button"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={!esModificable || guardarMut.isPending}
                onClick={() => {
                  setEstadoDeseado('completado')
                  handleSubmit(onSubmit)()
                }}
              >
                <CheckCircle className="mr-1.5 h-4 w-4" />
                Completar Anexo 02
              </Button>
            </div>
          </div>
        </Can>
      </form>

      {/* Panel Reutilizable de Observaciones del Anexo */}
      <ObservacionesAnexoPanel
        anexo="gestion"
        observableId={informe?.id}
        dependenciaId={dependenciaId ?? undefined}
        esModificable={esModificable}
      />
    </div>
  )
}
