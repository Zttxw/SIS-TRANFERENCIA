import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useEstadoEntrega } from '@/features/entregas/use-entregas'
import { ANEXOS_OBSERVABLES_CONFIG, type ClaveAnexoObservable } from '@/types/observaciones'
import { useRegistrarObservacion } from './use-observaciones'

interface RegistrarObservacionDialogProps {
  open: boolean
  onClose: () => void
  dependenciaId: number
  anexo: ClaveAnexoObservable
}

/**
 * Durante la revisión presencial, el responsable registra en su sesión lo que
 * advierte el coordinador ETTE (o el titular que lo suple) sobre un anexo del CC
 * (D-07). Queda a nombre del coordinador, como constancia en el acta; no
 * devuelve la entrega.
 */
export function RegistrarObservacionDialog({ open, onClose, dependenciaId, anexo }: RegistrarObservacionDialogProps) {
  const [descripcion, setDescripcion] = useState('')
  const { data: estado } = useEstadoEntrega(dependenciaId)
  const registrarMut = useRegistrarObservacion()
  const firmante = estado?.firmante_ette

  const registrar = (e: React.FormEvent) => {
    e.preventDefault()
    registrarMut.mutate(
      { anexo, dependencia_id: dependenciaId, descripcion: descripcion.trim() },
      {
        onSuccess: () => {
          setDescripcion('')
          onClose()
        },
      },
    )
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Registrar observación del coordinador"
      description={`Sobre el ${ANEXOS_OBSERVABLES_CONFIG[anexo].nombre}. Queda como constancia en el acta; no devuelve la entrega.`}
    >
      <form onSubmit={registrar} className="space-y-4">
        <p className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          Se registra a nombre de{' '}
          <strong className="text-foreground">{firmante?.nombre ?? 'el coordinador ETTE'}</strong>
          {firmante?.en_calidad_de === 'titular_suplente' ? ' (titular ETTE, en suplencia)' : ' (coordinador ETTE)'}.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="obs-descripcion">Observación *</Label>
          <Textarea
            id="obs-descripcion"
            rows={4}
            placeholder="Describa lo advertido. Si se refiere a un registro concreto, identifíquelo (código, número, nombre)."
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            required
          />
          <p className="text-nota text-muted-foreground">Mínimo 5 caracteres.</p>
        </div>
        <div className="flex items-center justify-end gap-2 border-t pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={registrarMut.isPending}>
            Cancelar
          </Button>
          <Button type="submit" loading={registrarMut.isPending} disabled={descripcion.trim().length < 5 || !firmante}>
            Registrar
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
