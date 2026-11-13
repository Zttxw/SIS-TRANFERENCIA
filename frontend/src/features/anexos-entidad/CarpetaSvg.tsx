import { cn } from '@/lib/utils'

export type TonoCarpeta = 'verde' | 'gris' | 'ambar'

/** Paleta por tono — tapa, cuerpo, borde y papel interior de la carpeta SVG. */
const TONOS: Record<
  TonoCarpeta,
  { tapa: string; cuerpo: string; cuerpoClaro: string; borde: string; papel: string }
> = {
  verde: {
    tapa: '#2ca792',
    cuerpo: '#34c3aa',
    cuerpoClaro: '#5bd6c1',
    borde: '#1f8a78',
    papel: '#ffffff',
  },
  gris: {
    tapa: '#94a3b8',
    cuerpo: '#b4c0cf',
    cuerpoClaro: '#cdd6e1',
    borde: '#6b7a8d',
    papel: '#f1f5f9',
  },
  ambar: {
    tapa: '#e0a030',
    cuerpo: '#f0c84f',
    cuerpoClaro: '#f6da82',
    borde: '#bb8019',
    papel: '#fffdf5',
  },
}

interface CarpetaSvgProps {
  tono: TonoCarpeta
  /** Abre la carpeta y asoma los papeles (hover / selección). */
  abierta?: boolean
  className?: string
}

/**
 * Carpeta de archivo dibujada en SVG (no un ícono de librería), con tapa,
 * cuerpo degradado, papeles asomando y animación de apertura. El color
 * comunica el estado de remisión: verde = remitida/consolidada, gris = sin
 * remitir, ámbar = observada.
 */
export function CarpetaSvg({ tono, abierta = false, className }: CarpetaSvgProps) {
  const c = TONOS[tono]
  const idGrad = `grad-${tono}`

  return (
    <svg
      viewBox="0 0 120 96"
      className={cn('h-full w-full overflow-visible', className)}
      role="presentation"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={idGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.cuerpoClaro} />
          <stop offset="100%" stopColor={c.cuerpo} />
        </linearGradient>
      </defs>

      {/* Parte trasera de la carpeta (tapa con pestaña) */}
      <path
        d="M10 22 Q10 14 18 14 L44 14 Q49 14 52 19 L55 24 L104 24 Q112 24 112 32 L112 78 Q112 86 104 86 L18 86 Q10 86 10 78 Z"
        fill={c.tapa}
        stroke={c.borde}
        strokeWidth="1.5"
      />

      {/* Papeles interiores — se elevan al abrir */}
      <g
        className="origin-bottom transition-transform duration-300 ease-out"
        style={{ transform: abierta ? 'translateY(-7px)' : 'translateY(0)' }}
      >
        <rect x="26" y="30" width="68" height="46" rx="3" fill={c.papel} stroke={c.borde} strokeOpacity="0.25" />
        <rect x="34" y="38" width="44" height="3.5" rx="1.75" fill={c.borde} opacity="0.35" />
        <rect x="34" y="46" width="52" height="3.5" rx="1.75" fill={c.borde} opacity="0.25" />
        <rect x="34" y="54" width="36" height="3.5" rx="1.75" fill={c.borde} opacity="0.2" />
      </g>

      {/* Cara frontal de la carpeta — se inclina al abrir */}
      <g
        className="origin-bottom transition-transform duration-300 ease-out"
        style={{ transform: abierta ? 'perspective(140px) rotateX(-18deg)' : 'none' }}
      >
        <path
          d="M8 40 Q8 34 14 34 L106 34 Q113 34 111 40 L104 82 Q103 88 96 88 L16 88 Q9 88 9 82 Z"
          fill={`url(#${idGrad})`}
          stroke={c.borde}
          strokeWidth="1.5"
        />
        {/* Brillo sutil superior */}
        <path
          d="M14 38 L104 38 Q107 38 106 42 L105 46 L13 46 L13 42 Q13 38 14 38 Z"
          fill="#ffffff"
          opacity="0.18"
        />
      </g>
    </svg>
  )
}
