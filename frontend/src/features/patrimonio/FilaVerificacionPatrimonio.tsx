import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Save, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { aOpcionesSelect, ESTADOS_CONSERVACION } from '@/lib/catalogos'
import type {
  BienPatrimonial,
  EstadoVerificacionBien,
  VerificarBienPayload,
} from '@/types/patrimonio'
import type { EstadoConservacion } from '@/types/nopatrimonial'

const RESULTADOS = [
  { value: 'confirmado', label: 'Confirmado (ubicado físicamente)' },
  { value: 'con_observacion', label: 'Con observación (ubicado con discrepancia)' },
  { value: 'no_ubicado', label: 'No ubicado (bien no habido)' },
] as const

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
      message:
        'Debe ingresar un sustento (mínimo 5 caracteres) para bienes no ubicados o con observación (RN-05).',
      path: ['observacion'],
    },
  )

type FormValues = z.infer<typeof verificarSchema>

interface FilaVerificacionPatrimonioProps {
  bien: BienPatrimonial
  /** Número de columnas de la tabla, para el `colSpan` de la fila expandida. */
  colSpan: number
  onGuardar: (payload: VerificarBienPayload) => void
  onCancelar: () => void
  loading?: boolean
}

/**
 * Sub-formulario de verificación física del Anexo 04 que se despliega **dentro de
 * la tabla** (fila expandible), en lugar de un modal. Registra el resultado, el
 * estado de conservación y la observación (que se imprime en el PDF del anexo)
 * sin perder de vista el resto del inventario. Guarda en línea y la fila se colapsa.
 */
export function FilaVerificacionPatrimonio({
  bien,
  colSpan,
  onGuardar,
  onCancelar,
  loading = false,
}: FilaVerificacionPatrimonioProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
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
    const v = bien.verificacion
    reset({
      estado: (v && v.estado !== 'pendiente' ? v.estado : 'confirmado') as FormValues['estado'],
      estado_conservacion: (v?.estado_conservacion ?? 'bueno') as EstadoConservacion,
      observacion: v?.observacion ?? '',
    })
  }, [bien, reset])

  const onSubmit = (values: FormValues) => {
    onGuardar({
      estado: values.estado as EstadoVerificacionBien,
      estado_conservacion: (values.estado_conservacion as EstadoConservacion) || null,
      observacion: values.observacion || null,
    })
  }

  return (
    <tr className="bg-primary/5">
      <td colSpan={colSpan} className="p-0">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="m-1 sm:m-2 space-y-3 sm:space-y-4 rounded-xl border-2 border-primary/30 border-l-4 sm:border-l-8 border-l-primary bg-card p-3 sm:p-5 shadow-md"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-primary/10 p-2.5 sm:px-4 sm:py-3">
            <div className="text-xs sm:text-sm font-semibold text-foreground">
              Complete la verificación física · <span className="font-mono">{bien.codigo_patrimonial}</span>
            </div>
            <span className="text-nota text-muted-foreground line-clamp-1">{bien.denominacion}</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField
              label="Resultado de la verificación"
              htmlFor={`estado-${bien.id}`}
              requerido
              hint="Confirmado si el bien está en el ambiente; Con observación si hay deterioro o discrepancia; No ubicado si no se halla."
            >
              <Controller
                control={control}
                name="estado"
                render={({ field }) => (
                  <Select
                    id={`estado-${bien.id}`}
                    options={RESULTADOS.map((r) => ({ value: r.value, label: r.label }))}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </FormField>

            <FormField label="Estado de conservación" htmlFor={`cons-${bien.id}`}>
              <Controller
                control={control}
                name="estado_conservacion"
                render={({ field }) => (
                  <Select<EstadoConservacion>
                    id={`cons-${bien.id}`}
                    options={aOpcionesSelect<EstadoConservacion>(ESTADOS_CONSERVACION)}
                    value={field.value ?? 'bueno'}
                    onChange={field.onChange}
                  />
                )}
              />
            </FormField>
          </div>

          <FormField
            label={`Observaciones y sustento ${requiereObs ? '' : '(opcional)'}`}
            htmlFor={`obs-${bien.id}`}
            requerido={requiereObs}
            error={errors.observacion?.message}
          >
            <Textarea
              id={`obs-${bien.id}`}
              rows={2}
              placeholder={
                requiereObs
                  ? 'Indique obligatoriamente el motivo por el cual no se ubica o las fallas detectadas...'
                  : 'Anotaciones adicionales del cotejo de campo (opcional)...'
              }
              {...register('observacion')}
              aria-invalid={Boolean(errors.observacion)}
            />
          </FormField>

          <div className="flex items-center justify-end gap-2 border-t pt-3">
            <Button type="button" variant="outline" size="sm" onClick={onCancelar} disabled={loading}>
              <X className="mr-1.5 h-3.5 w-3.5" />
              Cancelar
            </Button>
            <Button type="submit" size="sm" loading={loading} disabled={loading}>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              Guardar Verificación
            </Button>
          </div>
        </form>
      </td>
    </tr>
  )
}
