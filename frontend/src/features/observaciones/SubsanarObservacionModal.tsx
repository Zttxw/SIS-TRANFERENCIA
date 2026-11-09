import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Info, MessageSquare } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  formatearDetalleObservable,
  type Observacion,
  resolverAnexoDesdeTipo,
} from '@/types/observaciones'
import { useSubsanarObservacion } from './use-observaciones'

const formSchema = z.object({
  respuesta: z
    .string()
    .trim()
    .min(5, 'El sustento de subsanación debe tener al menos 5 caracteres'),
})

type FormValues = z.infer<typeof formSchema>

interface SubsanarObservacionModalProps {
  observacion: Observacion | null
  open: boolean
  onClose: () => void
}

export function SubsanarObservacionModal({
  observacion,
  open,
  onClose,
}: SubsanarObservacionModalProps) {
  const subsanarMut = useSubsanarObservacion()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      respuesta: '',
    },
  })

  if (!observacion) return null

  const infoAnexo = resolverAnexoDesdeTipo(observacion.observable_type)
  const detalleElem = formatearDetalleObservable(observacion)

  const onSubmit = (values: FormValues) => {
    subsanarMut.mutate(
      {
        id: observacion.id,
        respuesta: values.respuesta,
      },
      {
        onSuccess: () => {
          reset()
          onClose()
        },
      },
    )
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Subsanar Observación #${observacion.id}`}
      description={`${infoAnexo.nombreCorto} · ${detalleElem}`}
    >
      <div className="space-y-4 py-1">
        {/* Detalle de la observación formulada */}
        <div className="rounded-lg border bg-muted/40 p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between text-muted-foreground font-medium">
            <span className="flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-warning" />
              Observación formulada
            </span>
            <span>
              {observacion.autor?.name ? `Por: ${observacion.autor.name}` : 'Coordinación/Revisor'}
            </span>
          </div>
          <p className="text-foreground text-sm font-normal whitespace-pre-wrap rounded bg-background/80 p-2.5 border">
            {observacion.descripcion}
          </p>
        </div>

        {/* Aviso de re-remisión automática */}
        <div className="rounded-lg border border-info-border bg-info-soft/60 p-3 text-xs text-info-fg">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-info-fg" />
            <div>
              <p className="font-semibold">Re-remisión automática institucional (RN-13)</p>
              <p className="mt-0.5">
                Al subsanar la última observación pendiente de su centro de costo, si la entrega se
                encontraba en estado <strong>OBSERVADA</strong>, el sistema la re-remitirá
                automáticamente a <strong>REMITIDA</strong> para reanudar su revisión.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="respuesta">Sustento técnico de la Subsanación *</Label>
            <Textarea
              id="respuesta"
              rows={4}
              placeholder="Explique las acciones correctivas adoptadas, rectificaciones o documentos anexados..."
              {...register('respuesta')}
            />
            {errors.respuesta ? (
              <p className="text-xs text-destructive">{errors.respuesta.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Mínimo 5 caracteres. Debe fundamentar el levantamiento de la observación.
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={subsanarMut.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={subsanarMut.isPending}
              className="gap-1.5 bg-secondary hover:bg-secondary-hover text-white"
            >
              <CheckCircle2 className="h-4 w-4" />
              {subsanarMut.isPending ? 'Subsanando...' : 'Confirmar Subsanación'}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  )
}
