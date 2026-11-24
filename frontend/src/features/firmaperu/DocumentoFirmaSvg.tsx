import { cn } from '@/lib/utils'

export type OrigenSello = 'digital' | 'manuscrita' | null

interface DocumentoFirmaSvgProps {
  /** Hay un PDF generado vigente (si no, la hoja se dibuja como borrador punteado). */
  generado: boolean
  /** Los datos cambiaron después de generar: la hoja se marca para regenerar. */
  desactualizado?: boolean
  /** Firma vigente del responsable del CC. */
  entidad: OrigenSello
  /** Firma vigente del coordinador ETTE (o titular suplente). */
  ette: OrigenSello
  /** Número del anexo, en la cabecera de la hoja. */
  folio: string
  className?: string
}

const CHECK = 'M-4.5 0.2 L-1.3 3.4 L4.8 -3.2'
const RUBRICA = 'M-6 2 C-4 -4 -2 5 0 -1 S4 4 6.5 -3'

/**
 * Hoja de un documento a firmar con sus dos sellos al pie: a la izquierda el
 * del responsable del CC (lado entidad) y a la derecha el del coordinador ETTE.
 * Un sello vacío es un círculo punteado; uno firmado se rellena con un visto
 * (firma digital) o una rúbrica (escaneo con firma a mano). Usa los colores del
 * tema, así que funciona en modo claro y oscuro.
 */
export function DocumentoFirmaSvg({ generado, desactualizado = false, entidad, ette, folio, className }: DocumentoFirmaSvgProps) {
  const completo = Boolean(entidad && ette)

  return (
    <svg viewBox="0 0 96 124" className={cn('h-full w-full overflow-visible', className)} role="presentation" aria-hidden="true">
      {/* Hoja de atrás: sensación de expediente */}
      <rect x="12" y="9" width="76" height="110" rx="5" fill="var(--muted)" opacity="0.7" />

      {/* Hoja principal con esquina doblada */}
      <path
        d="M8 9 Q8 5 12 5 L64 5 L84 25 L84 114 Q84 118 80 118 L12 118 Q8 118 8 114 Z"
        fill="var(--card)"
        stroke={desactualizado ? 'var(--warning)' : 'var(--border)'}
        strokeWidth={desactualizado ? 1.8 : 1.3}
        strokeDasharray={generado ? undefined : '4 3'}
      />
      <path d="M64 5 L64 25 L84 25 Z" fill="var(--muted)" stroke="var(--border)" strokeWidth="1" />

      {/* Cabecera: número del anexo */}
      <rect x="15" y="13" width="30" height="13" rx="3" fill="var(--primary)" opacity={generado ? 0.14 : 0.07} />
      <text x="30" y="22.6" textAnchor="middle" fontSize="8.5" fontWeight="700" fontFamily="ui-monospace, monospace"
        fill="var(--primary)" opacity={generado ? 1 : 0.5}>
        {folio}
      </text>

      {/* Renglones del contenido */}
      <g opacity={generado ? 1 : 0.45}>
        <rect x="15" y="34" width="60" height="3" rx="1.5" fill="var(--muted-foreground)" opacity="0.45" />
        <rect x="15" y="43" width="52" height="2.6" rx="1.3" fill="var(--border)" />
        <rect x="15" y="50" width="62" height="2.6" rx="1.3" fill="var(--border)" />
        <rect x="15" y="57" width="46" height="2.6" rx="1.3" fill="var(--border)" />
        <rect x="15" y="64" width="56" height="2.6" rx="1.3" fill="var(--border)" />
        <rect x="15" y="71" width="38" height="2.6" rx="1.3" fill="var(--border)" />
      </g>

      {/* Línea de firmas */}
      <line x1="15" y1="84" x2="77" y2="84" stroke="var(--border)" strokeWidth="1" strokeDasharray="2 2" />
      <Sello cx={29} cy={100} origen={entidad} color="var(--primary)" inicial="R" />
      <Sello cx={63} cy={100} origen={ette} color="var(--success)" inicial="C" />

      {/* Datos cambiados: aviso en la esquina */}
      {desactualizado && (
        <g transform="translate(84 9)">
          <circle r="8" fill="var(--warning)" />
          <path d="M0 -4 L0 1" stroke="var(--card)" strokeWidth="2" strokeLinecap="round" />
          <circle cy="4" r="1.2" fill="var(--card)" />
        </g>
      )}

      {/* Completo: insignia de suscrito */}
      {completo && (
        <g transform="translate(84 9)">
          <circle r="9" fill="var(--success)" stroke="var(--card)" strokeWidth="2" />
          <path d={CHECK} transform="scale(1.1)" fill="none" stroke="var(--card)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
    </svg>
  )
}

function Sello({ cx, cy, origen, color, inicial }: { cx: number; cy: number; origen: OrigenSello; color: string; inicial: string }) {
  if (!origen) {
    return (
      <g transform={`translate(${cx} ${cy})`}>
        <circle r="11" fill="none" stroke="var(--border)" strokeWidth="1.4" strokeDasharray="3 2.5" />
        <text y="3.4" textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--muted-foreground)" opacity="0.7">{inicial}</text>
      </g>
    )
  }

  return (
    <g transform={`translate(${cx} ${cy})`}>
      {/* Halo del sello */}
      <circle r="13.5" fill={color} opacity="0.15" />
      <circle r="11" fill={color} />
      <circle r="8.6" fill="none" stroke="var(--card)" strokeWidth="0.8" opacity="0.6" />
      <path
        d={origen === 'digital' ? CHECK : RUBRICA}
        fill="none"
        stroke="var(--card)"
        strokeWidth={origen === 'digital' ? 2.4 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  )
}
