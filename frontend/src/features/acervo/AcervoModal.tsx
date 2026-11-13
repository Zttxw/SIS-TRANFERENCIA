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
import { rangoAniosAcervo } from './agrupar-por-anio'
import type { AcervoDocumental, GuardarAcervoPayload, TipoAcervo } from '@/types/acervo'

const anioSchema = z.number().int().min(1990).max(2100)
const acervoSchema = z.object({
  tipo: z.enum(['fisico', 'digital']),
  serie_documental: z.string().trim().min(2, 'La serie documental es requerida'),
  desde_anio: anioSchema,
  hasta_anio: anioSchema,
  cantidad_unidades: z.number().int().min(1, 'La cantidad debe ser mayor o igual a 1'),
  unidad_conservacion: z.string().trim().min(1, 'La unidad de conservación es requerida'),
  ubicacion: z.string().max(255).optional().nullable(),
  descripcion: z.string().optional().nullable(),
}).refine((datos) => datos.hasta_anio >= datos.desde_anio, {
  path: ['hasta_anio'],
  message: 'El año final debe ser igual o posterior al inicial.',
})

type FormValues = z.infer<typeof acervoSchema>

interface AcervoModalProps {
  open: boolean
  onClose: () => void
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
      cantidad_unidades: 1,
      unidad_conservacion: 'Archivadores de Palanca',
      ubicacion: '',
      descripcion: '',
    },
  })

  useEffect(() => {
    if (!open) return
    const rango = acervo ? rangoAniosAcervo(acervo) : null
    reset({
      tipo: acervo?.tipo ?? 'fisico',
      serie_documental: acervo?.serie_documental ?? '',
      desde_anio: rango?.desde ?? undefined,
      hasta_anio: rango?.hasta ?? undefined,
      cantidad_unidades: acervo?.cantidad_unidades ?? 1,
      unidad_conservacion: acervo?.unidad_conservacion ?? 'Archivadores de Palanca',
      ubicacion: acervo?.ubicacion ?? '',
      descripcion: acervo?.descripcion ?? '',
    })
  }, [acervo, reset, open])

  const opcionesUnidades = aOpcionesSelect(UNIDADES_CONSERVACION)
  if (acervo?.unidad_conservacion && !opcionesUnidades.some((opcion) => opcion.value === acervo.unidad_conservacion)) {
    opcionesUnidades.push({ value: acervo.unidad_conservacion, label: acervo.unidad_conservacion })
  }

  const onSubmit = (values: FormValues) => {
    onSave({
      dependencia_id: dependenciaId,
      ...values,
      anio: values.desde_anio,
      periodo: values.desde_anio === values.hasta_anio
        ? String(values.desde_anio)
        : `${values.desde_anio} - ${values.hasta_anio}`,
      ubicacion: values.ubicacion?.trim() || null,
      descripcion: values.descripcion?.trim() || null,
    }, { setError })
  }

  return (
    <Dialog open={open} onClose={onClose} title={isEditing ? 'Editar serie documental' : 'Registrar acervo documental'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField label="Formato del acervo" htmlFor="tipo" requerido error={errors.tipo?.message}>
          <Controller
            control={control}
            name="tipo"
            render={({ field }) => (
              <Select<TipoAcervo> id="tipo" options={aOpcionesSelect<TipoAcervo>(TIPOS_ACERVO)} value={field.value} onChange={field.onChange} />
            )}
          />
        </FormField>

        <FormField label="Serie documental" htmlFor="serie" requerido error={errors.serie_documental?.message}>
          <Input id="serie" placeholder="Ej. Memorándum, Informes, Oficios…" maxLength={255} {...register('serie_documental')} />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Desde año" htmlFor="desde_anio" requerido error={errors.desde_anio?.message}>
            <Input id="desde_anio" type="number" min={1990} max={2100} step={1} placeholder="2023" {...register('desde_anio', { valueAsNumber: true })} />
          </FormField>
          <FormField label="Hasta año" htmlFor="hasta_anio" requerido error={errors.hasta_anio?.message}>
            <Input id="hasta_anio" type="number" min={1990} max={2100} step={1} placeholder="2023" {...register('hasta_anio', { valueAsNumber: true })} />
          </FormField>
        </div>

        <FormField label="Cantidad de unidades de conservación" htmlFor="cant" requerido error={errors.cantidad_unidades?.message}>
          <Input id="cant" type="number" min={1} step={1} {...register('cantidad_unidades', { valueAsNumber: true })} />
        </FormField>

        <FormField label="Tipo de unidades de conservación" htmlFor="unidad_cons" requerido error={errors.unidad_conservacion?.message}>
          <Controller
            control={control}
            name="unidad_conservacion"
            render={({ field }) => (
              <Select id="unidad_cons" buscable options={opcionesUnidades} value={field.value} onChange={field.onChange} />
            )}
          />
        </FormField>

        <FormField label="Ubicación de unidades de conservación" htmlFor="ubi" error={errors.ubicacion?.message}>
          <Input id="ubi" placeholder="Ej. Estante 3, nivel 2 / ruta del archivo digital" maxLength={255} {...register('ubicacion')} />
        </FormField>

        <FormField label="Descripción (opcional)" htmlFor="descripcion" error={errors.descripcion?.message}>
          <Textarea
            id="descripcion"
            rows={2}
            placeholder="Ej. Informes emitidos de 2024, tomos 1 y 2"
            {...register('descripcion')}
          />
        </FormField>

        <div className="flex items-center justify-end gap-2 border-t pt-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button type="submit" loading={loading} disabled={loading}>{isEditing ? 'Guardar cambios' : 'Registrar acervo'}</Button>
        </div>
      </form>
    </Dialog>
  )
}
