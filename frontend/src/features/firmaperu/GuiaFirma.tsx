import { ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { FirmanteEtte } from '@/types/transferencia'

interface GuiaFirmaProps {
  /** Quién firma por el lado ETTE (coordinador o titular suplente). */
  firmanteEtte: FirmanteEtte | null
  className?: string
}

/**
 * Guía ilustrada de los tres pasos de cada documento: generar el PDF, la firma
 * del responsable y la firma presencial del coordinador ETTE, que es su
 * aprobación. El orden de las firmas es libre (D-06).
 */
export function GuiaFirma({ firmanteEtte, className }: GuiaFirmaProps) {
  const pasos = [
    {
      ilustracion: <IlustracionGenerar />,
      titulo: 'Genere el PDF',
      texto: 'Con los datos guardados. Revíselo antes de firmar.',
    },
    {
      ilustracion: <IlustracionFirma color="var(--primary)" inicial="R" />,
      titulo: 'Firma el responsable',
      texto: 'Con Firma Perú y su DNI electrónico o certificado.',
    },
    {
      ilustracion: <IlustracionFirma color="var(--success)" inicial="C" presencial />,
      titulo: firmanteEtte?.en_calidad_de === 'titular_suplente' ? 'Firma el titular ETTE' : 'Firma el coordinador ETTE',
      texto: firmanteEtte
        ? `${firmanteEtte.nombre}, en esta misma sesión y con su certificado. Su firma aprueba el documento.`
        : 'El centro de costo aún no tiene coordinador ETTE asignado.',
    },
  ]

  return (
    <ol className={cn('grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center', className)}>
      {pasos.map((paso, i) => (
        <li key={paso.titulo} className="contents">
          <div className="flex items-center gap-3 rounded-xl border bg-card/70 p-3">
            <div className="h-14 w-14 shrink-0">{paso.ilustracion}</div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">
                <span className="mr-1 font-mono text-primary">{i + 1}.</span>{paso.titulo}
              </p>
              <p className="mt-0.5 text-microdato leading-snug text-muted-foreground">{paso.texto}</p>
            </div>
          </div>
          {i < pasos.length - 1 && <ChevronRight aria-hidden className="hidden h-4 w-4 text-muted-foreground sm:block" />}
        </li>
      ))}
    </ol>
  )
}

/** Hoja saliendo de la impresora: el PDF oficial se genera con los datos guardados. */
function IlustracionGenerar() {
  return (
    <svg viewBox="0 0 56 56" className="h-full w-full" aria-hidden="true">
      <circle cx="28" cy="28" r="27" fill="var(--primary)" opacity="0.08" />
      <path d="M17 12 L33 12 L40 19 L40 44 L17 44 Z" fill="var(--card)" stroke="var(--border)" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M33 12 L33 19 L40 19" fill="none" stroke="var(--border)" strokeWidth="1.3" strokeLinejoin="round" />
      <rect x="21" y="23" width="14" height="2.2" rx="1.1" fill="var(--primary)" opacity="0.5" />
      <rect x="21" y="28.5" width="15" height="2" rx="1" fill="var(--border)" />
      <rect x="21" y="33" width="11" height="2" rx="1" fill="var(--border)" />
      <text x="28.5" y="41.5" textAnchor="middle" fontSize="5.5" fontWeight="800" fill="var(--danger)">PDF</text>
    </svg>
  )
}

/** Pluma sobre la línea de firma; el sello lleva la inicial del lado que firma. */
function IlustracionFirma({ color, inicial, presencial = false }: { color: string; inicial: string; presencial?: boolean }) {
  return (
    <svg viewBox="0 0 56 56" className="h-full w-full" aria-hidden="true">
      <circle cx="28" cy="28" r="27" fill={color} opacity="0.1" />
      <path d="M10 38 C15 31 18 42 23 35 S30 40 34 34" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="10" y1="43" x2="40" y2="43" stroke="var(--border)" strokeWidth="1.2" />
      {/* Pluma */}
      <g transform="translate(36 30) rotate(40)">
        <rect x="-2.2" y="-17" width="4.4" height="15" rx="1.5" fill="var(--foreground)" opacity="0.8" />
        <path d="M-2.2 -2 L2.2 -2 L0 3.5 Z" fill="var(--foreground)" opacity="0.8" />
      </g>
      {/* Sello del lado */}
      <circle cx="42" cy="14" r="8" fill={color} />
      <text x="42" y="17" textAnchor="middle" fontSize="8.5" fontWeight="800" fill="var(--card)">{inicial}</text>
      {presencial && (
        // Persona: firma en la sesión del responsable.
        <g transform="translate(14 15)" fill={color}>
          <circle r="3.4" />
          <path d="M-6 9 Q-6 3 0 3 Q6 3 6 9 Z" />
        </g>
      )}
    </svg>
  )
}
