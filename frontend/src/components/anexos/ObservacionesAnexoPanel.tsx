import { useState } from 'react'
import { ChevronDown, ChevronUp, MessageSquareText, Plus } from 'lucide-react'

import { useAuth } from '@/auth/hooks'
import { esResponsableDe } from '@/auth/permisos'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { useEstadoEntrega } from '@/features/entregas/use-entregas'
import { RegistrarObservacionDialog } from '@/features/observaciones/RegistrarObservacionDialog'
import { useObservaciones, useRetirarObservacion } from '@/features/observaciones/use-observaciones'
import { type ClaveAnexoObservable, formatearDetalleObservable } from '@/types/observaciones'

interface ObservacionesAnexoPanelProps {
  anexo: ClaveAnexoObservable
  dependenciaId?: number
}

/**
 * Observaciones del coordinador ETTE sobre un anexo del CC (D-07). Son
 * constancia: no se subsanan ni devuelven la entrega. Durante la revisión
 * presencial, el responsable del CC las registra o retira en su sesión, a
 * nombre del coordinador (o del titular que lo suple), mientras la entrega
 * está en revisión.
 */
export function ObservacionesAnexoPanel({ anexo, dependenciaId }: ObservacionesAnexoPanelProps) {
  const confirmar = useConfirm()
  const { usuario } = useAuth()
  const [expandido, setExpandido] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)

  const { data: estado } = useEstadoEntrega(dependenciaId)
  const { data: resp, isLoading } = useObservaciones(
    { dependencia_id: dependenciaId, anexo, estado: 'registrada', per_page: 50 },
    Boolean(dependenciaId),
  )
  const retirarMut = useRetirarObservacion()

  const observaciones = resp?.data ?? []
  // Solo el responsable de este CC opera la revisión; el backend además exige que el acta no tenga firmas.
  const puedeRegistrar = estado?.entrega?.estado === 'en_revision' && esResponsableDe(usuario?.roles ?? [], dependenciaId)

  return (
    <Card className="border shadow-sm">
      <CardHeader className="bg-muted/15 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info-soft text-info-fg">
              <MessageSquareText className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Observaciones del coordinador ETTE</CardTitle>
                {observaciones.length > 0 && (
                  <span className="rounded-full bg-info-soft px-2 py-0.5 text-xs font-semibold text-info-fg">
                    {observaciones.length}
                  </span>
                )}
              </div>
              <CardDescription className="text-xs">
                Constancia de la revisión: no requieren subsanación y figuran en el acta.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {puedeRegistrar && (
              <Button size="sm" variant="outline" onClick={() => setModalAbierto(true)} className="gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" />
                Registrar observación
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setExpandido(!expandido)}
              aria-label={expandido ? 'Minimizar observaciones' : 'Expandir observaciones'}
            >
              {expandido ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expandido && (
        <CardContent className="pt-4">
          {isLoading ? (
            <p className="py-6 text-center text-xs text-muted-foreground">Cargando observaciones…</p>
          ) : observaciones.length === 0 ? (
            <p className="rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground">
              El coordinador no registró observaciones sobre este anexo.
            </p>
          ) : (
            <ul className="space-y-3">
              {observaciones.map((obs) => (
                <li key={obs.id} className="rounded-lg border bg-card p-3.5 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-muted-foreground">
                    <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-foreground">
                      {formatearDetalleObservable(obs)}
                    </span>
                    <span title={obs.registrada_por ? `Registrada por ${obs.registrada_por.name}` : undefined}>
                      {obs.autor?.name}
                      {obs.en_calidad_de === 'titular_suplente' ? ' (titular ETTE, suplente)' : ''} ·{' '}
                      {new Date(obs.created_at).toLocaleDateString('es-PE')}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap leading-relaxed text-foreground">{obs.descripcion}</p>
                  {puedeRegistrar && (
                      <div className="mt-2 flex justify-end border-t pt-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-muted-foreground hover:text-destructive"
                          disabled={retirarMut.isPending}
                          onClick={async () => {
                            const ok = await confirmar({
                              title: 'Retirar observación',
                              description: 'La observación dejará de figurar en el acta. Solo puede hacerse antes de que se firme el acta.',
                              confirmText: 'Retirar',
                              variant: 'destructive',
                            })
                            if (ok) retirarMut.mutate(obs.id)
                          }}
                        >
                          Retirar
                        </Button>
                      </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      )}

      {dependenciaId && (
        <RegistrarObservacionDialog
          open={modalAbierto}
          onClose={() => setModalAbierto(false)}
          dependenciaId={dependenciaId}
          anexo={anexo}
        />
      )}
    </Card>
  )
}
