import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { BienNoPatrimonial, EstadoConservacion, GuardarBienNoPatrimonialPayload } from '@/types/nopatrimonial'

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
  onSave: (payload: GuardarBienNoPatrimonialPayload) => void
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
    onSave({
      dependencia_id: dependenciaId,
      denominacion: values.denominacion,
      descripcion: values.descripcion || null,
      cantidad: values.cantidad,
      unidad_medida: values.unidad_medida,
      estado_conservacion: (values.estado_conservacion as EstadoConservacion) || null,
      ubicacion: values.ubicacion || null,
      observaciones: values.observaciones || null,
    })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditing ? 'Editar Bien No Patrimonial' : 'Registrar Bien No Patrimonial'}
      description="Anexo 06: Inventario de bienes auxiliares, insumos, herramientas y activos no catalogados en SIGA (Directiva §7.6)."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="deno">Denominación del Bien o Activo *</Label>
          <Input
            id="deno"
            placeholder="Ej. Extensión eléctrica de 10m, Pizarra acrílica, Herramienta menor..."
            {...register('denominacion')}
            aria-invalid={Boolean(errors.denominacion)}
          />
          {errors.denominacion && (
            <p className="text-xs text-destructive">{errors.denominacion.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cant">Cantidad *</Label>
            <Input
              id="cant"
              type="number"
              step="any"
              min="0.01"
              {...register('cantidad', { valueAsNumber: true })}
            />
            {errors.cantidad && (
              <p className="text-xs text-destructive">{errors.cantidad.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="um">Unidad de Medida *</Label>
            <Input id="um" placeholder="Ej. UNIDAD, PAQUETE, JUEGO..." {...register('unidad_medida')} />
            {errors.unidad_medida && (
              <p className="text-xs text-destructive">{errors.unidad_medida.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="est_cons">Estado de Conservación</Label>
            <select
              id="est_cons"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              {...register('estado_conservacion')}
            >
              <option value="bueno">Bueno</option>
              <option value="regular">Regular</option>
              <option value="malo">Malo</option>
              <option value="inservible">Inservible / De baja</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ubi">Ubicación Física</Label>
            <Input id="ubi" placeholder="Ambiente, estante o puesto..." {...register('ubicacion')} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="desc">Descripción / Características</Label>
          <Textarea
            id="desc"
            rows={2}
            placeholder="Marca, modelo, color o especificaciones relevantes..."
            {...register('descripcion')}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="obs">Observaciones</Label>
          <Input id="obs" placeholder="Detalles de procedencia o condición..." {...register('observaciones')} />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t">
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
