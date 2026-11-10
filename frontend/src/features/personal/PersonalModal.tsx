import { useEffect } from 'react'
import { Controller, useForm, type UseFormSetError } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { aOpcionesSelect, REGIMENES_LABORALES, SITUACIONES_LABORALES } from '@/lib/catalogos'
import type { GuardarPersonalPayload, Personal } from '@/types/personal'

const personalSchema = z.object({
  dni: z.string().regex(/^[0-9]{8}$/, 'El DNI debe tener exactamente 8 dígitos'),
  nombres: z.string().min(2, 'Los nombres son requeridos'),
  apellidos: z.string().min(2, 'Los apellidos son requeridos'),
  cargo: z.string().min(2, 'El cargo o función es requerido'),
  regimen_laboral: z.string().min(2, 'El régimen laboral es requerido'),
  modalidad_contractual: z.string().optional().nullable(),
  situacion_laboral: z.string().optional().nullable(),
})

type FormValues = z.infer<typeof personalSchema>

interface PersonalModalProps {
  open: boolean
  onClose: () => void
  onSave: (
    payload: GuardarPersonalPayload,
    helpers: { setError: UseFormSetError<FormValues> },
  ) => void
  personal?: Personal | null
  dependenciaId: number
  loading?: boolean
}

export function PersonalModal({
  open,
  onClose,
  onSave,
  personal,
  dependenciaId,
  loading = false,
}: PersonalModalProps) {
  const isEditing = Boolean(personal)

  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(personalSchema),
    defaultValues: {
      dni: '',
      nombres: '',
      apellidos: '',
      cargo: '',
      regimen_laboral: 'D.L. 1057 (CAS)',
      modalidad_contractual: 'Plazo Indeterminado',
      situacion_laboral: 'ACTIVO',
    },
  })

  useEffect(() => {
    if (personal) {
      reset({
        dni: personal.dni,
        nombres: personal.nombres,
        apellidos: personal.apellidos,
        cargo: personal.cargo,
        regimen_laboral: personal.regimen_laboral || 'D.L. 1057 (CAS)',
        modalidad_contractual: personal.modalidad_contractual || '',
        situacion_laboral: personal.situacion_laboral || 'ACTIVO',
      })
    } else {
      reset({
        dni: '',
        nombres: '',
        apellidos: '',
        cargo: '',
        regimen_laboral: 'D.L. 1057 (CAS)',
        modalidad_contractual: 'Plazo Determinado',
        situacion_laboral: 'ACTIVO',
      })
    }
  }, [personal, reset])

  const onSubmit = (values: FormValues) => {
    onSave(
      {
        dependencia_id: dependenciaId,
        dni: values.dni,
        nombres: values.nombres,
        apellidos: values.apellidos,
        cargo: values.cargo,
        regimen_laboral: values.regimen_laboral,
        modalidad_contractual: values.modalidad_contractual || null,
        situacion_laboral: values.situacion_laboral || null,
      },
      { setError },
    )
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditing ? 'Actualizar Servidor Asignado' : 'Registrar Servidor al Área'}
      description="Anexo 05: Relación de personal y colaboradores asignados a la unidad orgánica (Directiva §7.5)."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          label="DNI (8 dígitos)"
          htmlFor="dni"
          requerido
          error={errors.dni?.message}
          hint={isEditing ? 'El DNI no puede cambiarse al editar un servidor existente.' : undefined}
        >
          <Input
            id="dni"
            maxLength={8}
            placeholder="00000000"
            disabled={isEditing}
            {...register('dni')}
            aria-invalid={Boolean(errors.dni)}
          />
        </FormField>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label="Nombres" htmlFor="nombres" requerido error={errors.nombres?.message}>
            <Input id="nombres" placeholder="Nombres completos" {...register('nombres')} />
          </FormField>

          <FormField label="Apellidos" htmlFor="apellidos" requerido error={errors.apellidos?.message}>
            <Input id="apellidos" placeholder="Apellidos paterno y materno" {...register('apellidos')} />
          </FormField>
        </div>

        <FormField
          label="Cargo / Función Desempeñada"
          htmlFor="cargo"
          requerido
          error={errors.cargo?.message}
        >
          <Input
            id="cargo"
            placeholder="Ej. Especialista en Redes, Técnico Administrativo..."
            {...register('cargo')}
          />
        </FormField>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField
            label="Régimen Laboral"
            htmlFor="regimen"
            requerido
            error={errors.regimen_laboral?.message}
            hint="Régimen bajo el que presta servicios el servidor: CAS (D.L. 1057), carrera (D.L. 276), privado (D.L. 728) o locación. Use «Otro» si no aplica."
          >
            <Controller
              control={control}
              name="regimen_laboral"
              render={({ field }) => (
                <Select
                  id="regimen"
                  buscable
                  options={aOpcionesSelect(REGIMENES_LABORALES)}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </FormField>

          <FormField
            label="Situación Laboral"
            htmlFor="sit"
            hint="Condición del servidor a la fecha de la transferencia: activo, de vacaciones, con licencia o destacado a otra unidad."
          >
            <Controller
              control={control}
              name="situacion_laboral"
              render={({ field }) => (
                <Select
                  id="sit"
                  options={aOpcionesSelect(SITUACIONES_LABORALES)}
                  value={field.value ?? 'ACTIVO'}
                  onChange={field.onChange}
                />
              )}
            />
          </FormField>
        </div>

        <FormField label="Modalidad Contractual" htmlFor="mod_cont">
          <Input
            id="mod_cont"
            placeholder="Ej. Plazo Determinado, Indeterminado..."
            {...register('modalidad_contractual')}
          />
        </FormField>

        <div className="flex items-center justify-end gap-2 border-t pt-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading} disabled={loading}>
            {isEditing ? 'Actualizar Servidor' : 'Registrar Servidor'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
