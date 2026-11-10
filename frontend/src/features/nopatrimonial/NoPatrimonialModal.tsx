import { useEffect } from 'react'
import { Controller, useForm, type UseFormSetError } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { aOpcionesSelect, ESTADOS_CONSERVACION, UNIDADES_MEDIDA } from '@/lib/catalogos'
import type {
  BienNoPatrimonial,
  EstadoConservacion,
  GuardarBienNoPatrimonialPayload,
} from '@/types/nopatrimonial'

const noPatrimonialSchema = z.object({
  denominacion: z.string().min(2, 'La denominación del bien es requerida'),
  descripcion: z.string().optional().nullable(),
  cantidad: z.number().min(0.01, 'La cantidad debe ser mayor a 0'),
  unidad_medida: z.string().min(1, 'La unidad de medida es requerida'),
  estado_conservacion: z.enum(['bueno', 'regular', 'malo', 'inservible']).optional().nullable(),
  ubicacion: z.string().optional().nullable(),
  observaciones: z.string().optional().nullable(),
})

type FormValues = z.infer<typeof noPatrimonialSchema>

interface NoPatrimonialModalProps {
  open: boolean
  onClose: () => void
  onSave: (
    payload: GuardarBienNoPatrimonialPayload,
    helpers: { setError: UseFormSetError<FormValues> },
  ) => void
  bien?: BienNoPatrimonial | null
  dependenciaId: number
  loading?: boolean
}

export function NoPatrimonialModal({
  open,
  onClose,
  onSave,
  bien,
  dependenciaId,
  loading = false,
}: NoPatrimonialModalProps) {
  const isEditing = Boolean(bien)

  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(noPatrimonialSchema),
    defaultValues: {
      denominacion: '',
      descripcion: '',
      cantidad: 1,
      unidad_medida: 'UNIDAD',
      estado_conservacion: 'bueno',
      ubicacion: '',
      observaciones: '',
    },
  })

  useEffect(() => {
    if (bien) {
      reset({
        denominacion: bien.denominacion,
        descripcion: bien.descripcion || '',
        cantidad: bien.cantidad || 1,
        unidad_medida: bien.unidad_medida || 'UNIDAD',
        estado_conservacion: bien.estado_conservacion || 'bueno',
        ubicacion: bien.ubicacion || '',
        observaciones: bien.observaciones || '',
      })
    } else {
      reset({
        denominacion: '',
        descripcion: '',
        cantidad: 1,
        unidad_medida: 'UNIDAD',
        estado_conservacion: 'bueno',
        ubicacion: 'Oficina de la dependencia',
        observaciones: '',
      })
    }
  }, [bien, reset])

  const onSubmit = (values: FormValues) => {
    onSave(
      {
        dependencia_id: dependenciaId,
        denominacion: values.denominacion,
        descripcion: values.descripcion || null,
        cantidad: values.cantidad,
        unidad_medida: values.unidad_medida,
        estado_conservacion: (values.estado_conservacion as EstadoConservacion) || null,
        ubicacion: values.ubicacion || null,
        observaciones: values.observaciones || null,
      },
      { setError },
    )
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditing ? 'Editar Bien No Patrimonial' : 'Registrar Bien No Patrimonial'}
      description="Anexo 06: Inventario de bienes auxiliares, insumos, herramientas y activos no catalogados en SIGA (Directiva §7.6)."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          label="Denominación del Bien o Activo"
          htmlFor="deno"
          requerido
          error={errors.denominacion?.message}
          hint="Bienes que NO están en el inventario SIGA (sin código patrimonial): herramientas, suministros, mobiliario menor, enseres. Los bienes patrimoniales van en el Anexo 04."
        >
          <Input
            id="deno"
            placeholder="Ej. Extensión eléctrica de 10m, Pizarra acrílica, Herramienta menor..."
            {...register('denominacion')}
            aria-invalid={Boolean(errors.denominacion)}
          />
        </FormField>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label="Cantidad" htmlFor="cant" requerido error={errors.cantidad?.message}>
            <Input
              id="cant"
              type="number"
              step="any"
              min="0.01"
              {...register('cantidad', { valueAsNumber: true })}
            />
          </FormField>

          <FormField
            label="Unidad de Medida"
            htmlFor="um"
            requerido
            error={errors.unidad_medida?.message}
          >
            <Controller
              control={control}
              name="unidad_medida"
              render={({ field }) => (
                <Select
                  id="um"
                  buscable
                  options={aOpcionesSelect(UNIDADES_MEDIDA)}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Ej. UNIDAD, PAQUETE, JUEGO…"
                />
              )}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField
            label="Estado de Conservación"
            htmlFor="est_cons"
            hint="Condición física del bien: Bueno (operativo), Regular (con desgaste), Malo (requiere reparación) o Inservible (para baja)."
          >
            <Controller
              control={control}
              name="estado_conservacion"
              render={({ field }) => (
                <Select<EstadoConservacion>
                  id="est_cons"
                  options={aOpcionesSelect<EstadoConservacion>(ESTADOS_CONSERVACION)}
                  value={field.value ?? 'bueno'}
                  onChange={field.onChange}
                />
              )}
            />
          </FormField>

          <FormField label="Ubicación Física" htmlFor="ubi">
            <Input id="ubi" placeholder="Ambiente, estante o puesto..." {...register('ubicacion')} />
          </FormField>
        </div>

        <FormField label="Descripción / Características" htmlFor="desc">
          <Textarea
            id="desc"
            rows={2}
            placeholder="Marca, modelo, color o especificaciones relevantes..."
            {...register('descripcion')}
          />
        </FormField>

        <FormField label="Observaciones" htmlFor="obs">
          <Input id="obs" placeholder="Detalles de procedencia o condición..." {...register('observaciones')} />
        </FormField>

        <div className="flex items-center justify-end gap-2 border-t pt-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading} disabled={loading}>
            {isEditing ? 'Guardar Cambios' : 'Registrar Bien'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
