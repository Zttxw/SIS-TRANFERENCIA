import { useEffect } from 'react'
import { Controller, useForm, useWatch, type UseFormSetError } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { aOpcionesSelect, UNIDADES_CONSERVACION } from '@/lib/catalogos'
import type { AcervoDocumental, GuardarAcervoPayload } from '@/types/acervo'

const UNIDAD_OTRO = 'Otro'
const UNIDADES_OFICIALES: readonly string[] = UNIDADES_CONSERVACION.map((opcion) => opcion.value)

const acervoSchema = z.object({
  serie_documental: z.string().trim().min(2, 'La serie documental es requerida').max(255),
  anio: z.number({ message: 'Indique el año' }).int().min(1990, 'Año no válido').max(2100, 'Año no válido'),
  folios: z.number({ message: 'Indique la cantidad de folios' }).int().min(1, 'Debe tener al menos 1 folio'),
  unidad: z.string().min(1, 'El tipo de unidad de conservación es requerido'),
  unidad_otro: z.string().trim().max(100).optional(),
  ubicacion: z.string().trim().min(1, 'La ubicación es requerida').max(255),
}).refine((datos) => datos.unidad !== UNIDAD_OTRO || Boolean(datos.unidad_otro), {
  path: ['unidad_otro'],
  message: 'Especifique el tipo de unidad de conservación.',
})

type FormValues = z.infer<typeof acervoSchema>

/** Una unidad fuera del catálogo oficial se edita como «Otro» con su texto. */
function unidadEnFormulario(unidad: string | undefined): Pick<FormValues, 'unidad' | 'unidad_otro'> {
  if (!unidad) return { unidad: 'Archivadores de Palanca', unidad_otro: '' }
  if (UNIDADES_OFICIALES.includes(unidad)) return { unidad, unidad_otro: '' }
  return { unidad: UNIDAD_OTRO, unidad_otro: unidad }
}

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

/** Alta y edición de una serie física (Anexo 03-A). */
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
  } = useForm<FormValues>({ resolver: zodResolver(acervoSchema) })

  useEffect(() => {
    if (!open) return
    reset({
      serie_documental: acervo?.serie_documental ?? '',
      anio: acervo?.anio ?? undefined,
      folios: acervo?.folios ?? undefined,
      ...unidadEnFormulario(acervo?.unidad_conservacion),
      ubicacion: acervo?.ubicacion ?? '',
    })
  }, [acervo, reset, open])

  const esOtraUnidad = useWatch({ control, name: 'unidad' }) === UNIDAD_OTRO

  const onSubmit = ({ unidad, unidad_otro, ...values }: FormValues) => {
    onSave({
      ...values,
      dependencia_id: dependenciaId,
      unidad_conservacion: unidad === UNIDAD_OTRO ? (unidad_otro ?? '') : unidad,
    }, { setError })
  }

  return (
    <Dialog open={open} onClose={onClose} title={isEditing ? 'Editar serie física' : 'Registrar serie física'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField label="Serie documental" htmlFor="serie" requerido error={errors.serie_documental?.message}>
          <Input id="serie" placeholder="Ej. Oficios emitidos, Informes recibidos…" maxLength={255} {...register('serie_documental')} />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Año" htmlFor="anio" requerido error={errors.anio?.message}>
            <Input id="anio" type="number" min={1990} max={2100} step={1} placeholder="2024" {...register('anio', { valueAsNumber: true })} />
          </FormField>
          <FormField label="Folios" htmlFor="folios" requerido error={errors.folios?.message}>
            <Input id="folios" type="number" min={1} step={1} {...register('folios', { valueAsNumber: true })} />
          </FormField>
        </div>

        <FormField label="Tipo de unidades de conservación" htmlFor="unidad" requerido error={errors.unidad?.message}>
          <Controller
            control={control}
            name="unidad"
            render={({ field }) => (
              <Select id="unidad" options={aOpcionesSelect(UNIDADES_CONSERVACION)} value={field.value} onChange={field.onChange} />
            )}
          />
        </FormField>

        {esOtraUnidad && (
          <FormField label="Especifique la unidad" htmlFor="unidad_otro" requerido error={errors.unidad_otro?.message}>
            <Input id="unidad_otro" placeholder="Ej. Legajos" maxLength={100} {...register('unidad_otro')} />
          </FormField>
        )}

        <FormField label="Ubicación de unidades de conservación" htmlFor="ubi" requerido error={errors.ubicacion?.message}>
          <Input id="ubi" placeholder="Ej. Estante 3, nivel 2" maxLength={255} {...register('ubicacion')} />
        </FormField>

        <div className="flex items-center justify-end gap-2 border-t pt-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button type="submit" loading={loading} disabled={loading}>{isEditing ? 'Guardar cambios' : 'Registrar serie'}</Button>
        </div>
      </form>
    </Dialog>
  )
}
