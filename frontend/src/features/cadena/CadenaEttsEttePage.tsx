import { useMemo, useState } from 'react'
import { AlertTriangle, FileDown, Inbox, PackageCheck, Send } from 'lucide-react'
import { toast } from 'sonner'

import { useAuth } from '@/auth/hooks'
import { PERMISOS, type Permiso } from '@/auth/permisos'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { entregasService } from '@/features/entregas/entregas.service'
import { useCadenaEtts, useEnviosEtte, usePasoCadena } from '@/features/entregas/use-entregas'
import { cn } from '@/lib/utils'
import { fueRemitida, type EntregaCadenaEtts, type EnvioEtte, type EstadoEntrega } from '@/types/transferencia'
import { FirmaAnexo01Panel } from './FirmaAnexo01Panel'

type Accion = 'recibir-etts' | 'enviar-ette' | 'recibir-ette'

/** Estado de la entrega sobre el que actúa cada paso, y el permiso que lo habilita. */
const ACCIONES: Record<Accion, { desde: EstadoEntrega; permiso: Permiso; etiqueta: string }> = {
  'recibir-etts': { desde: 'remitida', permiso: PERMISOS.RecibirEntregaEtts, etiqueta: 'Registrar recepción en el ETTS' },
  'enviar-ette': { desde: 'recibida_etts', permiso: PERMISOS.RemitirEntregaEtte, etiqueta: 'Enviar al ETTE' },
  'recibir-ette': { desde: 'remitida_ette', permiso: PERMISOS.RecibirEntregaEtte, etiqueta: 'Registrar recepción en el ETTE' },
}

const ICONO: Record<Accion, typeof Inbox> = { 'recibir-etts': Inbox, 'enviar-ette': Send, 'recibir-ette': PackageCheck }

function fecha(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }) : '—'
}

function quien(nombre: string | null, iso: string | null): string {
  return iso ? `${fecha(iso)}${nombre ? ` · ${nombre}` : ''}` : '—'
}

/**
 * Cadena institucional ETTS → ETTE (D-12): el ETTS registra la recepción de las
 * entregas de los CC sin padre en el Anexo 01, las envía al ETTE por lotes con
 * constancia (RF-75) y el ETTE registra la recepción final. Al completarse, se
 * firma el Anexo 01.
 */
