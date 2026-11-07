import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Building2 } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'

interface AnexoHeaderProps {
  numeroAnexo: string
  titulo: string
  subtitulo?: string
  directivaRef?: string
  dependenciaNombre?: string
  dependenciaCodigo?: string
  acciones?: ReactNode
}

export function AnexoHeader({
  numeroAnexo,
  titulo,
  subtitulo,
  directivaRef = 'Directiva N.° 001-2026-MDSJ/A',
  dependenciaNombre,
  dependenciaCodigo,
  acciones,
}: AnexoHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b pb-5">
      {/* Botón Volver + Metadatos normativos */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to="/"
          className={buttonVariants({
            variant: 'ghost',
            size: 'sm',
            className: 'gap-1.5 text-muted-foreground hover:text-foreground -ml-2',
          })}
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al Dashboard
        </Link>

        <div className="flex items-center gap-2">
          <span className="rounded-md border bg-muted/60 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
            {numeroAnexo}
          </span>
          <span className="text-xs text-muted-foreground">{directivaRef}</span>
        </div>
      </div>

      {/* Título Principal + Dependencia + Acciones */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{titulo}</h1>
          {subtitulo && <p className="text-sm text-muted-foreground">{subtitulo}</p>}

          {dependenciaNombre && (
            <div className="flex items-center gap-2 pt-1 text-xs font-medium text-foreground/80">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              <span>
                {dependenciaCodigo ? `${dependenciaCodigo} - ` : ''}
                {dependenciaNombre}
              </span>
            </div>
          )}
        </div>

        {acciones && <div className="flex flex-wrap items-center gap-2.5">{acciones}</div>}
      </div>
    </div>
  )
}
