import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, FileWarning, Loader2, PenLine, Plus, Settings2 } from 'lucide-react'
import { toast } from 'sonner'

import { usePermiso } from '@/auth/hooks'
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

function ControlFirma({ tipoDocumento, dependenciaId, compacto = false }: PropsFirma) {
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

  // Un solo botón sólido a la vez. Si aún no hay firma vigente y el usuario
  // puede firmar, la acción primaria es «Firmar»; si ya firmó vigente, pasa a
  // ser «Descargar». El resto se agrupa detrás del menú de acciones.
  const primarioEsFirmar = puedeFirmar && Boolean(estado) && (!estado?.firmado || estado.vigente === false)
  const puedeAgregar = puedeFirmar && Boolean(estado?.firmado) && estado?.vigente !== false
  // Ítems secundarios realmente disponibles (para no pintar un menú vacío).
  const hayMenu =
    puedeFirmar || // «Opciones de firma»
    puedeAgregar ||
    (Boolean(estado?.firmado) && !primarioEsFirmar) || // «Descargar» que no es primario
    Boolean(estado?.pendiente_validacion)

  // Acción primaria en modo compacto: icono-solo con tooltip.
  const primarioCompacto = primarioEsFirmar ? (
    <Tooltip content={mensaje ? 'Firmando…' : 'Firmar con Firma Perú'}>
      <Button size="icon" onClick={() => void firmar()} disabled={Boolean(mensaje)} aria-label="Firmar con Firma Perú"
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
      {/* Acción primaria: un único botón según el estado (texto o icono). */}
      {compacto ? primarioCompacto : primarioEsFirmar ? (
        <Button size="sm" onClick={() => void firmar()} disabled={Boolean(mensaje)} className="gap-2 border border-indigo-700 bg-indigo-700 text-white shadow-sm hover:bg-indigo-800 focus-visible:ring-indigo-500">
          {mensaje ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
          {mensaje ? 'Firmando…' : 'Firmar con Firma Perú'}
        </Button>
      ) : estado?.firmado ? (
        <Button size="sm" variant="outline" onClick={() => void descargar()} disabled={descargando} className="gap-2"
          title={estado.firmado_en ? `PDF conservado el ${new Date(estado.firmado_en).toLocaleString('es-PE')}` : undefined}>
          <Download className="h-4 w-4" /> {estado.vigente === false ? 'PDF firmado anterior' : 'Descargar PDF firmado'}
        </Button>
      ) : null}

      {/* Menú de acciones secundarias. Cada ítem se deshabilita según estado. */}
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
          {puedeAgregar && (
            <DropdownMenuItem icon={<Plus className="h-4 w-4" />} disabled={Boolean(mensaje)} onSelect={() => void firmar(estado?.documento_id ?? undefined)}>
              Agregar firma
            </DropdownMenuItem>
          )}
          {estado?.firmado && !primarioEsFirmar && (
            <DropdownMenuItem icon={<Download className="h-4 w-4" />} disabled={descargando} onSelect={() => void descargar()}>
              Descargar PDF firmado
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
        const previoId = equipo.previoId
        setEquipo(null)
        void firmar(previoId)
      }} />}
    </div>
  )
}
