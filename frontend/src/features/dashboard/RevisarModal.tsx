import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useRevisarEntrega } from './use-dashboard'

interface RevisarModalProps {
  open: boolean
  onClose: () => void
  dependenciaId: number
  dependenciaNombre: string
}

export function RevisarModal({
  open,
  onClose,
  dependenciaId,
  dependenciaNombre,
}: RevisarModalProps) {
  const [accion, setAccion] = useState<'consolidar' | 'observar'>('consolidar')
  const [comentario, setComentario] = useState('')
  const revisarMutation = useRevisarEntrega()

  const handleRevisar = async (e: React.FormEvent) => {
    e.preventDefault()
    await revisarMutation.mutateAsync({
      dependencia_id: dependenciaId,
      accion,
      comentario: comentario.trim() || undefined,
    })
    setComentario('')
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Revisión de Entrega"
      description={`Dictamen sobre la entrega remitida por "${dependenciaNombre}".`}
    >
      <form onSubmit={handleRevisar} className="space-y-4">
        <div className="space-y-2">
          <Label>Decisión de revisión</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAccion('consolidar')}
              className={`rounded-lg border p-3 text-left transition-all ${
                accion === 'consolidar'
                  ? 'border-success-border bg-success-soft text-success-fg'
                  : 'border-border hover:bg-muted'
              }`}
            >
              <div className="font-semibold text-sm">Consolidar</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Conforme y lista para acta final.
              </div>
            </button>
            <button
              type="button"
              onClick={() => setAccion('observar')}
              className={`rounded-lg border p-3 text-left transition-all ${
                accion === 'observar'
                  ? 'border-warning-border bg-warning-soft text-warning-fg'
                  : 'border-border hover:bg-muted'
              }`}
            >
              <div className="font-semibold text-sm">Observar</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Requiere subsanación del emisor.
              </div>
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="comentario-rev">
            {accion === 'observar'
              ? 'Motivo de la observación (requerido)'
              : 'Fundamento o nota de consolidación (opcional)'}
          </Label>
          <textarea
            id="comentario-rev"
            rows={3}
            required={accion === 'observar'}
            maxLength={500}
            className="w-full rounded-md border border-input bg-background p-2.5 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder={
              accion === 'observar'
                ? 'Detalle los aspectos que deben ser corregidos o sustentados...'
                : 'Detalle la conformidad técnica de la documentación...'
            }
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={revisarMutation.isPending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant={accion === 'observar' ? 'destructive' : 'default'}
            disabled={revisarMutation.isPending}
          >
            {revisarMutation.isPending
              ? 'Procesando...'
              : accion === 'consolidar'
              ? 'Consolidar Entrega'
              : 'Registrar Observación'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

