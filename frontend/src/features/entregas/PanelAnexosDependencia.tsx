import { useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { notificarError } from '@/lib/api-errors'
import { firmaperuService } from '@/features/firmaperu/firmaperu.service'
import type { EstadoFirma, TipoDocumentoFirma } from '@/features/firmaperu/firmaperu.types'
import type { EntregaItem } from '@/types/transferencia'
import { HojaAnexo } from './HojaAnexo'

interface Props {
  entrega: EntregaItem
  dependenciaId: number
  anexos: TipoDocumentoFirma[]
  nivel: number
}

/**
 * Zona desplegada de una dependencia en la bandeja: muestra los datos
 * adicionales de la entrega (destino, fechas, emisor/receptor, comentario), un
 * botón «Descargar todo» y las hojas de cada anexo. Las consultas de estado por
 * anexo se comparten (misma queryKey) con las hojas, así «Descargar todo» no
 * duplica red.
 */
export function PanelAnexosDependencia({ entrega, dependenciaId, anexos, nivel }: Props) {
  const consultas = useQueries({
    queries: anexos.map((tipo) => ({
      queryKey: ['firmaperu', tipo, dependenciaId],
      queryFn: ({ signal }: { signal: AbortSignal }) => firmaperuService.estado(tipo, dependenciaId, signal),
      retry: false,
      staleTime: 15000,
    })),
  })

  // Anexos con PDF disponible (firmado vigente o generado vigente).
  const disponibles = anexos
    .map((tipo, i) => ({ tipo, estado: consultas[i].data as EstadoFirma | undefined }))
    .filter((a): a is { tipo: TipoDocumentoFirma; estado: EstadoFirma } =>
      Boolean(a.estado && (a.estado.pdf_generado_vigente || (a.estado.firmado && a.estado.vigente !== false))))

  const cargandoEstados = consultas.some((c) => c.isLoading)
  const [descargandoTodo, setDescargandoTodo] = useState(false)

  const descargarTodo = async () => {
    setDescargandoTodo(true)
    try {
      // Descarga secuencial para no saturar el navegador ni el throttle del backend.
      for (const { tipo, estado } of disponibles) {
        await firmaperuService.descargarDisponible(tipo, dependenciaId, estado)
      }
      toast.success(`${disponibles.length} anexo(s) descargado(s). Revise su carpeta de descargas.`)
    } catch (error) {
      notificarError(error, { porDefecto: 'No se pudieron descargar todos los anexos.' })
    } finally {
      setDescargandoTodo(false)
    }
  }

  const sangria = { paddingLeft: `${(nivel + 1) * 20 + 8}px` } as const

  return (
    <div className="mt-0.5 space-y-1 border-l border-dashed border-muted-foreground/20 ml-4 pb-1">
      {/* Datos adicionales de la entrega + Descargar todo */}
      <div className="flex flex-wrap items-start justify-between gap-2 py-1.5 pr-2" style={sangria}>
        <dl className="grid gap-x-6 gap-y-0.5 text-nota text-muted-foreground sm:grid-cols-2">
          <DatoEntrega etiqueta="Destino jerárquico" valor={entrega.dependencia_destino
            ? `${entrega.dependencia_destino.codigo} · ${entrega.dependencia_destino.nombre}`
            : 'ETTS Institucional'} />
          {entrega.emisor?.name && <DatoEntrega etiqueta="Remitida por" valor={entrega.emisor.name} />}
          {entrega.remitida_en && <DatoEntrega etiqueta="Remitida" valor={fecha(entrega.remitida_en)} />}
          {entrega.revisada_en && <DatoEntrega etiqueta="Revisada" valor={fecha(entrega.revisada_en)} />}
          {entrega.consolidada_en && <DatoEntrega etiqueta="Consolidada" valor={fecha(entrega.consolidada_en)} />}
          {entrega.receptor?.name && <DatoEntrega etiqueta="Revisada por" valor={entrega.receptor.name} />}
          {entrega.comentario && <DatoEntrega etiqueta="Comentario" valor={`"${entrega.comentario}"`} ancho />}
        </dl>

        <Button
          size="sm"
          variant="outline"
          className="h-7 shrink-0 gap-1.5 text-nota"
          disabled={cargandoEstados || descargandoTodo || disponibles.length === 0}
          onClick={() => void descargarTodo()}
          title={disponibles.length === 0 ? 'No hay anexos con PDF disponible' : undefined}
        >
          {descargandoTodo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Descargar todo
        </Button>
      </div>

      {/* Hojas de anexo */}
      {anexos.map((tipo) => (
        <HojaAnexo key={tipo} tipoDocumento={tipo} dependenciaId={dependenciaId} nivel={nivel + 1} />
      ))}
    </div>
  )
}

function DatoEntrega({ etiqueta, valor, ancho = false }: { etiqueta: string; valor: string; ancho?: boolean }) {
  return (
    <div className={ancho ? 'sm:col-span-2' : undefined}>
      <dt className="inline font-medium text-foreground/70">{etiqueta}: </dt>
      <dd className="inline">{valor}</dd>
    </div>
  )
}

function fecha(iso: string): string {
  return format(new Date(iso), "dd/MM/yyyy HH:mm", { locale: es })
}
