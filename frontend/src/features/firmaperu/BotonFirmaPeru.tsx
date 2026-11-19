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
import { Tooltip } from '@/components/ui/tooltip'
import { firmaperuService } from './firmaperu.service'
import { firmarConCliente } from './firmaperu-runtime'
import { comprobarServicioFirma } from './equipo-firmaperu'
import { MotivoSuplenciaDialog } from './MotivoSuplenciaDialog'
import { PrepararEquipoFirma } from './PrepararEquipoFirma'
import type { TipoDocumentoFirma } from './firmaperu.types'

interface PropsFirma {
  tipoDocumento: TipoDocumentoFirma
  dependenciaId: number | null
  /** Icono-solo (acción primaria + menú), para filas densas del Dashboard. */
  compacto?: boolean
}

export function BotonFirmaPeru(props: PropsFirma) {
  return <ControlFirma key={`${props.tipoDocumento}-${props.dependenciaId}`} {...props} />
}

/**
 * Firma digital con Firma Perú del lado que corresponde al usuario (D-05):
 * el responsable del CC o el coordinador ETTE (o el titular suplente, que
 * indica el motivo). Si ya hay una firma vigente, el backend agrega la nueva
 * sobre ese PDF, de modo que ambas quedan en un único documento (D-06).
 */
function ControlFirma({ tipoDocumento, dependenciaId, compacto = false }: PropsFirma) {
  const confirmar = useConfirm()
  const cliente = useQueryClient()
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [descargando, setDescargando] = useState(false)
  const [equipo, setEquipo] = useState<{ motivo?: string } | null>(null)
  const [pedirMotivo, setPedirMotivo] = useState(false)
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

  const miLado = estado?.mi_lado ?? null
  const esSuplente = miLado?.en_calidad_de === 'titular_suplente'
  // Firma quien tiene un lado en el CC, con la entrega aceptada y su lado aún sin firmar.
  const puedeFirmar = Boolean(estado?.firma_habilitada && miLado && !estado[miLado.lado])

  const iniciar = () => {
    if (esSuplente) setPedirMotivo(true)
    else void firmar()
  }

  const firmar = async (motivo?: string) => {
    if (operacion.current) return
    const scope = new AbortController()
    operacion.current = scope
    try {
      setMensaje('Comprobando Firma Perú en este equipo…')
      if (!await comprobarServicioFirma(scope.signal)) {
        if (!scope.signal.aborted) setEquipo({ motivo })
        return
      }
      setMensaje(null)
      const sobreFirmado = Boolean(estado?.vigente)
      const aceptar = await confirmar({
        title: sobreFirmado ? 'Agregar su firma al PDF firmado' : 'Firmar el PDF guardado',
        description: sobreFirmado
          ? 'Se abrirá el PDF que ya tiene la firma del otro lado para agregar la suya. Ambas firmas quedan en el mismo documento.'
          : 'Se firmará el PDF generado y guardado que acaba de revisar. Use el certificado correspondiente a su DNI de acceso.',
        confirmText: 'Abrir Firma Perú',
      })
      if (!aceptar || scope.signal.aborted) return
      const resultado = await firmarConCliente({
        preparar: () => firmaperuService.preparar(tipoDocumento, dependenciaId, scope.signal, motivo),
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

  // Un solo botón sólido a la vez: «Firmar» si su lado falta; si no, «Descargar».
  const requiereGenerar = estado?.pdf_generado_vigente !== true
  const hayMenu = puedeFirmar || Boolean(estado?.pendiente_validacion)

  const primarioCompacto = puedeFirmar ? (
    <Tooltip content={mensaje ? 'Firmando…' : 'Firmar con Firma Perú'}>
      <Button size="icon" onClick={iniciar} disabled={Boolean(mensaje) || requiereGenerar} aria-label="Firmar con Firma Perú"
        className="h-8 w-8 border border-indigo-700 bg-indigo-700 text-white shadow-sm hover:bg-indigo-800 focus-visible:ring-indigo-500">
        {mensaje ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
      </Button>
    </Tooltip>
  ) : estado?.firmado ? (
    <Tooltip content={estado.vigente === false ? 'Descargar PDF firmado anterior' : 'Descargar PDF firmado'}>
      <Button size="icon" variant="outline" onClick={() => void descargar()} disabled={descargando} aria-label="Descargar PDF firmado"
        className="h-8 w-8">
        <Download className="h-4 w-4" />
      </Button>
    </Tooltip>
  ) : null

  return (
    <div className={compacto ? 'flex items-center gap-1' : 'flex flex-wrap items-center gap-2'}>
      {compacto ? primarioCompacto : puedeFirmar ? (
        <Button size="sm" onClick={iniciar} disabled={Boolean(mensaje) || requiereGenerar} title={requiereGenerar ? 'Primero genere y revise el PDF actualizado' : undefined} className="gap-2 bg-primary text-primary-foreground hover:bg-primary-hover">
          {mensaje ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
          {mensaje ? 'Firmando…' : 'Firmar con Firma Perú'}
        </Button>
      ) : estado?.firmado ? (
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
            <DropdownMenuItem icon={<Settings2 className="h-4 w-4" />} disabled={Boolean(mensaje)} onSelect={() => setEquipo({})}>
              Opciones de firma
            </DropdownMenuItem>
          )}
          {estado?.pendiente_validacion && (
            <DropdownMenuItem icon={<FileWarning className="h-4 w-4" />} disabled={descargando} onSelect={() => void descargar(true)}>
              Descargar PDF recibido · sin verificar
            </DropdownMenuItem>
          )}
        </DropdownMenu>
      )}

      {mensaje && !compacto && <span role="status" className="text-xs text-muted-foreground">{mensaje}</span>}

      {equipo && <PrepararEquipoFirma onCerrar={() => setEquipo(null)} onContinuar={() => {
        const motivo = equipo.motivo
        setEquipo(null)
        if (esSuplente && !motivo) setPedirMotivo(true)
        else void firmar(motivo)
      }} />}
      <MotivoSuplenciaDialog
        open={pedirMotivo}
        onClose={() => setPedirMotivo(false)}
        onConfirmar={(motivo) => {
          setPedirMotivo(false)
          void firmar(motivo)
        }}
      />
    </div>
  )
}
