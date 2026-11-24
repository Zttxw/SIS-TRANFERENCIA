import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Circle, ClipboardCheck, FileArchive, PenLine, Send, UserCheck } from 'lucide-react'
import { toast } from 'sonner'

import { Can } from '@/auth/Can'
import { useAuth } from '@/auth/hooks'
import { esResponsableDe } from '@/auth/permisos'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { RemitirModal } from '@/features/dashboard/RemitirModal'
import { useRequisitosRemision } from '@/features/firmaperu/use-requisitos-remision'
import { cn } from '@/lib/utils'
import {
  ETIQUETA_ESTADO_ENTREGA,
  fueRemitida,
  type EstadoEntrega,
  type EstadoEntregaResponse,
} from '@/types/transferencia'
import { entregasService } from './entregas.service'
import { SuplenciaEtteDialog } from './SuplenciaEtteDialog'
import { usePresentarEntrega, useSuplenciaEtte } from './use-entregas'

const PASOS_CC: { estado: EstadoEntrega; titulo: string }[] = [
  { estado: 'borrador', titulo: 'Preparar anexos' },
  { estado: 'en_revision', titulo: 'Revisión y firma con el coordinador' },
  { estado: 'acta_suscrita', titulo: 'Acta suscrita' },
  { estado: 'remitida', titulo: 'Remitida' },
]

/** La entrega que llega al ETTS sigue la cadena institucional hasta el ETTE (D-12). */
const PASOS_ETTS: { estado: EstadoEntrega; titulo: string }[] = [
  ...PASOS_CC,
  { estado: 'recibida_etts', titulo: 'Recibida por el ETTS' },
  { estado: 'remitida_ette', titulo: 'Enviada al ETTE' },
  { estado: 'recibida_ette', titulo: 'Recibida por el ETTE' },
]

function fecha(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleString('es-PE') : ''
}

/**
 * Entrega del centro de costo vista por su responsable (D-07): prepara los
 * anexos y los cierra para firma (la edición se bloquea). En su sesión, el
 * coordinador ETTE presente revisa, deja observaciones como constancia y firma
 * con su certificado —firmar es aprobar—; con ambos lados firmados, remite.
 */
