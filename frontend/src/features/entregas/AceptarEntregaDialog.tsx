import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { MotivoSuplenciaField } from '@/features/observaciones/MotivoSuplenciaField'
import { useEsTitularSuplente } from '@/features/observaciones/use-titular-suplente'
import { useVerificarEntrega } from './use-entregas'

interface AceptarEntregaDialogProps {
  open: boolean
  onClose: () => void
  dependenciaId: number
  dependenciaNombre: string
  observaciones: number
}

/**
 * El coordinador ETTE (o un titular en suplencia) acepta lo entregado (D-07) y
 * deja constancia de lo que revisó y lo que no (RF-54, RF-56). Las
 * observaciones registradas no lo impiden: quedan en el acta.
 */
export function AceptarEntregaDialog({ open, onClose, dependenciaId, dependenciaNombre, observaciones }: AceptarEntregaDialogProps) {
  const [resultado, setResultado] = useState('')
  const [motivoSuplencia, setMotivoSuplencia] = useState('')
  const esSuplente = useEsTitularSuplente(dependenciaId)
  const verificarMut = useVerificarEntrega()

  const aceptar = (e: React.FormEvent) => {
    e.preventDefault()
    verificarMut.mutate(
      {
        dependencia_id: dependenciaId,
        resultado_verificacion: resultado.trim(),
        motivo_suplencia: esSuplente ? motivoSuplencia.trim() : undefined,
      },
      {
        onSuccess: () => {
          setResultado('')
          setMotivoSuplencia('')
          onClose()
        },
      },
    )
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Aceptar entrega"
      description={`Acepta lo entregado por «${dependenciaNombre}». Después se firman los anexos y la entrega continúa.`}
    >
      <form onSubmit={aceptar} className="space-y-4">
        <p className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
          {observaciones > 0
            ? `Registró ${observaciones} observación(es). Quedarán como constancia en el acta; el responsable no tiene que subsanarlas.`
            : 'No registró observaciones. Si advierte algo, regístrelo antes de aceptar desde el panel de cada anexo.'}
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="resultado-verificacion">Constancia de lo revisado *</Label>
          <Textarea
            id="resultado-verificacion"
            rows={4}
            maxLength={5000}
            placeholder="Indique qué revisó y qué no (p. ej.: se revisaron los anexos 02 al 06; no se constató físicamente el estado de los bienes)."
            value={resultado}
            onChange={(e) => setResultado(e.target.value)}
            required
          />
          <p className="text-nota text-muted-foreground">La firma no valida lo que no se revisó. Mínimo 10 caracteres.</p>
        </div>
        {esSuplente && (
          <MotivoSuplenciaField id="aceptar-motivo-suplencia" value={motivoSuplencia} onChange={setMotivoSuplencia} />
        )}
        <div className="flex justify-end gap-2 border-t pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={verificarMut.isPending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={verificarMut.isPending}
            disabled={resultado.trim().length < 10 || (esSuplente && !motivoSuplencia.trim())}
          >
            Aceptar entrega
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
