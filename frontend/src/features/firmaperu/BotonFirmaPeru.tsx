import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, Loader2, PenLine, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { usePermiso } from '@/auth/hooks'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { firmaperuService } from './firmaperu.service'
import { firmarConCliente } from './firmaperu-runtime'
import { comprobarServicioFirma } from './equipo-firmaperu'
import { PrepararEquipoFirma } from './PrepararEquipoFirma'
import { PrevisualizarAnexo } from './PrevisualizarAnexo'
import type { TipoDocumentoFirma } from './firmaperu.types'

interface PropsFirma { tipoDocumento: TipoDocumentoFirma; dependenciaId: number | null }

export function BotonFirmaPeru(props: PropsFirma) {
  return <ControlFirma key={`${props.tipoDocumento}-${props.dependenciaId}`} {...props} />
}

function ControlFirma({ tipoDocumento, dependenciaId }: PropsFirma) {
  const puedeRegistrar = usePermiso('anexos.registrar')
  const puedeActa = usePermiso('actas.generar')
  const puedeFirma = usePermiso('firmas.firmar')
  const puedeFirmar = (puedeRegistrar || puedeActa || puedeFirma)
    && (tipoDocumento !== 'anexo07' || puedeActa || puedeFirma)
    && (tipoDocumento !== 'anexo01' || puedeRegistrar || puedeActa)
  const confirmar = useConfirm()
  const cliente = useQueryClient()
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [descargando, setDescargando] = useState(false)
  const [equipo, setEquipo] = useState<{ previoId?: string } | null>(null)
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

  const firmar = async (previoId?: string) => {
    if (operacion.current) return
    const scope = new AbortController()
    operacion.current = scope
    try {
      setMensaje('Comprobando Firma Perú en este equipo…')
      if (!await comprobarServicioFirma(scope.signal)) {
        if (!scope.signal.aborted) setEquipo({ previoId })
        return
      }
      setMensaje(null)
      const aceptar = await confirmar({
        title: previoId ? 'Agregar firma al PDF conservado' : 'Firmar el PDF guardado',
        description: previoId
          ? 'Se abrirá el PDF firmado conservado para agregar su firma. Sus firmas anteriores se mantienen.'
          : 'Se generará una copia de los datos guardados. Guarde primero cualquier cambio pendiente. Use el certificado correspondiente a su DNI de acceso.',
        confirmText: 'Abrir Firma Perú',
      })
      if (!aceptar || scope.signal.aborted) return
      const resultado = await firmarConCliente({
        preparar: () => firmaperuService.preparar(tipoDocumento, dependenciaId, scope.signal, previoId),
        consultar: firmaperuService.sesion,
        signal: scope.signal,
        onMensaje: (texto) => { if (!scope.signal.aborted) setMensaje(texto) },
      })
      if (!scope.signal.aborted) {
        await cliente.invalidateQueries({ queryKey: clave })
        await cliente.invalidateQueries({ queryKey: ['acta'] })
        await cliente.invalidateQueries({ queryKey: ['transferencia', 'estado'] })
        if (resultado.estado === 'pendiente_validacion') {
          toast.info('PDF recibido. Su verificación institucional está pendiente.')
        } else if (resultado.vigente === false) {
          toast.info('PDF verificado conservado como histórico. Los datos cambiaron; firme la versión actual antes de remitir.')
        } else {
          toast.success('PDF firmado recibido. Puede descargarlo.')
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

  return (
    <div className="flex flex-wrap items-center gap-2">
      <PrevisualizarAnexo tipoDocumento={tipoDocumento} dependenciaId={dependenciaId} />
      {puedeFirmar && (
        <>
          <Button size="sm" onClick={() => void firmar()} disabled={Boolean(mensaje)} className="gap-2 border border-indigo-700 bg-indigo-700 text-white shadow-sm hover:bg-indigo-800 focus-visible:ring-indigo-500">
            {mensaje ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
            {mensaje ? 'Firmando…' : 'Firmar con Firma Perú'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEquipo({})} disabled={Boolean(mensaje)}>Opciones de firma</Button>
        </>
      )}
      {estado?.firmado && (
        <>
          <Button size="sm" variant="outline" onClick={() => void descargar()} disabled={descargando} className="gap-2"
            title={estado.firmado_en ? `PDF conservado el ${new Date(estado.firmado_en).toLocaleString('es-PE')}` : undefined}>
            <Download className="h-4 w-4" /> {estado.vigente === false ? 'PDF firmado anterior' : 'PDF firmado'}
          </Button>
          {puedeFirmar && estado.vigente !== false && <Button size="sm" variant="ghost" disabled={Boolean(mensaje)} onClick={() => void firmar(estado.documento_id!)} className="gap-1"><Plus className="h-4 w-4" /> Agregar firma</Button>}
        </>
      )}
      {mensaje && <span role="status" className="text-xs text-muted-foreground">{mensaje}</span>}
      {estado?.pendiente_validacion && (
        <Button size="sm" variant="outline" onClick={() => void descargar(true)} disabled={descargando}
          title="El archivo fue recibido. La firma aún no ha sido verificada por el servidor." className="gap-2">
          <Download className="h-4 w-4" /> PDF recibido · sin verificar
        </Button>
      )}
      {equipo && <PrepararEquipoFirma onCerrar={() => setEquipo(null)} onContinuar={() => {
        const previoId = equipo.previoId
        setEquipo(null)
        void firmar(previoId)
      }} />}
    </div>
  )
}
