import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { MotivoSuplenciaField } from './MotivoSuplenciaField'
import { useSuplenciaEtte, useTitularesEtte } from './use-entregas'

interface SuplenciaEtteDialogProps {
  open: boolean
  onClose: () => void
  dependenciaId: number
}

/**
 * Si el coordinador ETTE no puede asistir a la revisión, el responsable designa
 * al titular ETTE que lo suple (D-04). Desde entonces solo se admite el
 * certificado de ese titular por el lado ETTE, figura como receptor en el acta y
 * las observaciones quedan a su nombre. Solo se cambia antes de que firme el
 * lado ETTE o el acta.
 */
export function SuplenciaEtteDialog({ open, onClose, dependenciaId }: SuplenciaEtteDialogProps) {
  const [titularId, setTitularId] = useState<number | null>(null)
  const [motivo, setMotivo] = useState('')
  const { data: titulares, isLoading } = useTitularesEtte(open)
  const designar = useSuplenciaEtte()

  const confirmar = (e: React.FormEvent) => {
    e.preventDefault()
    if (titularId === null) return
    designar.mutate(
      { dependencia_id: dependenciaId, titular_id: titularId, motivo_suplencia: motivo.trim() },
      {
        onSuccess: () => {
          setTitularId(null)
          setMotivo('')
          onClose()
        },
      },
    )
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Firma un titular ETTE en suplencia"
      description="Use esta opción solo si el coordinador ETTE asignado no puede asistir a la revisión y firma."
    >
      <form onSubmit={confirmar} className="space-y-4">
        <div className="space-y-1.5">
          <Label id="suplencia-titular">Titular ETTE *</Label>
          <Select
            aria-labelledby="suplencia-titular"
            buscable
            disabled={isLoading}
            value={titularId}
            onChange={setTitularId}
            placeholder={isLoading ? 'Cargando titulares…' : 'Seleccione el titular que firmará'}
            options={(titulares ?? []).map((t) => ({ value: t.id, label: `${t.nombre}${t.dni ? ` · DNI ${t.dni}` : ''}` }))}
          />
        </div>
        <MotivoSuplenciaField id="suplencia-motivo" value={motivo} onChange={setMotivo} />
        <div className="flex items-center justify-end gap-2 border-t pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={designar.isPending}>
            Cancelar
          </Button>
          <Button type="submit" loading={designar.isPending} disabled={titularId === null || !motivo.trim()}>
            Designar
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
