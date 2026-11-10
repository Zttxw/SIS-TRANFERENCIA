import { AlertCircle, CheckCircle2 } from 'lucide-react'

interface IndicadorFaltantesProps {
  /** Etiquetas de lo que falta para completar el anexo (requisitos). */
  faltantes: string[]
  /** Texto cuando no falta nada. */
  textoCompleto?: string
  className?: string
}

/**
 * Indicador discreto de completitud de un anexo (F4 — «qué falta», plan §2.3/§4).
 * Muestra una línea «Faltan: X, Y» en tono de atención cuando hay requisitos
 * pendientes, o una confirmación cuando está listo. Filosofía «intuitivo, no
 * saturado»: una sola línea, sin muros de texto.
 */
export function IndicadorFaltantes({
  faltantes,
  textoCompleto = 'Listo para guardar.',
  className = '',
}: IndicadorFaltantesProps) {
  if (faltantes.length === 0) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-dato text-success-fg ${className}`}>
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        {textoCompleto}
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-dato font-medium text-warning-fg ${className}`}>
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      Faltan: {faltantes.join(', ')}
    </span>
  )
}
