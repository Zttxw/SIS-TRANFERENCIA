import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, HelpCircle, Send } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  ANEXOS_OBSERVABLES_CONFIG,
  type ClaveAnexoObservable,
  type RegistrarObservacionPayload,
} from '@/types/observaciones'
import { useRegistrarObservacion } from './use-observaciones'

const formSchema = z.object({
  anexo: z.enum(['documento', 'gestion', 'acervo', 'patrimonio', 'personal', 'nopatrimonial']),
  observable_id: z.number().int().min(1, 'El ID del registro debe ser mayor a 0'),
  descripcion: z.string().trim().min(5, 'La descripción debe tener al menos 5 caracteres'),
})

type FormValues = z.infer<typeof formSchema>

interface RegistrarObservacionModalProps {
  open: boolean
  onClose: () => void
  anexoInicial?: ClaveAnexoObservable
  observableIdInicial?: number
}

export function RegistrarObservacionModal({
  open,
  onClose,
  anexoInicial = 'documento',
  observableIdInicial,
}: RegistrarObservacionModalProps) {
  const registrarMut = useRegistrarObservacion()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      anexo: anexoInicial,
      observable_id: observableIdInicial || 1,
      descripcion: '',
    },
  })

  const anexoSeleccionado = watch('anexo')

  const onSubmit = (values: FormValues) => {
    const payload: RegistrarObservacionPayload = {
      anexo: values.anexo,
      observable_id: values.observable_id,
      descripcion: values.descripcion,
    }

    registrarMut.mutate(payload, {
      onSuccess: () => {
        reset()
        onClose()
      },
    })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Formular Observación Formal"
      description="Registro de observaciones sobre elementos de la transferencia según Directiva N.° 001-2026-MDSJ/A, §7.9."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-1">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="anexo-select">Anexo Observable *</Label>
            <select
              id="anexo-select"
              {...register('anexo')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {Object.values(ANEXOS_OBSERVABLES_CONFIG).map((cfg) => (
                <option key={cfg.clave} value={cfg.clave}>
                  {cfg.nombreCorto}
                </option>
              ))}
            </select>
            {errors.anexo && (
              <p className="text-xs text-destructive">{errors.anexo.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="observable_id">ID del Registro *</Label>
            <Input
              id="observable_id"
              type="number"
              min="1"
              placeholder="Ej. 42"
              {...register('observable_id', { valueAsNumber: true })}
            />
            {errors.observable_id && (
              <p className="text-xs text-destructive">{errors.observable_id.message}</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
          <div className="flex items-start gap-2">
            <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="font-medium text-foreground">
                Referencia del {ANEXOS_OBSERVABLES_CONFIG[anexoSeleccionado]?.nombreCorto}
              </p>
              <p className="mt-0.5">
                La observación quedará vinculada polimórficamente al elemento seleccionado y su
                ámbito institucional.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="descripcion">Descripción de la Observación *</Label>
          <Textarea
            id="descripcion"
            rows={4}
            placeholder="Detalle la inconsistencia, documento faltante o corrección técnica requerida..."
            {...register('descripcion')}
          />
          {errors.descripcion ? (
            <p className="text-xs text-destructive">{errors.descripcion.message}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Mínimo 5 caracteres. Sea específico en los requerimientos de subsanación.
            </p>
          )}
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-900 dark:border-amber-950/60 dark:bg-amber-950/20 dark:text-amber-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p>
              Al registrar la observación, la entrega del centro de costo podrá ser objeto de
              revisión u observación conforme al ciclo de control institucional.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={registrarMut.isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={registrarMut.isPending} className="gap-1.5">
            <Send className="h-4 w-4" />
            {registrarMut.isPending ? 'Registrando...' : 'Registrar Observación'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
