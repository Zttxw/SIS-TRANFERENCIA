import { useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { Lock } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { aplicarErroresAFormulario, notificarError } from '@/lib/api-errors'
import type {
  ActaTransferencia,
  CondicionAnexoActa,
  GuardarActaPayload,
  IdentidadInterviniente,
  ItemActa,
} from '@/types/acta'
import { actaService } from './acta.service'
import { ACTA_QUERY_KEY } from './use-acta'

/** Ítems de la sección III, con su denominación oficial. */
const ITEMS: { clave: ItemActa; nombre: string; admiteNoAplica: boolean }[] = [
  { clave: 'anexo_02', nombre: 'Anexo 02 — Informe de Gestión', admiteNoAplica: false },
  { clave: 'anexo_03a', nombre: 'Anexo 03-A — Acervo Documentario Físico', admiteNoAplica: false },
  { clave: 'anexo_03b', nombre: 'Anexo 03-B — Acervo Documentario Digital (SGD)', admiteNoAplica: false },
  { clave: 'anexo_04', nombre: 'Anexo 04 — Bienes Patrimoniales', admiteNoAplica: false },
  { clave: 'anexo_05', nombre: 'Anexo 05 — Personal a cargo', admiteNoAplica: false },
  { clave: 'anexo_06', nombre: 'Anexo 06 — Bienes No Patrimoniales', admiteNoAplica: true },
  { clave: 'otros', nombre: 'Otros documentos', admiteNoAplica: true },
]

const ETIQUETA_CONDICION: Record<CondicionAnexoActa, string> = {
  entregado: 'Entregado',
  no_entregado: 'No entregado',
  no_aplica: 'No aplica',
}

interface FormularioActa {
  fecha_acta: string
  hora: string
  lugar: string
  otros_documentos: string
  observaciones: string
  condiciones: Record<ItemActa, { condicion: CondicionAnexoActa; observacion: string }>
}

function valoresDe(acta: ActaTransferencia): FormularioActa {
  const condiciones = Object.fromEntries(
    ITEMS.map(({ clave }) => [
      clave,
      {
        condicion: acta.anexos_entregados?.[clave]?.condicion ?? 'no_entregado',
        observacion: acta.anexos_entregados?.[clave]?.observacion ?? '',
      },
    ]),
  ) as FormularioActa['condiciones']

  return {
    fecha_acta: acta.fecha_acta?.slice(0, 10) ?? '',
    hora: acta.hora?.slice(0, 5) ?? '',
    lugar: acta.lugar ?? '',
    otros_documentos: acta.otros_documentos ?? '',
    observaciones: acta.observaciones ?? '',
    condiciones,
  }
}

function identidad(valor: string | IdentidadInterviniente | null | undefined): IdentidadInterviniente {
  if (!valor) return { nombre: '', dni: '', cargo: '' }
  if (typeof valor === 'string') return { nombre: valor, dni: '', cargo: '' }
  return valor
}

/**
 * Datos del Acta 07 que completan las partes antes de firmar (fase 8): fecha,
 * hora y lugar de la reunión, condición y observación de cada documento, otros
 * documentos y comentarios. Las secciones I, II y IV las arma el sistema. Solo
 * se envían las condiciones que la persona cambió, para que las demás sigan
 * reflejando la presencia de registros.
 */
export function ActaDatosForm({ acta, dependenciaId }: { acta: ActaTransferencia; dependenciaId: number }) {
  const cliente = useQueryClient()
  const {
    register,
    control,
    reset,
    handleSubmit,
    setError,
    formState: { errors, dirtyFields, isDirty },
  } = useForm<FormularioActa>({ defaultValues: valoresDe(acta) })

  useEffect(() => {
    reset(valoresDe(acta))
  }, [acta, reset])

  const guardar = useMutation({
    mutationFn: (payload: GuardarActaPayload) => actaService.guardar(dependenciaId, payload),
    onSuccess: async (actualizada) => {
      cliente.setQueryData([ACTA_QUERY_KEY, dependenciaId], actualizada)
      await cliente.invalidateQueries({ queryKey: ['firmaperu'] })
      toast.success('Datos del acta guardados. Genere de nuevo el PDF antes de firmar.')
    },
    onError: (error) => {
      if (!aplicarErroresAFormulario(error, setError)) notificarError(error)
    },
  })

  const enviar = (datos: FormularioActa) => {
    const condiciones: GuardarActaPayload['condiciones'] = {}
    for (const { clave } of ITEMS) {
      const cambio = dirtyFields.condiciones?.[clave]
      if (!cambio) continue
      condiciones[clave] = {
        ...(cambio.condicion ? { condicion: datos.condiciones[clave].condicion } : {}),
        ...(cambio.observacion ? { observacion: datos.condiciones[clave].observacion.trim() || null } : {}),
      }
    }
    guardar.mutate({
      fecha_acta: datos.fecha_acta,
      hora: datos.hora || null,
      lugar: datos.lugar.trim(),
      otros_documentos: datos.otros_documentos.trim() || null,
      observaciones: datos.observaciones.trim() || null,
      condiciones,
    })
  }

  const entrega = identidad(acta.intervinientes?.titular_saliente)
  const recepcion = acta.intervinientes?.coordinador_ette
  const bloqueada = !acta.editable

  return (
    <form onSubmit={handleSubmit(enviar)} className="space-y-4">
      {bloqueada && (
        <p role="status" className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
          <Lock className="h-4 w-4 shrink-0" />
          El acta ya tiene firmas sobre su versión vigente o la entrega fue suscrita: sus datos quedan fijos.
        </p>
      )}

      <fieldset disabled={bloqueada} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Apertura</CardTitle>
            <CardDescription className="text-xs">Lugar, fecha y hora de la reunión en que se suscribe el acta.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="acta-fecha">Fecha *</Label>
              <Input id="acta-fecha" type="date" {...register('fecha_acta', { required: 'Ingrese la fecha.' })} />
              {errors.fecha_acta && <p className="text-xs text-danger-fg">{errors.fecha_acta.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="acta-hora">Hora</Label>
              <Input id="acta-hora" type="time" {...register('hora')} />
              {errors.hora && <p className="text-xs text-danger-fg">{errors.hora.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="acta-lugar">Lugar *</Label>
              <Input id="acta-lugar" maxLength={200} {...register('lugar', { required: 'Ingrese el lugar.' })} />
              {errors.lugar && <p className="text-xs text-danger-fg">{errors.lugar.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">I y II. Intervinientes</CardTitle>
            <CardDescription className="text-xs">
              Los define el sistema: el responsable del centro de costo y quien firma por el ETTE (coordinador o titular suplente).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-xs sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Responsable que entrega</p>
              <p className="font-semibold">{entrega.nombre || 'Sin responsable asignado'}</p>
              <p className="text-muted-foreground">DNI {entrega.dni || '—'} · {entrega.cargo || 'Sin cargo'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{recepcion?.calidad ?? 'Coordinador acreditado por el ETTE'}</p>
              <p className="font-semibold">{recepcion?.nombre || 'Sin coordinador asignado'}</p>
              <p className="text-muted-foreground">DNI {recepcion?.dni || '—'}{recepcion?.cargo ? ` · ${recepcion.cargo}` : ''}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">III. Información y documentación entregada</CardTitle>
            <CardDescription className="text-xs">
              La condición inicial sale de los registros de cada anexo. «No aplica» solo corresponde al Anexo 06 y a otros documentos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ITEMS.map(({ clave, nombre, admiteNoAplica }) => (
              <div key={clave} className="grid gap-2 border-b pb-3 last:border-0 sm:grid-cols-[1fr_180px_1fr] sm:items-start">
                <div className="text-xs">
                  <p className="font-medium">{nombre}</p>
                  {!acta.anexos_entregados?.[clave]?.manual && (
                    <p className="text-muted-foreground">Según los registros</p>
                  )}
                </div>
                <Controller
                  name={`condiciones.${clave}.condicion`}
                  control={control}
                  render={({ field }) => (
                    <Select
                      id={`acta-condicion-${clave}`}
                      aria-labelledby={`acta-condicion-${clave}`}
                      disabled={bloqueada}
                      value={field.value}
                      onChange={field.onChange}
                      options={(['entregado', 'no_entregado', ...(admiteNoAplica ? ['no_aplica'] : [])] as CondicionAnexoActa[]).map(
                        (valor) => ({ value: valor, label: ETIQUETA_CONDICION[valor] }),
                      )}
                    />
                  )}
                />
                <Input
                  placeholder="Observación (opcional)"
                  maxLength={1000}
                  aria-label={`Observación de ${nombre}`}
                  {...register(`condiciones.${clave}.observacion`)}
                />
              </div>
            ))}
            <div className="space-y-1">
              <Label htmlFor="acta-otros">Otros documentos entregados</Label>
              <Textarea id="acta-otros" maxLength={2000} {...register('otros_documentos')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">IV. Observaciones</CardTitle>
            <CardDescription className="text-xs">
              Las registra el coordinador ETTE al revisar la entrega, como constancia.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            {acta.observaciones_registradas.length === 0 ? (
              <p className="text-muted-foreground">El coordinador ETTE no registró observaciones.</p>
            ) : (
              <ol className="space-y-2">
                {acta.observaciones_registradas.map((observacion) => (
                  <li key={observacion.n} className="rounded-md border p-2">
                    <p>
                      <span className="font-semibold">{observacion.n}.</span> {observacion.descripcion}
                    </p>
                    <p className="text-muted-foreground">
                      {observacion.documentacion} · {observacion.autor}
                    </p>
                  </li>
                ))}
              </ol>
            )}
            <div className="space-y-1">
              <Label htmlFor="acta-comentarios">Comentarios adicionales</Label>
              <Textarea id="acta-comentarios" maxLength={5000} {...register('observaciones')} />
            </div>
          </CardContent>
        </Card>
      </fieldset>

      {!bloqueada && (
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" disabled={!isDirty || guardar.isPending} onClick={() => reset(valoresDe(acta))}>
            Descartar cambios
          </Button>
          <Button type="submit" loading={guardar.isPending} disabled={!isDirty}>
            Guardar datos del acta
          </Button>
        </div>
      )}
    </form>
  )
}
