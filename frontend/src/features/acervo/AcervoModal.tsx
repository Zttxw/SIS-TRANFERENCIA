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
import { aOpcionesSelect, TIPOS_ACERVO, UNIDADES_CONSERVACION } from '@/lib/catalogos'
import type { AcervoDocumental, GuardarAcervoPayload, TipoAcervo } from '@/types/acervo'

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
  /**
   * Guarda el payload. Recibe `setError` del formulario para que el `onError`
   * de la mutación pueda mapear un 422 al campo exacto (ver `aplicarErroresAFormulario`).
   */
  onSave: (
    payload: GuardarAcervoPayload,
    helpers: { setError: UseFormSetError<FormValues> },
  ) => void
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
    control,
    setError,
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
    if (!open) return
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
        periodo: '',
        cantidad_unidades: 1,
        unidad_conservacion: 'Archivadores de Palanca',
        ubicacion: 'Archivo de gestión de oficina',
        descripcion: '',
        observaciones: '',
      })
    }
  }, [acervo, reset, open])

  const onSubmit = (values: FormValues) => {
    onSave(
      {
        dependencia_id: dependenciaId,
        tipo: values.tipo,
        serie_documental: values.serie_documental,
        periodo: values.periodo || null,
        cantidad_unidades: values.cantidad_unidades,
        unidad_conservacion: values.unidad_conservacion,
        ubicacion: values.ubicacion || null,
        descripcion: values.descripcion || null,
        observaciones: values.observaciones || null,
      },
      { setError },
    )
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditing ? 'Editar Serie Documental' : 'Registrar Acervo Documental'}
      description="Registre los datos de sus archivadores físicos o repositorios digitales. Este formulario inventaría las series; no adjunta ni digitaliza sus documentos."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {!isEditing && <p className="rounded-md bg-info-soft p-3 text-xs text-info-fg">El SGD opera desde septiembre de 2025. Los archivadores físicos y la documentación histórica se registran manualmente, incluso si no aparecen en la precarga.</p>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField
            label="Formato del Acervo"
            htmlFor="tipo"
            requerido
            error={errors.tipo?.message}
            hint="Físico: papel, tomos o archivadores. Digital: repositorios, nube o unidades de disco. El digital suele provenir del SGD."
          >
            <Controller
              control={control}
              name="tipo"
              render={({ field }) => (
                <Select<TipoAcervo>
                  id="tipo"
                  options={aOpcionesSelect<TipoAcervo>(TIPOS_ACERVO)}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </FormField>

          <FormField label="Periodo Cronológico" htmlFor="periodo" hint="Rango de años que abarca la serie, p. ej. 2023 - 2026.">
            <Input id="periodo" placeholder="Ej. 2023 - 2026" {...register('periodo')} />
          </FormField>
        </div>

        <FormField
          label="Serie o Tipología Documental"
          htmlFor="serie"
          requerido
          error={errors.serie_documental?.message}
          hint="Agrupe por tipo documental, no documento a documento. Ej.: «Comprobantes de pago», «Resoluciones de Gerencia», «Informes técnicos»."
        >
          <Input
            id="serie"
            placeholder="Ej. Comprobantes de pago, Informes técnicos, Resoluciones..."
            {...register('serie_documental')}
            aria-invalid={Boolean(errors.serie_documental)}
          />
        </FormField>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField
            label="Cantidad de Unidades"
            htmlFor="cant"
            requerido
            error={errors.cantidad_unidades?.message}
          >
            <Input
              id="cant"
              type="number"
              min={1}
              {...register('cantidad_unidades', { valueAsNumber: true })}
            />
          </FormField>

          <FormField
            label="Unidad de Conservación"
            htmlFor="unidad_cons"
            requerido
            error={errors.unidad_conservacion?.message}
            hint="Cómo se cuenta la cantidad: archivadores, tomos, folders, cajas. Para acervo digital use GB."
          >
            <Controller
              control={control}
              name="unidad_conservacion"
              render={({ field }) => (
                <Select
                  id="unidad_cons"
                  buscable
                  options={aOpcionesSelect(UNIDADES_CONSERVACION)}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Ej. Archivadores, Tomos, GB…"
                />
              )}
            />
          </FormField>
        </div>

        <FormField
          label="Ubicación Física o Digital"
          htmlFor="ubi"
          hint="Dónde se custodia: estante físico o ruta del repositorio digital."
        >
          <Input
            id="ubi"
            placeholder="Ej. Estante 3, Balda 2 / Servidor OTI carpeta TRANSFERENCIA"
            {...register('ubicacion')}
          />
        </FormField>

        <FormField label="Descripción del Contenido" htmlFor="desc">
          <Textarea
            id="desc"
            rows={2}
            placeholder="Breve reseña del contenido o alcance de las series archivadas..."
            {...register('descripcion')}
          />
        </FormField>

        <div className="flex items-center justify-end gap-2 border-t pt-3">
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
