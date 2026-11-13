import { cn } from '@/lib/utils'
import type { EstadoAnexo } from './catalogo-anexos'

/** Color del "sello" / cinta de la hoja según el estado del anexo. */
const SELLO: Record<EstadoAnexo, { cinta: string; borde: string }> = {
  listo: { cinta: '#2ca792', borde: '#1f8a78' },
  parcial: { cinta: '#2563eb', borde: '#1e40af' },
  pendiente: { cinta: '#f0c84f', borde: '#bb8019' },
  informativo: { cinta: '#b4c0cf', borde: '#6b7a8d' },
}

interface HojaAnexoSvgProps {
  estado: EstadoAnexo
  /** Número romano o texto corto de la esquina (ej. "02"). */
  folio?: string
  className?: string
}

/**
 * Hoja de papel dibujada en SVG que representa un anexo: esquina doblada,
 * renglones de texto simulados y una cinta/sello de color según su estado.
 * Se usa como "archivo" dentro de la carpeta abierta de cada dependencia.
 */
export function HojaAnexoSvg({ estado, folio, className }: HojaAnexoSvgProps) {
  const s = SELLO[estado]

  return (
    <svg
      viewBox="0 0 72 92"
      className={cn('h-full w-full', className)}
      role="presentation"
      aria-hidden="true"
    >
      {/* Sombra de hoja de atrás (da sensación de pila) */}
      <rect x="10" y="9" width="56" height="78" rx="4" fill="#000000" opacity="0.06" />

      {/* Hoja principal con esquina doblada */}
      <path
        d="M8 8 Q8 5 11 5 L50 5 L64 19 L64 84 Q64 87 61 87 L11 87 Q8 87 8 84 Z"
        fill="#ffffff"
        stroke="#d9dee6"
        strokeWidth="1.2"
      />
      {/* Doblez de esquina */}
      <path d="M50 5 L50 19 L64 19 Z" fill="#eef1f5" stroke="#d9dee6" strokeWidth="1" />

      {/* Cinta de color del estado (franja lateral izquierda) */}
      <rect x="8" y="30" width="5" height="40" rx="2.5" fill={s.cinta} />

      {/* Renglones simulados */}
      <rect x="19" y="30" width="34" height="3" rx="1.5" fill={s.borde} opacity="0.5" />
      <rect x="19" y="40" width="38" height="2.6" rx="1.3" fill="#cbd5e1" />
      <rect x="19" y="47" width="30" height="2.6" rx="1.3" fill="#cbd5e1" />
      <rect x="19" y="54" width="36" height="2.6" rx="1.3" fill="#cbd5e1" />
      <rect x="19" y="61" width="24" height="2.6" rx="1.3" fill="#cbd5e1" />

      {/* Folio en la esquina inferior */}
      {folio && (
        <text
          x="36"
          y="80"
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          fontFamily="ui-monospace, monospace"
          fill={s.cinta}
        >
          {folio}
        </text>
      )}
    </svg>
  )
}
