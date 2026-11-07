import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useRemitirEntrega } from './use-dashboard'

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

  const handleRemitir = async (e: React.FormEvent) => {
    e.preventDefault()
    await remitirMutation.mutateAsync({
      dependencia_id: dependenciaId,
      comentario: comentario.trim() || undefined,
    })
    setComentario('')
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Remitir Entrega de Gestión"
      description={`Está a punto de remitir la entrega formal de "${dependenciaNombre}" ${
        haciaEtts ? 'directamente hacia el ETTS institucional.' : 'hacia el superior jerárquico.'
      }`}
    >
      <form onSubmit={handleRemitir} className="space-y-4">
        <div className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
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
          <Button type="button" variant="outline" onClick={onClose} disabled={remitirMutation.isPending}>
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
