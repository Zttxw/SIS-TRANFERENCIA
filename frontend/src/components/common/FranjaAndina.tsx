import { type HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

interface FranjaAndinaProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: 'vertical' | 'horizontal'
  className?: string
}

/**
 * Franja Andina tipo tejido tradicional (Pallay Cusqueño / Chumpi)
 * Representa la rica tradición textil y cultural de San Jerónimo, Cusco.
 * Emplea motivos geométricos escalonados (tocapus/rombos concéntricos andinos)
 * con la paleta ceremonial: carmín, oro Inti, turquesa andina, verde sagrado y azul noche.
 */
export function FranjaAndina({
  orientation = 'vertical',
  className,
  ...props
}: FranjaAndinaProps) {
  const isVertical = orientation === 'vertical'

  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={cn(
        'relative select-none overflow-hidden shrink-0 shadow-lg',
        isVertical ? 'w-7 lg:w-8 h-full' : 'w-full h-7 lg:h-8',
        className,
      )}
      {...props}
    >
      <svg
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio={isVertical ? 'xMid slice' : 'slice yMid'}
      >
        <defs>
          {/* Patrón vertical: repetición continua cada 64px de alto */}
          <pattern
            id="pallay-vertical"
            width="32"
            height="64"
            patternUnits="userSpaceOnUse"
          >
            {/* Fondo base telar: rojo carmín andino */}
            <rect width="32" height="64" fill="#991b1b" />

            {/* Franjas laterales de borde (orillos / ribetes de urdimbre) */}
            <rect x="0" y="0" width="3" height="64" fill="#1e1b4b" />
            <rect x="29" y="0" width="3" height="64" fill="#1e1b4b" />
            <line x1="3.5" y1="0" x2="3.5" y2="64" stroke="#fbbf24" strokeWidth="1" strokeDasharray="3,2" />
            <line x1="28.5" y1="0" x2="28.5" y2="64" stroke="#fbbf24" strokeWidth="1" strokeDasharray="3,2" />

            {/* Triángulos laterales verdes y turquesa (grecas andinas) */}
            <polygon points="4,8 10,16 4,24" fill="#0d9488" />
            <polygon points="28,8 22,16 28,24" fill="#0d9488" />
            <polygon points="4,40 10,48 4,56" fill="#15803d" />
            <polygon points="28,40 22,48 28,56" fill="#15803d" />

            {/* Rombo central superior (Chacana / Inti) */}
            {/* Rombo exterior dorado */}
            <polygon points="16,4 26,16 16,28 6,16" fill="#f59e0b" />
            {/* Rombo intermedio turquesa */}
            <polygon points="16,8 22,16 16,24 10,16" fill="#0284c7" />
            {/* Rombo interior carmín */}
            <polygon points="16,11 20,16 16,21 12,16" fill="#b91c1c" />
            {/* Núcleo blanco (estrella Ch'aska) */}
            <polygon points="16,13 18,16 16,19 14,16" fill="#ffffff" />

            {/* Elemento de transición / nudo de telar */}
            <circle cx="16" cy="32" r="2.5" fill="#fbbf24" />
            <polygon points="16,29 18,32 16,35 14,32" fill="#ffffff" />
            <polygon points="8,32 11,29 11,35" fill="#f59e0b" />
            <polygon points="24,32 21,29 21,35" fill="#f59e0b" />

            {/* Rombo central inferior (Variación ceremonial) */}
            {/* Rombo exterior dorado */}
            <polygon points="16,36 26,48 16,60 6,48" fill="#eab308" />
            {/* Rombo intermedio verde sagrado */}
            <polygon points="16,40 22,48 16,56 10,48" fill="#15803d" />
            {/* Rombo interior azul profundo */}
            <polygon points="16,43 20,48 16,53 12,48" fill="#1e3a8a" />
            {/* Núcleo blanco */}
            <polygon points="16,45 18,48 16,51 14,48" fill="#ffffff" />

            {/* Textura sutil de hilos de urdimbre y trama (sensación de telar artesanal) */}
            <line x1="0" y1="4" x2="32" y2="4" stroke="#000000" strokeWidth="0.5" opacity="0.12" />
            <line x1="0" y1="12" x2="32" y2="12" stroke="#000000" strokeWidth="0.5" opacity="0.12" />
            <line x1="0" y1="20" x2="32" y2="20" stroke="#000000" strokeWidth="0.5" opacity="0.12" />
            <line x1="0" y1="28" x2="32" y2="28" stroke="#000000" strokeWidth="0.5" opacity="0.12" />
            <line x1="0" y1="36" x2="32" y2="36" stroke="#000000" strokeWidth="0.5" opacity="0.12" />
            <line x1="0" y1="44" x2="32" y2="44" stroke="#000000" strokeWidth="0.5" opacity="0.12" />
            <line x1="0" y1="52" x2="32" y2="52" stroke="#000000" strokeWidth="0.5" opacity="0.12" />
            <line x1="0" y1="60" x2="32" y2="60" stroke="#000000" strokeWidth="0.5" opacity="0.12" />
          </pattern>

          {/* Patrón horizontal: para vistas móviles o encabezados */}
          <pattern
            id="pallay-horizontal"
            width="64"
            height="32"
            patternUnits="userSpaceOnUse"
          >
            <rect width="64" height="32" fill="#991b1b" />

            <rect x="0" y="0" width="64" height="3" fill="#1e1b4b" />
            <rect x="0" y="29" width="64" height="3" fill="#1e1b4b" />
            <line x1="0" y1="3.5" x2="64" y2="3.5" stroke="#fbbf24" strokeWidth="1" strokeDasharray="3,2" />
            <line x1="0" y1="28.5" x2="64" y2="28.5" stroke="#fbbf24" strokeWidth="1" strokeDasharray="3,2" />

            <polygon points="8,4 16,10 24,4" fill="#0d9488" />
            <polygon points="8,28 16,22 24,28" fill="#0d9488" />
            <polygon points="40,4 48,10 56,4" fill="#15803d" />
            <polygon points="40,28 48,22 56,28" fill="#15803d" />

            <polygon points="4,16 16,26 28,16 16,6" fill="#f59e0b" />
            <polygon points="8,16 16,22 24,16 16,10" fill="#0284c7" />
            <polygon points="11,16 16,20 21,16 16,12" fill="#b91c1c" />
            <polygon points="13,16 16,18 19,16 16,14" fill="#ffffff" />

            <circle cx="32" cy="16" r="2.5" fill="#fbbf24" />
            <polygon points="29,16 32,18 35,16 32,14" fill="#ffffff" />

            <polygon points="36,16 48,26 60,16 48,6" fill="#eab308" />
            <polygon points="40,16 48,22 56,16 48,10" fill="#15803d" />
            <polygon points="43,16 48,20 53,16 48,12" fill="#1e3a8a" />
            <polygon points="45,16 48,18 51,16 48,14" fill="#ffffff" />
          </pattern>
        </defs>

        <rect
          width="100%"
          height="100%"
          fill={`url(#${isVertical ? 'pallay-vertical' : 'pallay-horizontal'})`}
        />
      </svg>

      {/* Sombra de relieve textil interior para efecto tridimensional */}
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_8px_rgba(0,0,0,0.45)]" />
    </div>
  )
}
