import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, FileWarning, Loader2, PenLine, Settings2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { firmaperuService } from './firmaperu.service'
import { firmarConCliente } from './firmaperu-runtime'
import { comprobarServicioFirma } from './equipo-firmaperu'
import { PrepararEquipoFirma } from './PrepararEquipoFirma'
import type { LadoFirma, TipoDocumentoFirma } from './firmaperu.types'

interface PropsFirma {
  tipoDocumento: TipoDocumentoFirma
  dependenciaId: number | null
  /** Lado que se firma: el responsable (entidad) o el coordinador ETTE presente. */
  lado: LadoFirma
}

export function BotonFirmaPeru(props: PropsFirma) {
  return <ControlFirma key={`${props.tipoDocumento}-${props.dependenciaId}-${props.lado}`} {...props} />
}

/**
 * Firma digital con Firma Perú de un lado del documento (D-05), operada desde
 * la sesión del responsable del CC: por la entidad firma él; por el ETTE, el
 * coordinador presente (o el titular designado en suplencia) con su propio
 * certificado, porque la sesión se emite a su DNI. Firmar es aprobar. Si ya
 * hay una firma vigente, la nueva se agrega sobre ese PDF (D-06).
 */
function ControlFirma({ tipoDocumento, dependenciaId, lado }: PropsFirma) {
  const confirmar = useConfirm()
  const cliente = useQueryClient()
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [descargando, setDescargando] = useState(false)
  const [equipo, setEquipo] = useState(false)
  const operacion = useRef<AbortController | null>(null)
  const clave = ['firmaperu', tipoDocumento, dependenciaId]
  const { data: estado } = useQuery({
    queryKey: clave,
    queryFn: ({ signal }) => firmaperuService.estado(tipoDocumento, dependenciaId!, signal),
    enabled: Boolean(dependenciaId),
    retry: false,
    staleTime: 15000,
  })
  useEffect(() => {
    return () => { operacion.current?.abort(); operacion.current = null }
  }, [])

  if (!dependenciaId) return null

  const esEtte = lado === 'ette'
  const firmanteEtte = estado?.firmante_ette ?? null
  // Lo opera el responsable del CC, con la entrega cerrada para firma y ese lado aún sin firmar.
  const puedeFirmar = Boolean(estado?.firma_habilitada && estado.opera_firmas && !estado[lado] && (!esEtte || firmanteEtte))
  const etiqueta = esEtte ? 'Firma del coordinador ETTE' : 'Firmar como responsable'

  const firmar = async () => {
    if (operacion.current) return
    const scope = new AbortController()
    operacion.current = scope
    try {
      setMensaje('Comprobando Firma Perú en este equipo…')
      if (!await comprobarServicioFirma(scope.signal)) {
        if (!scope.signal.aborted) setEquipo(true)
        return
      }
      setMensaje(null)
      const sobreFirmado = Boolean(estado?.vigente)
      const aceptar = await confirmar({
        title: esEtte ? 'Firma presencial del lado ETTE' : sobreFirmado ? 'Agregar su firma al PDF firmado' : 'Firmar el PDF guardado',
        description: esEtte
          ? `Firma ${firmanteEtte?.nombre ?? 'el coordinador ETTE'} (DNI ${firmanteEtte?.dni ?? '—'}) con su propio certificado en este equipo; Firma Perú no admitirá otro. Su firma es la aprobación del documento.`
          : sobreFirmado
            ? 'Se abrirá el PDF que ya tiene la firma del coordinador para agregar la suya. Ambas firmas quedan en el mismo documento.'
            : 'Se firmará el PDF generado y guardado que acaba de revisar. Use el certificado correspondiente a su DNI de acceso.',
        confirmText: 'Abrir Firma Perú',
      })
      if (!aceptar || scope.signal.aborted) return
      const resultado = await firmarConCliente({
        preparar: () => firmaperuService.preparar(tipoDocumento, dependenciaId, lado, scope.signal),
        consultar: firmaperuService.sesion,
        signal: scope.signal,
        onMensaje: (texto) => { if (!scope.signal.aborted) setMensaje(texto) },
      })
      if (!scope.signal.aborted) {
        await cliente.invalidateQueries({ queryKey: clave })
        await cliente.invalidateQueries({ queryKey: ['requisitos-remision', dependenciaId] })
        await cliente.invalidateQueries({ queryKey: ['acta'] })
        await cliente.invalidateQueries({ queryKey: ['transferencia-estado', dependenciaId] })
        if (resultado.estado === 'pendiente_validacion') {
          toast.info('PDF recibido. Su verificación institucional está pendiente.')
        } else if (resultado.vigente === false) {
          toast.info('PDF verificado conservado como histórico. Los datos cambiaron; firme la versión actual antes de remitir.')
        } else {
          toast.success(esEtte ? 'Firma del coordinador ETTE registrada.' : 'PDF firmado recibido. Puede descargarlo.')
        }
      }
    } catch (error) {
      if (!scope.signal.aborted) toast.error(error instanceof Error ? error.message : 'No se pudo completar la firma.')
    } finally {
      if (operacion.current === scope) {
        operacion.current = null
        setMensaje(null)
      }
    }
  }

  const descargar = async (pendiente = false) => {
    const id = pendiente ? estado?.sesion_pendiente_id : estado?.documento_id
    if (!id) return
    setDescargando(true)
    try {
      if (pendiente) await firmaperuService.descargarRecibido(id)
      else await firmaperuService.descargar(id)
    }
    catch (error) { toast.error(error instanceof Error ? error.message : 'No se pudo descargar el PDF.') }
    finally { setDescargando(false) }
  }

  // Un solo botón sólido a la vez: «Firmar» si su lado falta; si no, «Descargar» (solo en el lado entidad).
  const requiereGenerar = estado?.pdf_generado_vigente !== true
  const hayMenu = puedeFirmar || (!esEtte && Boolean(estado?.pendiente_validacion))

  return (
    <div className="flex flex-wrap items-center gap-2">
      {puedeFirmar ? (
        <Button size="sm" variant={esEtte ? 'outline' : 'default'} onClick={() => void firmar()} disabled={Boolean(mensaje) || requiereGenerar}
          title={requiereGenerar ? 'Primero genere y revise el PDF actualizado' : undefined}
          className={esEtte ? 'gap-2' : 'gap-2 bg-primary text-primary-foreground hover:bg-primary-hover'}>
          {mensaje ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
          {mensaje ? 'Firmando…' : etiqueta}
        </Button>
      ) : !esEtte && estado?.firmado ? (
        <Button size="sm" variant="outline" onClick={() => void descargar()} disabled={descargando} className="gap-2"
          title={estado.firmado_en ? `PDF conservado el ${new Date(estado.firmado_en).toLocaleString('es-PE')}` : undefined}>
          <Download className="h-4 w-4" /> {estado.vigente === false ? 'PDF firmado anterior' : 'Descargar PDF firmado'}
        </Button>
      ) : null}

      {hayMenu && (
        <DropdownMenu
          align="end"
          trigger={
            <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Más acciones de firma" title="Más acciones de firma">
              <PenLine className="h-4 w-4" />
            </Button>
          }
        >
          {puedeFirmar && (
            <DropdownMenuItem icon={<Settings2 className="h-4 w-4" />} disabled={Boolean(mensaje)} onSelect={() => setEquipo(true)}>
              Opciones de firma
            </DropdownMenuItem>
          )}
          {!esEtte && estado?.pendiente_validacion && (
            <DropdownMenuItem icon={<FileWarning className="h-4 w-4" />} disabled={descargando} onSelect={() => void descargar(true)}>
              Descargar PDF recibido · sin verificar
            </DropdownMenuItem>
          )}
        </DropdownMenu>
      )}

      {mensaje && <span role="status" className="text-xs text-muted-foreground">{mensaje}</span>}

      {equipo && <PrepararEquipoFirma onCerrar={() => setEquipo(false)} onContinuar={() => {
        setEquipo(false)
        void firmar()
      }} />}
    </div>
  )
}
