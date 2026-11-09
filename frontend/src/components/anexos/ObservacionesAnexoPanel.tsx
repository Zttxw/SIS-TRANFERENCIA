import { useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Plus,
  Send,
  XCircle,
} from 'lucide-react'

import { Can } from '@/auth/Can'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { Dialog } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  useDesestimarObservacion,
  useObservaciones,
  useRegistrarObservacion,
  useSubsanarObservacion,
} from '@/features/observaciones/use-observaciones'
import type { ClaveAnexoObservable, Observacion } from '@/types/observaciones'

interface ObservacionesAnexoPanelProps {
  anexo: ClaveAnexoObservable
  observableId?: number
  dependenciaId?: number
  esModificable?: boolean
}

export function ObservacionesAnexoPanel({
  anexo,
  observableId,
  dependenciaId,
  esModificable = true,
}: ObservacionesAnexoPanelProps) {
  const confirmar = useConfirm()
  const [expandido, setExpandido] = useState(true)
  const [modalRegistroAbierto, setModalRegistroAbierto] = useState(false)
  const [descripcionNueva, setDescripcionNueva] = useState('')

  const [observacionASubsanar, setObservacionASubsanar] = useState<Observacion | null>(null)
  const [respuestaSubsanacion, setRespuestaSubsanacion] = useState('')

  const { data: resp, isLoading } = useObservaciones({
    dependencia_id: dependenciaId,
    anexo,
    per_page: 50,
  })

  const registrarMut = useRegistrarObservacion()
  const subsanarMut = useSubsanarObservacion()
  const desestimarMut = useDesestimarObservacion()

  const observaciones = resp?.data ?? []
  const abiertas = observaciones.filter((o) => o.estado === 'abierta').length
  const subsanadas = observaciones.filter((o) => o.estado === 'subsanada').length

  const handleCrearObservacion = (e: React.FormEvent) => {
    e.preventDefault()
    if (!observableId || !descripcionNueva.trim()) return

    registrarMut.mutate(
      {
        anexo,
        observable_id: observableId,
        descripcion: descripcionNueva.trim(),
      },
      {
        onSuccess: () => {
          setModalRegistroAbierto(false)
          setDescripcionNueva('')
        },
      },
    )
  }

  const handleSubsanarObservacion = (e: React.FormEvent) => {
    e.preventDefault()
    if (!observacionASubsanar || !respuestaSubsanacion.trim()) return

    subsanarMut.mutate(
      {
        id: observacionASubsanar.id,
        respuesta: respuestaSubsanacion.trim(),
      },
      {
        onSuccess: () => {
          setObservacionASubsanar(null)
          setRespuestaSubsanacion('')
        },
      },
    )
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="bg-muted/15 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning-soft text-warning-fg">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Observaciones y Subsanaciones</CardTitle>
                {abiertas > 0 ? (
                  <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning-fg">
                    {abiertas} pendiente{abiertas !== 1 ? 's' : ''}
                  </span>
                ) : observaciones.length > 0 ? (
                  <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold text-success-fg">
                    {subsanadas} resuelta{subsanadas !== 1 ? 's' : ''}
                  </span>
                ) : null}
              </div>
              <CardDescription className="text-xs">
                Canal formal de revisión y subsanación según Directiva §7.9
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Can permiso="observaciones.registrar">
              {observableId && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setModalRegistroAbierto(true)}
                  className="gap-1.5 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Formular Observación
                </Button>
              )}
            </Can>

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
            <div className="py-6 text-center text-xs text-muted-foreground">
              Cargando observaciones...
            </div>
          ) : observaciones.length === 0 ? (
            <div className="rounded-lg border border-dashed py-8 text-center text-xs text-muted-foreground">
              <CheckCircle2 className="mx-auto mb-1.5 h-6 w-6 text-success opacity-80" />
              <p className="font-medium text-foreground">Sin observaciones</p>
              <p className="mt-0.5">No se registran observaciones formuladas para este anexo.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {observaciones.map((obs) => {
                const esAbierta = obs.estado === 'abierta'
                const esSubsanada = obs.estado === 'subsanada'
                const esDesestimada = obs.estado === 'desestimada'

                return (
                  <div
                    key={obs.id}
                    className={`rounded-lg border p-4 text-xs transition-colors ${
                      esAbierta
                        ? 'border-warning-border bg-warning-soft'
                        : esSubsanada
                          ? 'border-success-border bg-success-soft'
                          : 'border-muted bg-muted/20 opacity-70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {esAbierta && <AlertCircle className="h-4 w-4 text-warning-fg shrink-0" />}
                        {esSubsanada && <CheckCircle2 className="h-4 w-4 text-success-fg shrink-0" />}
                        {esDesestimada && <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />}
                        <span className="font-semibold text-foreground">
                          Observación #{obs.id}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-microdato font-medium uppercase ${
                            esAbierta
                              ? 'bg-warning-soft text-warning-fg'
                              : esSubsanada
                                ? 'bg-success-soft text-success-fg'
                                : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {obs.estado}
                        </span>
                      </div>

                      <span className="text-nota text-muted-foreground">
                        {new Date(obs.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="mt-2 text-foreground font-normal whitespace-pre-wrap leading-relaxed">
                      {obs.descripcion}
                    </p>

                    {obs.autor && (
                      <p className="mt-1 text-nota text-muted-foreground">
                        Formulado por: <span className="font-medium text-foreground">{obs.autor.name}</span>
                      </p>
                    )}

                    {/* Respuesta de subsanación */}
                    {esSubsanada && obs.respuesta_subsanacion && (
                      <div className="mt-3 rounded border border-success-border bg-success-soft p-2.5">
                        <div className="flex items-center justify-between text-nota font-semibold text-success-fg">
                          <span>Sustento de Subsanación:</span>
                          {obs.subsanada_en && (
                            <span className="font-normal text-muted-foreground text-microdato">
                              {new Date(obs.subsanada_en).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-success-fg whitespace-pre-wrap">
                          {obs.respuesta_subsanacion}
                        </p>
                        {obs.responsable && (
                          <p className="mt-1 text-microdato text-success-fg/80">
                            Subsanado por: {obs.responsable.name}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Botones de acción contextuales */}
                    <div className="mt-3 flex items-center justify-end gap-2 border-t pt-2">
                      <Can permiso="observaciones.registrar">
                        {esAbierta && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-destructive hover:bg-destructive/10"
                            disabled={desestimarMut.isPending}
                            onClick={async () => {
                              const ok = await confirmar({
                                title: 'Desestimar observación',
                                description:
                                  'La observación quedará marcada como desestimada y dejará de requerir subsanación. Esta acción no se puede deshacer.',
                                confirmText: 'Desestimar',
                                variant: 'destructive',
                              })
                              if (ok) desestimarMut.mutate(obs.id)
                            }}
                          >
                            Desestimar
                          </Button>
                        )}
                      </Can>

                      <Can permiso="observaciones.subsanar">
                        {esAbierta && esModificable && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 text-xs text-warning-fg border-warning-border hover:bg-warning-soft"
                            onClick={() => {
                              setObservacionASubsanar(obs)
                              setRespuestaSubsanacion('')
                            }}
                          >
                            <Send className="h-3 w-3" />
                            Subsanar Observación
                          </Button>
                        )}
                      </Can>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      )}

      {/* Modal Registrar Observación */}
      <Dialog
        open={modalRegistroAbierto}
        onClose={() => setModalRegistroAbierto(false)}
        title="Formular Observación Formal"
        description="Esta observación requerirá subsanación obligatoria por parte del responsable del anexo antes de continuar el flujo."
      >
        <form onSubmit={handleCrearObservacion} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="obs-desc">Detalle o Motivo de la Observación *</Label>
            <Textarea
              id="obs-desc"
              rows={4}
              placeholder="Indique con precisión el aspecto a corregir o la inconsistencia advertida..."
              value={descripcionNueva}
              onChange={(e) => setDescripcionNueva(e.target.value)}
              required
            />
            <p className="text-nota text-muted-foreground">Mínimo 5 caracteres.</p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalRegistroAbierto(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={registrarMut.isPending || descripcionNueva.trim().length < 5}
              loading={registrarMut.isPending}
            >
              Registrar Observación
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal Subsanar Observación */}
      <Dialog
        open={observacionASubsanar !== null}
        onClose={() => setObservacionASubsanar(null)}
        title={`Subsanar Observación #${observacionASubsanar?.id ?? ''}`}
        description="Ingrese el sustento o describa la acción adoptada para levantar la observación."
      >
        <form onSubmit={handleSubsanarObservacion} className="space-y-4">
          <div className="rounded-md bg-muted/50 p-3 text-xs">
            <p className="font-semibold text-foreground">Observación observada:</p>
            <p className="mt-1 text-muted-foreground whitespace-pre-wrap">
              {observacionASubsanar?.descripcion}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="obs-subsanar">Sustento de Subsanación *</Label>
            <Textarea
              id="obs-subsanar"
              rows={4}
              placeholder="Explique las correcciones efectuadas en la información del anexo..."
              value={respuestaSubsanacion}
              onChange={(e) => setRespuestaSubsanacion(e.target.value)}
              required
            />
            <p className="text-nota text-muted-foreground">Mínimo 5 caracteres.</p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setObservacionASubsanar(null)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={subsanarMut.isPending || respuestaSubsanacion.trim().length < 5}
              loading={subsanarMut.isPending}
            >
              Confirmar Subsanación
            </Button>
          </div>
        </form>
      </Dialog>
    </Card>
  )
}

