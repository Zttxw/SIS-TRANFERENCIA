import { cn } from '@/lib/utils'

interface ProgresoFirmasSvgProps {
  firmados: number
  total: number
  className?: string
}

const RADIO = 42
const CIRCUNFERENCIA = 2 * Math.PI * RADIO

/**
 * Anillo con los documentos que ya tienen la firma de ambos lados. Cada
 * documento es un segmento; al completarse todos, el anillo pasa a verde.
 */
export function ProgresoFirmasSvg({ firmados, total, className }: ProgresoFirmasSvgProps) {
  const separacion = total > 1 ? 4 : 0
  const segmento = CIRCUNFERENCIA / Math.max(total, 1)
  const completo = total > 0 && firmados >= total

  return (
    <svg viewBox="0 0 100 100" className={cn('h-full w-full', className)} role="img"
      aria-label={`${firmados} de ${total} documentos firmados por ambos lados`}>
      <g transform="rotate(-90 50 50)">
        {Array.from({ length: total }, (_, i) => (
          <circle
            key={i}
            cx="50"
            cy="50"
            r={RADIO}
            fill="none"
            stroke={i < firmados ? (completo ? 'var(--success)' : 'var(--primary)') : 'var(--muted)'}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${Math.max(segmento - separacion, 1)} ${CIRCUNFERENCIA}`}
            strokeDashoffset={-i * segmento}
            className="transition-[stroke] duration-500"
          />
        ))}
      </g>
      <text x="50" y="50" textAnchor="middle" fontSize="24" fontWeight="800" fill="var(--foreground)">
        {firmados}
        <tspan fontSize="14" fontWeight="600" fill="var(--muted-foreground)">/{total}</tspan>
      </text>
      <text x="50" y="66" textAnchor="middle" fontSize="9" fontWeight="600" fill="var(--muted-foreground)">
        firmados
      </text>
    </svg>
  )
}
