import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  onSave: (payload: GuardarPersonalPayload) => void
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
    onSave({
      dependencia_id: dependenciaId,
      dni: values.dni,
      nombres: values.nombres,
      apellidos: values.apellidos,
      cargo: values.cargo,
      regimen_laboral: values.regimen_laboral,
      modalidad_contractual: values.modalidad_contractual || null,
      situacion_laboral: values.situacion_laboral || null,
    })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditing ? 'Actualizar Servidor Asignado' : 'Registrar Servidor al Área'}
      description="Anexo 05: Relación de personal y colaboradores asignados a la unidad orgánica (Directiva §7.5)."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="dni">DNI (8 dígitos) *</Label>
          <Input
            id="dni"
            maxLength={8}
            placeholder="00000000"
            disabled={isEditing}
            {...register('dni')}
            aria-invalid={Boolean(errors.dni)}
          />
          {errors.dni && <p className="text-xs text-destructive">{errors.dni.message}</p>}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="nombres">Nombres *</Label>
            <Input id="nombres" placeholder="Nombres completos" {...register('nombres')} />
            {errors.nombres && <p className="text-xs text-destructive">{errors.nombres.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="apellidos">Apellidos *</Label>
            <Input id="apellidos" placeholder="Apellidos paterno y materno" {...register('apellidos')} />
            {errors.apellidos && <p className="text-xs text-destructive">{errors.apellidos.message}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cargo">Cargo / Función Desempeñada *</Label>
          <Input id="cargo" placeholder="Ej. Especialista en Redes, Técnico Administrativo..." {...register('cargo')} />
          {errors.cargo && <p className="text-xs text-destructive">{errors.cargo.message}</p>}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="regimen">Régimen Laboral *</Label>
            <select
              id="regimen"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              {...register('regimen_laboral')}
            >
              <option value="D.L. 1057 (CAS)">D.L. 1057 (CAS)</option>
              <option value="D.L. 276 (Carrera Administrativa)">D.L. 276 (Carrera Administrativa)</option>
              <option value="D.L. 728 (Régimen Privado)">D.L. 728 (Régimen Privado)</option>
              <option value="Locación de Servicios (FTH)">Locación de Servicios (FTH)</option>
              <option value="Designación de Confianza">Designación de Confianza</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sit">Situación Laboral</Label>
            <select
              id="sit"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              {...register('situacion_laboral')}
            >
              <option value="ACTIVO">ACTIVO</option>
              <option value="VACACIONES">VACACIONES</option>
              <option value="LICENCIA">LICENCIA</option>
              <option value="DESTAQUE">DESTAQUE</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="mod_cont">Modalidad Contractual</Label>
          <Input id="mod_cont" placeholder="Ej. Plazo Determinado, Indeterminado..." {...register('modalidad_contractual')} />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t">
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

