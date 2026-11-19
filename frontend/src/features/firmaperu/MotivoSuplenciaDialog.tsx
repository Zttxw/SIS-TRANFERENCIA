import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { MotivoSuplenciaField } from '@/features/observaciones/MotivoSuplenciaField'

interface Props {
  open: boolean
  onClose: () => void
  onConfirmar: (motivo: string) => void
}

/** Pide el motivo cuando un titular ETTE firma en suplencia del coordinador (D-04). */
export function MotivoSuplenciaDialog({ open, onClose, onConfirmar }: Props) {
  const [motivo, setMotivo] = useState('')

  const confirmar = (e: React.FormEvent) => {
    e.preventDefault()
    onConfirmar(motivo.trim())
    setMotivo('')
  }

  return (
    <Dialog open={open} onClose={onClose} title="Firma en suplencia del coordinador"
      description="Firma por el lado ETTE como titular, en lugar del coordinador asignado a este centro de costo.">
      <form onSubmit={confirmar} className="space-y-4">
        <MotivoSuplenciaField id="firma-motivo-suplencia" value={motivo} onChange={setMotivo} />
        <div className="flex justify-end gap-2 border-t pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={motivo.trim() === ''}>Continuar</Button>
        </div>
      </form>
    </Dialog>
  )
}
