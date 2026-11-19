import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ANEXOS_OBSERVABLES_CONFIG, type ClaveAnexoObservable } from '@/types/observaciones'
import { MotivoSuplenciaField } from './MotivoSuplenciaField'
import { useRegistrarObservacion } from './use-observaciones'
import { useEsTitularSuplente } from './use-titular-suplente'

interface RegistrarObservacionDialogProps {
  open: boolean
  onClose: () => void
  dependenciaId: number
  anexo: ClaveAnexoObservable
}

/**
 * El coordinador ETTE (o un titular en suplencia) registra una observación sobre
 * un anexo del CC (D-07). Es constancia: queda en el acta y no devuelve la
 * entrega.
 */
export function RegistrarObservacionDialog({ open, onClose, dependenciaId, anexo }: RegistrarObservacionDialogProps) {
  const [descripcion, setDescripcion] = useState('')
  const [motivoSuplencia, setMotivoSuplencia] = useState('')
  const esSuplente = useEsTitularSuplente(dependenciaId)
  const registrarMut = useRegistrarObservacion()

  const registrar = (e: React.FormEvent) => {
    e.preventDefault()
    registrarMut.mutate(
      {
        anexo,
        dependencia_id: dependenciaId,
        descripcion: descripcion.trim(),
        motivo_suplencia: esSuplente ? motivoSuplencia.trim() : undefined,
      },
      {
        onSuccess: () => {
          setDescripcion('')
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
      title="Registrar observación"
      description={`Sobre el ${ANEXOS_OBSERVABLES_CONFIG[anexo].nombre}. Queda como constancia en el acta; no devuelve la entrega.`}
    >
      <form onSubmit={registrar} className="space-y-4">
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
        {esSuplente && (
          <MotivoSuplenciaField id="obs-motivo-suplencia" value={motivoSuplencia} onChange={setMotivoSuplencia} />
        )}
        <div className="flex items-center justify-end gap-2 border-t pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={registrarMut.isPending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={registrarMut.isPending}
            disabled={descripcion.trim().length < 5 || (esSuplente && !motivoSuplencia.trim())}
          >
            Registrar
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
