import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { aplicarErroresAFormulario, notificarError } from '@/lib/api-errors'
import type {
  DocumentoPendiente,
  GuardarDocumentoPayload,
} from '@/types/documentos'

const documentoSchema = z.object({
  numero_documento: z.string().optional().nullable(),
  tipo_documento: z.string().optional().nullable(),
  asunto: z.string().min(3, 'El asunto debe tener al menos 3 caracteres'),
  sumilla: z.string().optional().nullable(),
  justificacion_pendiente: z
    .string()
    .trim()
    .min(1, 'Debe justificar por qué el documento está pendiente'),
  fecha_documento: z.string().optional().nullable(),
  estado_atencion: z.string().optional().nullable(),
  accion_pendiente: z.string().optional().nullable(),
  observaciones: z.string().optional().nullable(),
})

type FormValues = z.infer<typeof documentoSchema>

interface DocumentoModalProps {
  open: boolean
  onClose: () => void
  onSave: (payload: GuardarDocumentoPayload) => Promise<void>
  documento?: DocumentoPendiente | null
  dependenciaId: number
  loading?: boolean
}

export function DocumentoModal({
  open,
  onClose,
  onSave,
  documento,
  dependenciaId,
  loading = false,
}: DocumentoModalProps) {
  const isEditing = Boolean(documento)

  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(documentoSchema),
    defaultValues: {
      numero_documento: '',
      tipo_documento: '',
      asunto: '',
      sumilla: '',
      justificacion_pendiente: '',
      fecha_documento: '',
      estado_atencion: 'PENDIENTE',
      accion_pendiente: '',
      observaciones: '',
    },
  })

  useEffect(() => {
    if (documento) {
      reset({
        numero_documento: documento.numero_documento || '',
        tipo_documento: documento.tipo_documento || '',
        asunto: documento.asunto || '',
        sumilla: documento.sumilla || '',
        justificacion_pendiente: documento.justificacion_pendiente || '',
        fecha_documento: documento.fecha_documento
          ? documento.fecha_documento.slice(0, 10)
          : '',
        estado_atencion: documento.estado_atencion || 'PENDIENTE',
        accion_pendiente: documento.accion_pendiente || '',
        observaciones: documento.observaciones || '',
      })
    } else {
      reset({
        numero_documento: '',
        tipo_documento: '',
        asunto: '',
        sumilla: '',
        justificacion_pendiente: '',
        fecha_documento: new Date().toISOString().slice(0, 10),
        estado_atencion: 'PENDIENTE',
        accion_pendiente: '',
        observaciones: '',
      })
    }
  }, [documento, open, reset])

  const onSubmit = async (values: FormValues) => {
    try {
      await onSave({
        dependencia_id: dependenciaId,
        numero_documento: values.numero_documento || null,
        tipo_documento: values.tipo_documento || null,
        asunto: values.asunto,
        sumilla: values.sumilla?.trim() || null,
        justificacion_pendiente: values.justificacion_pendiente,
        fecha_documento: values.fecha_documento || null,
        estado_atencion: values.estado_atencion || 'PENDIENTE',
        accion_pendiente: values.accion_pendiente || null,
        observaciones: values.observaciones || null,
      })
    } catch (error) {
      if (!aplicarErroresAFormulario(error, setError)) notificarError(error)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        isEditing
          ? 'Editar pendiente manual'
          : 'Agregar pendiente manual'
      }
      description="Agregue un pendiente que no figure en la lista."
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="max-h-[70vh] space-y-4 overflow-y-auto px-1"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="num_doc">N.° de Documento / Expediente</Label>
            <Input
              id="num_doc"
              placeholder="Ej. EXP-2026-00451 o MEMO 123-2026"
              {...register('numero_documento')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tipo_doc">Tipo de Documento</Label>
            <Input
              id="tipo_doc"
              placeholder="Ej. Oficio, Carta, Expediente SGD..."
              {...register('tipo_documento')}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="asunto">Asunto / Materia Prioritaria *</Label>
          <Textarea
            id="asunto"
            rows={3}
            placeholder="Describa el tema o requerimiento del documento..."
            {...register('asunto')}
            aria-invalid={Boolean(errors.asunto)}
          />
          {errors.asunto && (
            <p className="text-xs text-destructive">{errors.asunto.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sumilla">Sumilla</Label>
          <Textarea
            id="sumilla"
            rows={2}
            {...register('sumilla')}
            aria-invalid={Boolean(errors.sumilla)}
          />
          {errors.sumilla && (
            <p className="text-xs text-destructive">{errors.sumilla.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="justificacion_pendiente">
            Justificación del pendiente *
          </Label>
          <Textarea
            id="justificacion_pendiente"
            rows={2}
            {...register('justificacion_pendiente')}
            aria-invalid={Boolean(errors.justificacion_pendiente)}
          />
          {errors.justificacion_pendiente && (
            <p className="text-xs text-destructive">
              {errors.justificacion_pendiente.message}
            </p>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="fecha_doc">Fecha del Documento</Label>
            <Input
              id="fecha_doc"
              type="date"
              {...register('fecha_documento')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="estado_at">Estado de Atención</Label>
            <Controller
              name="estado_atencion"
              control={control}
              render={({ field }) => (
                <Select
                  id="estado_at"
                  value={field.value}
                  onChange={field.onChange}
                  options={[
                    'PENDIENTE',
                    'EN TRÁMITE',
                    'CON OBSERVACIONES',
                    'URGENTE',
                    'ATENDIDO',
                  ].map((value) => ({ value, label: value }))}
                />
              )}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="accion_pen">Acción Pendiente Requerida</Label>
          <Textarea
            id="accion_pen"
            rows={2}
            placeholder="Acción técnica o administrativa pendiente a realizar por la gestión entrante..."
            {...register('accion_pendiente')}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="obs">Observaciones Adicionales</Label>
          <Input
            id="obs"
            placeholder="Anotaciones complementarias..."
            {...register('observaciones')}
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button type="submit" loading={loading} disabled={loading}>
            {isEditing ? 'Guardar Cambios' : 'Registrar Documento'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
