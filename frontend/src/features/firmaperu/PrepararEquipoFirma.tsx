import { useEffect, useState } from 'react'
import { CheckCircle2, Copy, ExternalLink, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { api } from '@/lib/api'
import { comprobarServicioFirma, enlaceInstalador, enlaceSistemaEnEdge, entornoFirma, GUIA_FIRMA, urlInstalador } from './equipo-firmaperu'

export function PrepararEquipoFirma({ onCerrar, onContinuar }: { onCerrar: () => void; onContinuar: () => void }) {
  const [estado, setEstado] = useState<'comprobando' | 'sin_respuesta' | 'listo'>('comprobando')
  const [revision, setRevision] = useState(0)
  const entorno = entornoFirma(navigator.userAgent)
  const instalador = urlInstalador(api.defaults.baseURL ?? '/api', window.location.origin)
  const enlace = enlaceInstalador(instalador, navigator.userAgent)
  const respaldo = enlaceSistemaEnEdge(window.location.href, navigator.userAgent)

  useEffect(() => {
    const controlador = new AbortController()
    let temporizador: ReturnType<typeof setTimeout> | undefined
    const inicio = Date.now()
    const comprobar = async () => {
      try {
        const responde = await comprobarServicioFirma(controlador.signal)
        if (controlador.signal.aborted) return
        setEstado(responde ? 'listo' : 'sin_respuesta')
        if (!responde && Date.now() - inicio < 120000) temporizador = setTimeout(() => void comprobar(), 2500)
      } catch { /* Al cerrar el diálogo se cancela la comprobación. */ }
    }
    void comprobar()
    return () => { controlador.abort(); clearTimeout(temporizador) }
  }, [revision])

  const copiar = async () => {
    try { await navigator.clipboard.writeText(instalador); toast.info('Enlace copiado. Ábralo en Microsoft Edge.') }
    catch { toast.error('No se pudo copiar. Puede seleccionar el enlace de abajo.') }
  }

  return (
    <Dialog open onClose={onCerrar} title="Firmar desde Chrome o Microsoft Edge"
      description="Use el cliente oficial de Firma Perú de su computadora. No necesita extensiones ni instalar FirmaBridge.">
      <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1 text-sm">
        <div role="status" aria-live="polite" className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
          {estado === 'listo' ? <CheckCircle2 className="h-5 w-5 text-success-fg" /> : <Loader2 className={`h-5 w-5 ${estado === 'comprobando' ? 'animate-spin' : ''}`} />}
          <span>{estado === 'listo' ? 'Firma Perú responde en este navegador. Puede continuar con la firma.'
            : estado === 'comprobando' ? 'Comprobando el servicio de Firma Perú…'
              : 'Firma Perú todavía no responde. Puede estar cerrado, faltar la instalación o un permiso del navegador.'}</span>
        </div>
        {estado !== 'listo' && (
          <>
            {entorno.windows ? (
              <>
                <div className="space-y-2">
                  <p className="font-medium">{entorno.edge ? 'Continuar en Microsoft Edge' : 'Continuar en este navegador'}</p>
                  <p>{entorno.edge
                    ? 'Pulse «Iniciar Firma Perú» y acepte la apertura del cliente oficial. Espere a que esta pantalla confirme que responde.'
                    : 'Si el cliente oficial ya está abierto, puede firmar desde Chrome. Si está cerrado, inícielo desde Windows o use el botón de abajo para abrirlo con Edge; después vuelva a esta pestaña.'}</p>
                  <p>Si el navegador solicita acceso a la red local, permítalo para este sistema. Después pulse «Comprobar de nuevo».</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {enlace && <a href={enlace} target={entorno.edge ? '_blank' : undefined} rel="noopener noreferrer" className={buttonVariants({ size: 'sm' })}>
                    <ExternalLink className="mr-2 h-4 w-4" />{entorno.edge ? 'Iniciar Firma Perú' : 'Iniciar cliente con Edge'}
                  </a>}
                </div>
                <p className="text-xs text-muted-foreground">Si el cliente oficial no está instalado, Windows solicitará instalarlo. Es necesario para usar su certificado local. Si ya está instalado, puede comprobar actualizaciones al abrirse.</p>
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer">Si el cliente no se abre</summary>
                  <div className="mt-2 space-y-2">
                    <p>Si se descarga FirmaPeruWeb.application, no lo abra desde Descargas. Copie el enlace y ábralo en Edge. Revise ClickOnce en edge://flags/#edge-click-once; si la institución lo bloquea, solicite ayuda a soporte. Se requiere .NET Framework 4.8 o superior.</p>
                    <Button size="sm" variant="outline" onClick={() => void copiar()}><Copy className="mr-2 h-4 w-4" /> Copiar enlace del cliente</Button>
                    <p className="break-all rounded bg-muted p-2 select-all">{instalador}</p>
                  </div>
                </details>
              </>
            ) : (
              <div className="space-y-2">
                <p>Prepare Java y el iniciador según la guía oficial de su sistema operativo. En Linux utilice Mozilla Firefox. Después, abra el cliente y espere la comprobación.</p>
                <a href="jnlps://apps.firmaperu.gob.pe/web/jwslauncher.jsp?port=48596" className={buttonVariants({ size: 'sm' })}>
                  <ExternalLink className="mr-2 h-4 w-4" /> Iniciar Firma Perú
                </a>
              </div>
            )}
            <a href={GUIA_FIRMA} target="_blank" rel="noopener noreferrer" className="inline-block text-primary underline">Guía oficial de preparación de Firma Perú</a>
          </>
        )}
        {respaldo && (
          <div className="space-y-2 rounded-lg border p-3">
            <p className="font-medium">¿Chrome sigue sin responder? Continúe en Edge</p>
            <p>Guarde los cambios antes de cambiar de navegador. Abra el sistema en Edge, inicie sesión si se lo solicita y seleccione la dependencia y el anexo que desea firmar.</p>
            <a href={respaldo} rel="noopener noreferrer" className={buttonVariants({ size: 'sm', variant: 'outline' })}>
              <ExternalLink className="mr-2 h-4 w-4" /> Abrir sistema en Microsoft Edge
            </a>
            <p className="text-xs text-muted-foreground">Si no se abre, copie la dirección del sistema desde la barra del navegador y ábrala en Edge. Su sesión de Chrome no se transfiere.</p>
          </div>
        )}
        <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
          <Button variant="ghost" onClick={onCerrar}>Cerrar</Button>
          {estado !== 'listo' && <Button variant="outline" onClick={() => {
            setEstado('comprobando')
            setRevision((valor) => valor + 1)
          }}><RefreshCw className="mr-2 h-4 w-4" /> Comprobar de nuevo</Button>}
          <Button disabled={estado !== 'listo'} onClick={onContinuar}>Firmar aquí</Button>
        </div>
      </div>
    </Dialog>
  )
}
