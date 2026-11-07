import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { BienPatrimonial, EstadoVerificacionBien, VerificarBienPayload } from '@/types/patrimonio'
import type { EstadoConservacion } from '@/types/nopatrimonial'

const verificarSchema = z
  .object({
    estado: z.enum(['confirmado', 'con_observacion', 'no_ubicado']),
    estado_conservacion: z.enum(['bueno', 'regular', 'malo', 'inservible']).optional().nullable(),
    observacion: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.estado === 'no_ubicado' || data.estado === 'con_observacion') {
        return Boolean(data.observacion && data.observacion.trim().length >= 5)
      }
      return true
    },
    {
      message: 'Debe ingresar un sustento detallado (mínimo 5 caracteres) para bienes no ubicados o con observación (RN-05).',
      path: ['observacion'],
    },
  )

type FormValues = z.infer<typeof verificarSchema>

interface VerificarBienModalProps {
  open: boolean
  onClose: () => void
  onSave: (payload: VerificarBienPayload) => void
  bien?: BienPatrimonial | null
  loading?: boolean
}

export function VerificarBienModal({
  open,
  onClose,
  onSave,
  bien,
  loading = false,
}: VerificarBienModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(verificarSchema),
    defaultValues: {
      estado: 'confirmado',
      estado_conservacion: 'bueno',
      observacion: '',
    },
  })

  const estadoSeleccionado = watch('estado')
  const requiereObs = estadoSeleccionado === 'no_ubicado' || estadoSeleccionado === 'con_observacion'

  useEffect(() => {
    if (bien?.verificacion) {
      reset({
        estado: (bien.verificacion.estado === 'pendiente' ? 'confirmado' : bien.verificacion.estado) as any,
        estado_conservacion: bien.verificacion.estado_conservacion || 'bueno',
        observacion: bien.verificacion.observacion || '',
      })
    } else {
      reset({
        estado: 'confirmado',
        estado_conservacion: 'bueno',
        observacion: '',
      })
    }
  }, [bien, reset])

  const onSubmit = (values: FormValues) => {
    onSave({
      estado: values.estado as EstadoVerificacionBien,
      estado_conservacion: (values.estado_conservacion as EstadoConservacion) || null,
      observacion: values.observacion || null,
    })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Verificación Física en Campo (Anexo 04)"
      description="Cotejo de existencia física y estado de conservación del activo patrimonial SIGA."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {bien && (
          <div className="rounded-lg border bg-muted/40 p-3.5 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-foreground text-sm">
                {bien.codigo_patrimonial}
              </span>
              <span className="rounded bg-primary/10 px-2 py-0.5 font-medium text-primary">
                SIGA MEF
              </span>
            </div>
            <p className="font-semibold text-foreground">{bien.denominacion}</p>
            <div className="grid grid-cols-2 gap-2 text-muted-foreground pt-1 border-t">
              <div>
                <span className="font-medium text-foreground">Marca: </span>
                {bien.marca ?? 'S/M'}
              </div>
              <div>
                <span className="font-medium text-foreground">Modelo: </span>
                {bien.modelo ?? 'S/M'}
              </div>
              <div>
                <span className="font-medium text-foreground">N.° Serie: </span>
                {bien.serie ?? 'S/S'}
              </div>
              <div>
                <span className="font-medium text-foreground">Custodio SIGA: </span>
                {bien.servidor
                  ? `${bien.servidor.nombres} ${bien.servidor.apellidos}`
                  : 'Sin custodio asignado'}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="estado-verif">Resultado de la Verificación Física *</Label>
          <select
            id="estado-verif"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            {...register('estado')}
          >
            <option value="confirmado">Confirmado (Ubicado físicamente en ambiente)</option>
            <option value="con_observacion">Con Observación (Ubicado con deterioro o discrepancia)</option>
            <option value="no_ubicado">No Ubicado (Bien no habido en el centro de costo)</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="estado-cons">Estado de Conservación Físico</Label>
          <select
            id="estado-cons"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            {...register('estado_conservacion')}
          >
            <option value="bueno">Bueno (Operativo y en óptimas condiciones)</option>
            <option value="regular">Regular (Operativo con desgaste de uso)</option>
            <option value="malo">Malo (Inoperativo o con fallas mecánicas/eléctricas)</option>
            <option value="inservible">Inservible (Para baja / desecho patrimonial)</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="obs">
            Observaciones y Sustento {requiereObs ? '*' : '(Opcional)'}
          </Label>
          <Textarea
            id="obs"
            rows={3}
            placeholder={
              requiereObs
                ? 'Indique obligatoriamente el motivo por el cual no se ubica o las fallas detectadas...'
                : 'Anotaciones adicionales del cotejo de campo (opcional)...'
            }
            {...register('observacion')}
            aria-invalid={Boolean(errors.observacion)}
          />
          {errors.observacion && (
            <p className="text-xs text-destructive">{errors.observacion.message}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading} disabled={loading}>
            Guardar Verificación
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
