import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useRemitirEntrega } from './use-dashboard'
import { ApiError } from '@/types/api'

interface RemitirModalProps {
  open: boolean
  onClose: () => void
  dependenciaId: number
  dependenciaNombre: string
  haciaEtts: boolean
}

export function RemitirModal({
  open,
  onClose,
  dependenciaId,
  dependenciaNombre,
  haciaEtts,
}: RemitirModalProps) {
  const [comentario, setComentario] = useState('')
  const remitirMutation = useRemitirEntrega()

  const cerrar = () => {
    if (remitirMutation.isPending) return
    remitirMutation.reset()
    setComentario('')
    onClose()
  }

  const handleRemitir = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await remitirMutation.mutateAsync({
        dependencia_id: dependenciaId,
        comentario: comentario.trim() || undefined,
      })
      setComentario('')
      onClose()
    } catch {
      // La mutación conserva el error para mostrarlo en el diálogo.
    }
  }

  return (
    <Dialog
      open={open}
      onClose={cerrar}
      title="Remitir Entrega de Gestión"
      description={`Está a punto de remitir la entrega formal de "${dependenciaNombre}" ${
        haciaEtts ? 'directamente hacia el ETTS institucional.' : 'hacia el superior jerárquico.'
      }`}
    >
      <form onSubmit={handleRemitir} className="space-y-4">
        {remitirMutation.error && (
          <div role="alert" className="rounded-lg border border-danger-border bg-danger-soft p-3 text-sm text-danger-fg">
            {remitirMutation.error instanceof ApiError && remitirMutation.error.errors?.cronograma
              ? `El plazo de remisión está vencido. ${remitirMutation.error.message}`
              : remitirMutation.error.message}
          </div>
        )}
        <div className="rounded-lg border border-warning-border bg-warning-soft p-3 text-xs text-warning-fg">
          Nota: Una vez remitida la entrega, los anexos quedarán en modo de solo lectura (bloqueados para edición) hasta que el revisor emita una resolución o solicite subsanación.
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="comentario">Comentario u observaciones de envío (opcional)</Label>
          <textarea
            id="comentario"
            rows={3}
            maxLength={500}
            className="w-full rounded-md border border-input bg-background p-2.5 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Ingrese detalles complementarios o alcance de la remisión..."
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={cerrar} disabled={remitirMutation.isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={remitirMutation.isPending}>
            {remitirMutation.isPending ? 'Remitiendo...' : 'Confirmar y Remitir'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

