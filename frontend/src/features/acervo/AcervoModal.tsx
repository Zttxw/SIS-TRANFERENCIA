import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { AcervoDocumental, GuardarAcervoPayload } from '@/types/acervo'

const acervoSchema = z.object({
  tipo: z.enum(['fisico', 'digital']),
  serie_documental: z.string().min(2, 'La serie documental es requerida'),
  periodo: z.string().optional().nullable(),
  cantidad_unidades: z.number().min(1, 'La cantidad debe ser mayor o igual a 1'),
  unidad_conservacion: z.string().min(1, 'La unidad de conservación es requerida'),
  ubicacion: z.string().optional().nullable(),
  descripcion: z.string().optional().nullable(),
  observaciones: z.string().optional().nullable(),
})

type FormValues = z.infer<typeof acervoSchema>

interface AcervoModalProps {
  open: boolean
  onClose: () => void
  onSave: (payload: GuardarAcervoPayload) => void
  acervo?: AcervoDocumental | null
  dependenciaId: number
  loading?: boolean
}

export function AcervoModal({
  open,
  onClose,
  onSave,
  acervo,
  dependenciaId,
  loading = false,
}: AcervoModalProps) {
  const isEditing = Boolean(acervo)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(acervoSchema),
    defaultValues: {
      tipo: 'fisico',
      serie_documental: '',
      periodo: '',
      cantidad_unidades: 1,
      unidad_conservacion: 'Tomos / Archivadores',
      ubicacion: '',
      descripcion: '',
      observaciones: '',
    },
  })

  useEffect(() => {
    if (acervo) {
      reset({
        tipo: acervo.tipo,
        serie_documental: acervo.serie_documental || '',
        periodo: acervo.periodo || '',
        cantidad_unidades: acervo.cantidad_unidades || 1,
        unidad_conservacion: acervo.unidad_conservacion || 'Tomos / Archivadores',
        ubicacion: acervo.ubicacion || '',
        descripcion: acervo.descripcion || '',
        observaciones: acervo.observaciones || '',
      })
    } else {
      reset({
        tipo: 'fisico',
        serie_documental: '',
        periodo: '2023 - 2026',
        cantidad_unidades: 1,
        unidad_conservacion: 'Archivadores de Palanca',
        ubicacion: 'Archivo de gestión de oficina',
        descripcion: '',
        observaciones: '',
      })
    }
  }, [acervo, reset])

  const onSubmit = (values: FormValues) => {
    onSave({
      dependencia_id: dependenciaId,
      tipo: values.tipo,
      serie_documental: values.serie_documental,
      periodo: values.periodo || null,
      cantidad_unidades: values.cantidad_unidades,
      unidad_conservacion: values.unidad_conservacion,
      ubicacion: values.ubicacion || null,
      descripcion: values.descripcion || null,
      observaciones: values.observaciones || null,
    })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditing ? 'Editar Serie Documental' : 'Registrar Acervo Documental'}
      description="Anexo 03: Inventario de acervo documental físico y digital transferido según Directiva §7.3."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="tipo">Formato del Acervo *</Label>
            <select
              id="tipo"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              {...register('tipo')}
            >
              <option value="fisico">Físico (Papel / Archivadores)</option>
              <option value="digital">Digital (Repositorios / Nube)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="periodo">Periodo Cronológico</Label>
            <Input id="periodo" placeholder="Ej. 2023 - 2026" {...register('periodo')} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="serie">Serie o Tipología Documental *</Label>
          <Input
            id="serie"
            placeholder="Ej. Comprobantes de pago, Informes técnicos, Resoluciones..."
            {...register('serie_documental')}
            aria-invalid={Boolean(errors.serie_documental)}
          />
          {errors.serie_documental && (
            <p className="text-xs text-destructive">{errors.serie_documental.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cant">Cantidad de Unidades *</Label>
            <Input
              id="cant"
              type="number"
              min={1}
              {...register('cantidad_unidades', { valueAsNumber: true })}
            />
            {errors.cantidad_unidades && (
              <p className="text-xs text-destructive">{errors.cantidad_unidades.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="unidad_cons">Unidad de Conservación *</Label>
            <Input
              id="unidad_cons"
              placeholder="Ej. Archivadores, Tomos, Folders, GB..."
              {...register('unidad_conservacion')}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ubi">Ubicación Física o Digital</Label>
          <Input
            id="ubi"
            placeholder="Ej. Estante 3, Balda 2 / Servidor OTI carpeta \TRANSFERENCIA"
            {...register('ubicacion')}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="desc">Descripción del Contenido</Label>
          <Textarea
            id="desc"
            rows={2}
            placeholder="Breve reseña del contenido o alcance de las series archivadas..."
            {...register('descripcion')}
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading} disabled={loading}>
            {isEditing ? 'Guardar Cambios' : 'Registrar Acervo'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
