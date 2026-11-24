import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useRemitirEntrega } from './use-dashboard'
import { ApiError } from '@/types/api'
import { useRequisitosRemision } from '@/features/firmaperu/use-requisitos-remision'
import type { HijoPendiente } from '@/types/transferencia'

interface RemitirModalProps {
  open: boolean
  onClose: () => void
  dependenciaId: number
  dependenciaNombre: string
  haciaEtts: boolean
  /** CC hijos directos que aún no envían: exigen confirmación (D-08). */
  hijosPendientes?: HijoPendiente[]
}

export function RemitirModal({
  open,
  onClose,
  dependenciaId,
  dependenciaNombre,
  haciaEtts,
  hijosPendientes = [],
}: RemitirModalProps) {
  const [comentario, setComentario] = useState('')
  const [sinHijos, setSinHijos] = useState(false)
  const faltanHijos = hijosPendientes.length > 0
  const remitirMutation = useRemitirEntrega()
  const { data: requisitos, isFetching: comprobando } = useRequisitosRemision(dependenciaId, open)

  const cerrar = () => {
    if (remitirMutation.isPending) return
    remitirMutation.reset()
    setComentario('')
    setSinHijos(false)
    onClose()
  }

  const handleRemitir = async (e: React.FormEvent) => {
    e.preventDefault()
    if (comprobando || !requisitos?.puede_remitir || (faltanHijos && !sinHijos)) return
    try {
      await remitirMutation.mutateAsync({
        dependencia_id: dependenciaId,
        comentario: comentario.trim() || undefined,
        confirmar_sin_hijos: faltanHijos ? sinHijos : undefined,
      })
      setComentario('')
      setSinHijos(false)
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
        haciaEtts ? 'al ETTS institucional.' : 'al centro de costo padre (Anexo 01).'
      }`}
    >
      <form onSubmit={handleRemitir} className="space-y-4">
        {!requisitos?.puede_remitir && <p className="text-xs text-warning-fg">
          {comprobando ? 'Comprobando firmas…' : 'Se requieren los anexos 02 al 07 con la firma vigente del responsable y del coordinador ETTE.'}
        </p>}
        {remitirMutation.error && (
          <div role="alert" className="rounded-lg border border-danger-border bg-danger-soft p-3 text-sm text-danger-fg">
            {remitirMutation.error instanceof ApiError && remitirMutation.error.errors?.cronograma
              ? `El plazo de remisión está vencido. ${remitirMutation.error.message}`
              : remitirMutation.error.message}
          </div>
        )}
        <div className="rounded-lg border border-warning-border bg-warning-soft p-3 text-xs text-warning-fg">
          Los anexos 02 al 07 tienen la firma del responsable y del coordinador ETTE. Al remitirla, pasa al {haciaEtts ? 'ETTS' : 'centro de costo padre'}, que solo la consolida.
        </div>

        {faltanHijos && (
          <div className="space-y-2 rounded-lg border border-warning-border bg-warning-soft p-3 text-xs text-warning-fg">
            <p className="font-semibold">Centros de costo dependientes que aún no envían su entrega:</p>
            <ul className="list-disc space-y-0.5 pl-4">
              {hijosPendientes.map((hijo) => (
                <li key={hijo.id}>
                  <span className="font-mono">{hijo.codigo}</span> {hijo.nombre}
                </li>
              ))}
            </ul>
            <p>Puede remitir sin ellos; enviarán después y quedarán marcados como «enviado tarde».</p>
            <label className="flex items-center gap-2 font-medium">
              <input type="checkbox" checked={sinHijos} onChange={(e) => setSinHijos(e.target.checked)} />
              Remitir sin esperar a estos centros de costo
            </label>
          </div>
        )}

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
          <Button
            type="submit"
            disabled={remitirMutation.isPending || comprobando || !requisitos?.puede_remitir || (faltanHijos && !sinHijos)}
          >
            {remitirMutation.isPending ? 'Remitiendo...' : 'Confirmar y Remitir'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