export function CadenaEttsEttePage() {
  const { tiene } = useAuth()
  const { data: entregas = [], isLoading } = useCadenaEtts()
  const { data: envios = [] } = useEnviosEtte()
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set())
  const [enviando, setEnviando] = useState(false)
  const [comentario, setComentario] = useState('')
  const pasos = {
    'recibir-etts': usePasoCadena('recibir-etts'),
    'enviar-ette': usePasoCadena('enviar-ette'),
    'recibir-ette': usePasoCadena('recibir-ette'),
  }

  const accionesPermitidas = (Object.keys(ACCIONES) as Accion[]).filter((a) => tiene(ACCIONES[a].permiso))
  const accionDe = (estado: EstadoEntrega): Accion | undefined =>
    accionesPermitidas.find((a) => ACCIONES[a].desde === estado)

  const seleccionadas = entregas.filter((e) => seleccion.has(e.id))
  // Solo se actúa en lote sobre entregas en el mismo paso.
  const accionLote = seleccionadas.length > 0 ? accionDe(seleccionadas[0].estado) : undefined
  const loteValido = accionLote !== undefined && seleccionadas.every((e) => accionDe(e.estado) === accionLote)

  const resumen = useMemo(() => {
    const contar = (estado: EstadoEntrega) => entregas.filter((e) => e.estado === estado).length
    return {
      total: entregas.length,
      porRecibir: contar('remitida'),
      enEtts: contar('recibida_etts'),
      enviadas: contar('remitida_ette'),
      recibidas: contar('recibida_ette'),
      sinRemitir: entregas.filter((e) => !fueRemitida(e.estado)).length,
    }
  }, [entregas])

  const alternar = (entrega: EntregaCadenaEtts) => {
    setSeleccion((previa) => {
      const nueva = new Set(previa)
      if (nueva.has(entrega.id)) nueva.delete(entrega.id)
      else nueva.add(entrega.id)
      return nueva
    })
  }

  const ejecutar = async (accion: Accion, ids: number[], nota?: string) => {
    try {
      await pasos[accion].mutateAsync({ dependenciaIds: ids, comentario: nota })
      setSeleccion(new Set())
      setEnviando(false)
      setComentario('')
    } catch {
      // El hook ya muestra el error.
    }
  }

  const solicitar = (accion: Accion, ids: number[]) => {
    if (accion === 'enviar-ette') {
      setSeleccion(new Set(ids))
      setEnviando(true)
    } else {
      void ejecutar(accion, ids)
    }
  }

  const descargarConstancia = (envio: EnvioEtte) =>
    entregasService.descargarConstanciaEnvio(envio).catch((error: Error) => toast.error(error.message))

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Cadena ETTS → ETTE</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Entregas de los centros de costo que envían directo al ETTS, cada una con lo consolidado por su subárbol.
          El ETTS registra la recepción y las envía al ETTE por lotes, con constancia; el ETTE registra la recepción
          final.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ['Sin remitir', resumen.sinRemitir],
          ['Por recibir (ETTS)', resumen.porRecibir],
          ['En el ETTS', resumen.enEtts],
          ['Enviadas al ETTE', resumen.enviadas],
          ['Recibidas por el ETTE', resumen.recibidas],
        ].map(([titulo, valor]) => (
          <Card key={titulo} className="p-3">
            <p className="text-mini text-muted-foreground">{titulo}</p>
            <p className="text-xl font-bold">{valor}</p>
          </Card>
        ))}
      </div>

      <Card className="border shadow-xs">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 bg-muted/15 pb-4">
          <div>
            <CardTitle className="text-base">Entregas dirigidas al ETTS</CardTitle>
            <CardDescription className="text-xs">
              Seleccione varias entregas del mismo paso para actuar en lote.
            </CardDescription>
          </div>
          {accionLote && (
            <Button
              className="gap-1.5 text-xs"
              disabled={!loteValido || pasos[accionLote].isPending}
              onClick={() => solicitar(accionLote, seleccionadas.map((e) => e.id))}
            >
              {ACCIONES[accionLote].etiqueta} ({seleccionadas.length})
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b bg-muted/30 text-left text-muted-foreground">
                <tr>
                  <th className="w-8 px-3 py-2" />
                  <th className="px-3 py-2 font-medium">Centro de costo</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                  <th className="px-3 py-2 font-medium">Subárbol</th>
                  <th className="px-3 py-2 font-medium">Remitida</th>
                  <th className="px-3 py-2 font-medium">Recepción ETTS</th>
                  <th className="px-3 py-2 font-medium">Lote</th>
                  <th className="px-3 py-2 font-medium">Recepción ETTE</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {entregas.map((entrega) => {
                  const accion = accionDe(entrega.estado)
                  const Icono = accion ? ICONO[accion] : null
                  return (
                    <tr key={entrega.id} className={cn(seleccion.has(entrega.id) && 'bg-primary/5')}>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          aria-label={`Seleccionar ${entrega.codigo}`}
                          disabled={!accion}
                          checked={seleccion.has(entrega.id)}
                          onChange={() => alternar(entrega)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-mono font-semibold">{entrega.codigo}</span> {entrega.nombre}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-mini font-semibold',
                            entrega.estado === 'recibida_ette'
                              ? 'bg-success-soft text-success-fg'
                              : fueRemitida(entrega.estado)
                                ? 'bg-info-soft text-info-fg'
                                : 'bg-muted text-muted-foreground',
                          )}
                        >
                          {entrega.estado_etiqueta}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {entrega.subarbol.total === 0
                          ? '—'
                          : `${entrega.subarbol.remitidos}/${entrega.subarbol.total} remitidos`}
                        {entrega.subarbol.enviados_tarde > 0 && (
                          <span className="ml-1 inline-flex items-center gap-0.5 text-warning-fg">
                            <AlertTriangle className="h-3 w-3" /> {entrega.subarbol.enviados_tarde} tarde
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">{quien(entrega.remitida_por, entrega.remitida_en)}</td>
                      <td className="px-3 py-2">{quien(entrega.recibida_etts_por, entrega.recibida_etts_en)}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono">{entrega.envio_ette?.codigo ?? '—'}</td>
                      <td className="px-3 py-2">{quien(entrega.recibida_ette_por, entrega.recibida_ette_en)}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        {accion && Icono && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 text-mini"
                            disabled={pasos[accion].isPending}
                            onClick={() => solicitar(accion, [entrega.id])}
                          >
                            <Icono className="h-3 w-3" />
                            {ACCIONES[accion].etiqueta}
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-xs">
        <CardHeader className="bg-muted/15 pb-4">
          <CardTitle className="text-base">Lotes enviados al ETTE</CardTitle>
          <CardDescription className="text-xs">Cada envío tiene su constancia de entrega (RF-75).</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {envios.length === 0 ? (
            <p className="p-5 text-xs text-muted-foreground">Aún no se envían entregas al ETTE.</p>
          ) : (
            <ul className="divide-y text-xs">
              {envios.map((envio) => (
                <li key={envio.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <div>
                    <p className="font-mono font-semibold">{envio.codigo}</p>
                    <p className="text-muted-foreground">
                      {quien(envio.enviado_por, envio.enviado_en)} · {envio.centros.map((c) => c.codigo).join(', ')}
                    </p>
                    {envio.comentario && <p className="text-muted-foreground">{envio.comentario}</p>}
                  </div>
                  <Button size="sm" variant="outline" className="h-7 gap-1 text-mini" onClick={() => void descargarConstancia(envio)}>
                    <FileDown className="h-3 w-3" /> Constancia PDF
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <FirmaAnexo01Panel />

      <Dialog
        open={enviando}
        onClose={() => !pasos['enviar-ette'].isPending && setEnviando(false)}
        title="Enviar al ETTE"
        description={`Se enviará un lote con ${seleccion.size} entrega(s) y se generará su constancia de entrega.`}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="comentario-envio">Comentario (opcional)</Label>
            <textarea
              id="comentario-envio"
              rows={3}
              maxLength={1000}
              className="w-full rounded-md border border-input bg-background p-2.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEnviando(false)} disabled={pasos['enviar-ette'].isPending}>
              Cancelar
            </Button>
            <Button
              disabled={pasos['enviar-ette'].isPending}
              onClick={() => void ejecutar('enviar-ette', [...seleccion], comentario.trim() || undefined)}
            >
              Enviar lote
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