export function EntregaCentroCostoCard({ estado }: { estado: EstadoEntregaResponse }) {
  const { tiene, usuario } = useAuth()
  const confirmar = useConfirm()
  const presentarMut = usePresentarEntrega()
  const suplenciaMut = useSuplenciaEtte()
  const [remitirAbierto, setRemitirAbierto] = useState(false)
  const [suplenciaAbierta, setSuplenciaAbierta] = useState(false)

  const entrega = estado.entrega
  const actual: EstadoEntrega = entrega?.estado ?? 'borrador'
  const haciaEtts = entrega ? entrega.hacia_etts : !estado.dependencia.parent_id
  const pasos = haciaEtts ? PASOS_ETTS : PASOS_CC
  const indice = pasos.findIndex((p) => p.estado === actual)
  const ultimo = indice === pasos.length - 1
  const remitida = fueRemitida(actual)
  const [descargando, setDescargando] = useState(false)

  const descargarExpediente = async () => {
    setDescargando(true)
    try {
      await entregasService.descargarExpedienteFirmado(estado.dependencia.id)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo descargar el expediente firmado.')
    } finally {
      setDescargando(false)
    }
  }
  const enFirma = actual === 'en_revision' || actual === 'acta_suscrita'
  const operaRevision = esResponsableDe(usuario?.roles ?? [], estado.dependencia.id)
  const firmanteEtte = estado.firmante_ette
  const esSuplente = firmanteEtte?.en_calidad_de === 'titular_suplente'
  const { data: firmas, isFetching: comprobandoFirmas } = useRequisitosRemision(
    estado.dependencia.id,
    enFirma && tiene('entregas.remitir'),
  )

  const presentar = async () => {
    const ok = await confirmar({
      title: 'Cerrar y pasar a firma',
      description:
        'Los anexos quedarán bloqueados para edición. Con el coordinador ETTE presente, registre lo que advierta como observación (constancia en el acta) y firmen ambos los anexos 02 al 07: su firma es la aprobación. No hay devolución para corregir.',
      confirmText: 'Cerrar y pasar a firma',
    })
    if (ok) presentarMut.mutate(estado.dependencia.id)
  }

  const volverAlCoordinador = async () => {
    const ok = await confirmar({
      title: 'Volver a la firma del coordinador',
      description: 'Se retira la suplencia: firmará el coordinador ETTE asignado al centro de costo.',
      confirmText: 'Retirar suplencia',
    })
    if (ok) suplenciaMut.mutate({ dependencia_id: estado.dependencia.id, titular_id: null })
  }

  return (
    <Card className="border shadow-xs">
      <CardHeader className="bg-muted/15 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs font-semibold">{estado.dependencia.codigo}</span>
            <CardTitle className="mt-1 text-base">{estado.dependencia.nombre}</CardTitle>
            <CardDescription className="mt-0.5 text-xs">
              Destino: {haciaEtts ? 'ETTS institucional' : 'centro de costo padre (Anexo 01)'}
            </CardDescription>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {ETIQUETA_ESTADO_ENTREGA[actual]}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-5">
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {pasos.map((paso, i) => {
            const hecho = i < indice || (i === indice && ultimo)
            const enCurso = i === indice && !ultimo
            return (
              <li
                key={paso.estado}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs',
                  hecho && 'border-success-border bg-success-soft text-success-fg',
                  enCurso && 'border-primary/40 bg-primary/5 font-semibold text-primary',
                  !hecho && !enCurso && 'text-muted-foreground',
                )}
              >
                {hecho ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <Circle className="h-3.5 w-3.5 shrink-0" />}
                {paso.titulo}
              </li>
            )
          })}
        </ol>

        <dl className="space-y-1.5 rounded-lg border bg-muted/30 p-3.5 text-xs">
          {entrega?.presentada_en && (
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Cerrada para firma</dt>
              <dd>{fecha(entrega.presentada_en)}{entrega.presentada_por ? ` · ${entrega.presentada_por}` : ''}</dd>
            </div>
          )}
          {entrega?.remitida_en && (
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Remitida</dt>
              <dd>{fecha(entrega.remitida_en)}</dd>
            </div>
          )}
          {entrega?.recibida_etts_en && (
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Recibida por el ETTS</dt>
              <dd>{fecha(entrega.recibida_etts_en)}</dd>
            </div>
          )}
          {entrega?.remitida_ette_en && (
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Enviada al ETTE</dt>
              <dd>{fecha(entrega.remitida_ette_en)}</dd>
            </div>
          )}
          {entrega?.recibida_ette_en && (
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Recibida por el ETTE</dt>
              <dd>{fecha(entrega.recibida_ette_en)}</dd>
            </div>
          )}
          {(entrega?.hijos_pendientes_al_remitir.length ?? 0) > 0 && (
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Remitida sin</dt>
              <dd className="text-right">{entrega!.hijos_pendientes_al_remitir.map((h) => h.codigo).join(', ')}</dd>
            </div>
          )}
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Observaciones del coordinador</dt>
            <dd>{estado.observaciones}</dd>
          </div>
        </dl>

        {!remitida && (
          <div className="space-y-2 rounded-lg border p-3.5 text-xs">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="font-semibold text-foreground">Revisa y firma por el ETTE</p>
                  {firmanteEtte ? (
                    <p className="text-muted-foreground">
                      {firmanteEtte.nombre}{firmanteEtte.dni ? ` · DNI ${firmanteEtte.dni}` : ''} ·{' '}
                      {esSuplente ? `titular ETTE en suplencia (${firmanteEtte.motivo_suplencia})` : 'coordinador ETTE asignado'}
                    </p>
                  ) : (
                    <p className="text-warning-fg">El centro de costo no tiene coordinador ETTE asignado. Solicítelo al comité ETTE.</p>
                  )}
                </div>
              </div>
              {actual === 'en_revision' && operaRevision && (
                esSuplente ? (
                  <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={suplenciaMut.isPending} onClick={() => void volverAlCoordinador()}>
                    Volver al coordinador
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSuplenciaAbierta(true)}>
                    Firma un titular ETTE
                  </Button>
                )
              )}
            </div>
            <p className="text-muted-foreground">
              Firma presencialmente en esta sesión con su propio certificado; su firma es la aprobación de cada documento.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {actual === 'borrador' && 'Complete los anexos 02 al 06 y ciérrelos para la revisión y firma con el coordinador ETTE.'}
            {actual === 'en_revision' &&
              `Con el coordinador presente, registre sus observaciones en cada anexo y firmen ambos los anexos 02 al 07 en «PDF y firma» (con ambas firmas: ${firmas?.firmados ?? 0}/6).`}
            {actual === 'acta_suscrita' && 'Los anexos 02 al 07 tienen ambas firmas. Puede remitir la entrega.'}
            {remitida &&
              (actual === 'remitida'
                ? haciaEtts
                  ? 'La entrega fue remitida al ETTS, que registrará su recepción.'
                  : 'La entrega fue remitida al centro de costo padre, que la consolida.'
                : `${ETIQUETA_ESTADO_ENTREGA[actual]}.`)}
          </p>

          {actual === 'borrador' && (
            <Can permiso="entregas.remitir">
              <Button onClick={presentar} disabled={presentarMut.isPending} className="gap-1.5 text-xs">
                <ClipboardCheck className="h-3.5 w-3.5" />
                Cerrar y pasar a firma
              </Button>
            </Can>
          )}
          {remitida && (
            <Can permiso="expediente.ver">
              <Button variant="outline" onClick={() => void descargarExpediente()} disabled={descargando} className="gap-1.5 text-xs">
                <FileArchive className="h-3.5 w-3.5" />
                Expediente firmado (ZIP)
              </Button>
            </Can>
          )}
          {enFirma && (
            <Can permiso="entregas.remitir">
              <div className="flex gap-2">
                {actual === 'en_revision' && (
                  <Link to="/pdf-firma" className={buttonVariants({ variant: 'outline', size: 'sm', className: 'gap-1.5 text-xs' })}>
                    <PenLine className="h-3.5 w-3.5" /> PDF y firma
                  </Link>
                )}
                {!firmas?.puede_remitir && <PenLine className="h-4 w-4 self-center text-warning-fg" aria-label="Faltan firmas" />}
                <Button
                  onClick={() => setRemitirAbierto(true)}
                  disabled={comprobandoFirmas || !firmas?.puede_remitir}
                  className="gap-1.5 text-xs"
                >
                  <Send className="h-3.5 w-3.5" />
                  {haciaEtts ? 'Remitir al ETTS' : 'Remitir al CC padre'}
                </Button>
              </div>
            </Can>
          )}
        </div>
      </CardContent>

      {suplenciaAbierta && (
        <SuplenciaEtteDialog open onClose={() => setSuplenciaAbierta(false)} dependenciaId={estado.dependencia.id} />
      )}

      <RemitirModal
        open={remitirAbierto}
        onClose={() => setRemitirAbierto(false)}
        dependenciaId={estado.dependencia.id}
        dependenciaNombre={estado.dependencia.nombre}
        haciaEtts={haciaEtts}
        hijosPendientes={estado.hijos_pendientes}
      />
    </Card>
  )
}
