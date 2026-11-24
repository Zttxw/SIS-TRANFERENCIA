import { useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowRight, Compass, X } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { estaEnFirma, type EstadoEntrega } from '@/types/transferencia'
import { firmaperuService } from '@/features/firmaperu/firmaperu.service'
import type { TipoDocumentoFirma } from '@/features/firmaperu/firmaperu.types'
import { useAuth } from '@/auth/hooks'
import { puedeConsultarActa } from '@/auth/sesion-runtime'
import { useRequisitosRemision } from '@/features/firmaperu/use-requisitos-remision'

/** Un anexo pendiente candidato a sugerencia (subconjunto de lo que ya calcula el dashboard). */
export interface AnexoPendiente {
  nombre: string
  ruta: string
  completado: boolean
}

interface QueSigueCardProps {
  estadoEntrega: EstadoEntrega
  /** El usuario puede editar/llenar (borrador). */
  esEditable: boolean
  anexos: AnexoPendiente[]
  /** Ruta del acta (Anexo 07), que se firma con la entrega cerrada para revisión. */
  rutaActa?: string
  className?: string
  dependenciaId: number
}

interface Sugerencia {
  titulo: string
  descripcion: string
  ruta: string
  cta: string
}

/**
 * «¿Qué sigue?» contextual del dashboard (F4, plan §2.3 / §4). Deriva **una sola**
 * sugerencia prioritaria del estado real de la entrega y los anexos; es
 * descartable y no intrusiva (nada de tours). Filosofía «intuitivo, no saturado»:
 * una brújula, no un instructivo.
 */
export function QueSigueCard({
  estadoEntrega,
  esEditable,
  anexos,
  rutaActa = '/acta',
  className,
  dependenciaId,
}: QueSigueCardProps) {
  const { tiene, permisos } = useAuth()
  const { data: requisitos } = useRequisitosRemision(dependenciaId, tiene('entregas.remitir'))
  const puedeFirmar = tiene('anexos.registrar') || tiene('actas.generar')
  const [oculto, setOculto] = useState(false)
  const tipos: TipoDocumentoFirma[] = ['anexo02', 'anexo03', 'anexo04', 'anexo05', 'anexo06']
  if (puedeConsultarActa(permisos)) tipos.push('anexo07')
  const firmas = useQueries({
    queries: tipos.map((tipo) => ({
      queryKey: ['firmaperu', tipo, dependenciaId],
      queryFn: ({ signal }: { signal: AbortSignal }) => firmaperuService.estado(tipo, dependenciaId, signal),
      staleTime: 15000,
      retry: false,
    })),
  })
  const informacionCompleta = anexos.every((anexo) => anexo.completado)
  const hayFirmaPendiente = puedeFirmar && (
    (informacionCompleta && tiene('entregas.remitir') && !requisitos?.puede_remitir)
    || firmas.some(({ data }) => data && (informacionCompleta || data.borrador_generado) && (!data.firmado || data.vigente === false))
  )

  const sugerencia = resolverSugerencia(estadoEntrega, esEditable, anexos, rutaActa, hayFirmaPendiente, tiene('actas.generar'), tiene('entregas.remitir'))
  if (!sugerencia || oculto) return null

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border border-info-border bg-info-soft p-4',
        className,
      )}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-info-soft text-info">
        <Compass className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-info-fg">¿Qué sigue? · {sugerencia.titulo}</p>
        <p className="mt-0.5 text-sm text-info-fg/90">{sugerencia.descripcion}</p>
        <Link
          to={sugerencia.ruta}
          onClick={() => {
            if (sugerencia.ruta === '/#anexos-entrega') {
              document.getElementById('anexos-entrega')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
          }}
          className={buttonVariants({
            size: 'sm',
            className: 'mt-2.5 gap-1.5',
          })}
        >
          {sugerencia.cta}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <button
        type="button"
        aria-label="Descartar sugerencia"
        onClick={() => setOculto(true)}
        className="shrink-0 rounded p-1 text-info-fg/70 transition-colors hover:bg-info-soft hover:text-info-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

function resolverSugerencia(
  estado: EstadoEntrega,
  esEditable: boolean,
  anexos: AnexoPendiente[],
  rutaActa: string,
  hayFirmaPendiente: boolean,
  puedeEmitirActa: boolean,
  puedeRemitir: boolean,
): Sugerencia | null {
  // Ya remitida: el responsable no tiene acción pendiente.
  if (estado === 'remitida') {
    return null
  }

  // Cerrada para firma: con el coordinador presente, firmar los anexos 02–07 y remitir.
  if (estaEnFirma(estado)) {
    if (hayFirmaPendiente) {
      return {
        titulo: 'Firme los documentos de la entrega',
        descripcion: puedeEmitirActa
          ? 'Con el coordinador ETTE presente, complete el Acta (Anexo 07) y firmen ambos los anexos en «PDF y firma».'
          : 'Con el coordinador ETTE presente, generen y firmen ambos los anexos en «PDF y firma».',
        ruta: puedeEmitirActa ? rutaActa : '/pdf-firma',
        cta: puedeEmitirActa ? 'Ir al Acta' : 'Ir a PDF y firma',
      }
    }
    if (!puedeRemitir) return null
    return {
      titulo: 'Remita su entrega',
      descripcion: 'Los anexos están firmados. Remita la entrega al centro de costo padre o al ETTS.',
      ruta: '/entregas',
      cta: 'Ir a remitir',
    }
  }

  // Borrador editable: señalar el primer anexo incompleto; si todo está, presentar.
  if (esEditable) {
    const pendiente = anexos.find((a) => !a.completado)
    if (pendiente) {
      return {
        titulo: `Complete ${pendiente.nombre}`,
        descripcion: 'Es el siguiente anexo con información pendiente. Termínelo antes de presentar la entrega al coordinador ETTE.',
        ruta: pendiente.ruta,
        cta: `Ir a ${pendiente.nombre}`,
      }
    }
    if (!puedeRemitir) return null
    return {
      titulo: 'Presente su entrega al coordinador ETTE',
      descripcion:
        'Todos los anexos tienen información registrada. Al presentarla, los anexos se bloquean y el coordinador la revisa y acepta.',
      ruta: '/entregas',
      cta: 'Ir a presentar',
    }
  }

  return null
}
