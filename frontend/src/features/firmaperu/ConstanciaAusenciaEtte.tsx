import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { usePermiso } from '@/auth/hooks'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { aplicarErroresAFormulario, notificarError } from '@/lib/api-errors'
import { api } from '@/lib/api'
import type { ApiSuccess } from '@/types/api'

interface Constancia {
  id: number
  version: number
  firmante_nombre: string | null
  nota: string | null
  copia_entregada_en: string | null
}

interface Formulario {
  ette_nombre: string
  nota: string
  copia: boolean
}

export function ConstanciaAusenciaEtte({
  dependenciaId,
}: {
  dependenciaId: number
}) {
  const puedeRegistrar = usePermiso('firmas.constancia_ausencia')
  const [abierto, setAbierto] = useState(false)
  const cliente = useQueryClient()
  const clave = ['constancias-ette', dependenciaId]
  const consulta = useQuery({
    queryKey: clave,
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Constancia[]>>(
        '/firmas/ausencia-ette',
        { params: { dependencia_id: dependenciaId } },
      )
      return data.data
    },
  })
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<Formulario>({
    defaultValues: { ette_nombre: '', nota: '', copia: false },
  })
  const guardar = useMutation({
    mutationFn: (datos: Formulario) =>
      api.post('/firmas/ausencia-ette', {
        dependencia_id: dependenciaId,
        ette_nombre: datos.ette_nombre.trim() || null,
        nota: datos.nota.trim() || null,
      }),
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: clave })
      toast.success('Constancia registrada y entrega de copia digital marcada.')
      setAbierto(false)
      reset()
    },
    onError: (error) => {
      if (!aplicarErroresAFormulario(error, setError)) notificarError(error)
    },
  })

  return (
    <div className="mt-3 space-y-2 border-t pt-3 text-xs">
      {consulta.isError && (
        <button
          type="button"
          className="text-danger-fg underline"
          onClick={() => void consulta.refetch()}
        >
          No se pudieron consultar las constancias. Reintentar
        </button>
      )}
      {consulta.data?.map((constancia) => (
        <div key={constancia.id} className="rounded-md border bg-muted/20 p-2">
          <p className="font-medium">
            Ausencia de firma ETTE · versión {constancia.version}
          </p>
          {constancia.firmante_nombre && <p>{constancia.firmante_nombre}</p>}
          {constancia.nota && (
            <p className="whitespace-pre-wrap">{constancia.nota}</p>
          )}
          {constancia.copia_entregada_en && (
            <p className="mt-1 text-muted-foreground">
              Copia digital entregada ·{' '}
              {new Date(constancia.copia_entregada_en).toLocaleString('es-PE')}
            </p>
          )}
        </div>
      ))}
      {puedeRegistrar && (
        <Button size="sm" variant="outline" onClick={() => setAbierto(true)}>
          Registrar ausencia de firma ETTE
        </Button>
      )}
      <Dialog
        open={abierto}
        onClose={() => {
          if (!guardar.isPending) setAbierto(false)
        }}
        title="Constancia de ausencia de firma ETTE"
        description="El registro deja constancia sobre la versión actual del acta y marca la entrega de su copia digital."
      >
        <form
          onSubmit={handleSubmit((datos) => guardar.mutate(datos))}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="ette-nombre">Integrante ETTE (opcional)</Label>
            <Input
              id="ette-nombre"
              maxLength={200}
              {...register('ette_nombre')}
            />
            {errors.ette_nombre && (
              <p className="text-xs text-danger-fg">
                {errors.ette_nombre.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ette-nota">Nota de constancia (opcional)</Label>
            <Textarea id="ette-nota" maxLength={1000} {...register('nota')} />
            {errors.nota && (
              <p className="text-xs text-danger-fg">{errors.nota.message}</p>
            )}
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              {...register('copia', {
                required: 'Confirme la entrega de la copia digital.',
              })}
            />
            Confirmo que entregué la copia digital del acta.
          </label>
          {errors.copia && (
            <p className="text-xs text-danger-fg">{errors.copia.message}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={guardar.isPending}
              onClick={() => setAbierto(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={guardar.isPending}>
              Registrar constancia
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
