import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Circle, Eye, FileSignature, FolderTree, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { comprobarServicioFirma } from '@/features/firmaperu/equipo-firmaperu'
import { firmarConCliente } from '@/features/firmaperu/firmaperu-runtime'
import { firmaperuService } from '@/features/firmaperu/firmaperu.service'
import { PrepararEquipoFirma } from '@/features/firmaperu/PrepararEquipoFirma'
import { anexo01Service, type FirmaLadoAnexo01 } from './anexo01.service'

const CLAVE = ['anexo01-institucional']

function Lado({ titulo, firma }: { titulo: string; firma: FirmaLadoAnexo01 | null }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border p-3 text-xs">
      {firma ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
      ) : (
        <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      )}
      <div>
        <p className="font-semibold">{titulo}</p>
        <p className="text-muted-foreground">
          {firma
            ? `${firma.firmante} · ${firma.firmado_en ? new Date(firma.firmado_en).toLocaleString('es-PE') : ''}`
            : 'Pendiente de firma digital'}
        </p>
      </div>
    </div>
  )
}

/**
 * Firma institucional del Anexo 01 (relación de CC) al cierre del proceso: el
 * ETTS la genera y ambos firman digitalmente en orden libre, en un único PDF.
 */
export function FirmaAnexo01Panel() {
  const cliente = useQueryClient()
  const confirmar = useConfirm()
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [prepararEquipo, setPrepararEquipo] = useState(false)
  const operacion = useRef<AbortController | null>(null)
  const { data: estado, isLoading } = useQuery({ queryKey: CLAVE, queryFn: anexo01Service.estado, staleTime: 15000 })

  const generar = useMutation({
    mutationFn: anexo01Service.generar,
    onSuccess: () => {
      toast.success('Anexo 01 generado. Revíselo antes de firmar.')
      void cliente.invalidateQueries({ queryKey: CLAVE })
    },
    onError: (error: Error) => toast.error(error.message || 'No se pudo generar el Anexo 01.'),
  })

  if (isLoading || !estado) return null

  const miLado = estado.mi_lado?.lado ?? null
  const puedeFirmar = Boolean(estado.firma_habilitada && estado.pdf_generado_vigente && miLado && !estado[miLado])

  const firmar = async () => {
    if (operacion.current) return
    const scope = new AbortController()
    operacion.current = scope
    try {
      setMensaje('Comprobando Firma Perú en este equipo…')
      if (!(await comprobarServicioFirma(scope.signal))) {
        setPrepararEquipo(true)
        return
      }
      setMensaje(null)
      const aceptar = await confirmar({
        title: 'Firmar el Anexo 01',
        description: estado.entidad || estado.ette
          ? 'Se abrirá el PDF que ya tiene la firma del otro lado para agregar la suya.'
          : 'Se firmará el Anexo 01 generado con el catálogo vigente de centros de costo.',
        confirmText: 'Abrir Firma Perú',
      })
      if (!aceptar) return
      const resultado = await firmarConCliente({
        preparar: () => anexo01Service.preparar(scope.signal),
        consultar: firmaperuService.sesion,
        signal: scope.signal,
        onMensaje: setMensaje,
      })
      await cliente.invalidateQueries({ queryKey: CLAVE })
      if (resultado.estado === 'pendiente_validacion') toast.info('PDF recibido. Su verificación está pendiente.')
      else toast.success('Firma del Anexo 01 registrada.')
    } catch (error) {
      if (!scope.signal.aborted) toast.error(error instanceof Error ? error.message : 'No se pudo completar la firma.')
    } finally {
      operacion.current = null
      setMensaje(null)
    }
  }

  const verPdf = () =>
    anexo01Service.abrirPdf().catch((error: Error) => toast.error(error.message || 'No se pudo abrir el PDF.'))

  return (
    <Card className="border shadow-xs">
      <CardHeader className="bg-muted/15 pb-4">
        <div className="flex items-start gap-2">
          <FolderTree className="mt-0.5 h-4 w-4 text-primary" />
          <div>
            <CardTitle className="text-base">Anexo 01 · Relación de centros de costo</CardTitle>
            <CardDescription className="mt-0.5 text-xs">
              Se firma al cierre, cuando el ETTE recibió todas las entregas: el ETTS y un titular ETTE, con Firma Perú.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-5">
        {!estado.firma_habilitada ? (
          <p className="text-xs text-muted-foreground">
            Aún hay entregas sin recibir por el ETTE. El Anexo 01 se habilita al completar la cadena.
          </p>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              <Lado titulo="ETTS (entidad)" firma={estado.entidad} />
              <Lado titulo="Titular ETTE" firma={estado.ette} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {miLado === 'entidad' && !estado.entidad && !estado.ette && (
                <Button variant="outline" className="gap-1.5 text-xs" disabled={generar.isPending} onClick={() => generar.mutate()}>
                  <FolderTree className="h-3.5 w-3.5" />
                  {estado.pdf_generado_vigente ? 'Volver a generar' : 'Generar Anexo 01'}
                </Button>
              )}
              {estado.pdf_generado_vigente && (
                <Button variant="outline" className="gap-1.5 text-xs" onClick={() => void verPdf()}>
                  <Eye className="h-3.5 w-3.5" />
                  {estado.completo ? 'Ver PDF firmado' : 'Ver PDF'}
                </Button>
              )}
              {puedeFirmar && (
                <Button className="gap-1.5 text-xs" disabled={Boolean(mensaje)} onClick={() => void firmar()}>
                  {mensaje ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSignature className="h-3.5 w-3.5" />}
                  Firmar con Firma Perú
                </Button>
              )}
              {mensaje && <span role="status" className="text-xs text-muted-foreground">{mensaje}</span>}
              {estado.completo && <span className="text-xs font-semibold text-success-fg">Anexo 01 suscrito por ambos lados.</span>}
            </div>
          </>
        )}
      </CardContent>
      {prepararEquipo && (
        <PrepararEquipoFirma
          onCerrar={() => setPrepararEquipo(false)}
          onContinuar={() => {
            setPrepararEquipo(false)
            void firmar()
          }}
        />
      )}
    </Card>
  )
}
