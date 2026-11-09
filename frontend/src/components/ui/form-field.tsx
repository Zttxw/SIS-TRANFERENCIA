import * as React from 'react'
import { AlertCircle } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Label } from './label'
import { HelpTooltip } from './tooltip'

interface FormFieldProps {
  /** Texto de la etiqueta. */
  label: string
  /** `id` del control; conecta `label` ↔ input vía `htmlFor`. */
  htmlFor?: string
  requerido?: boolean
  /** Ayuda bajo demanda: aparece tras un ícono «?» junto al label. */
  hint?: React.ReactNode
  /** Mensaje de error (tiene prioridad sobre `descripcion`). */
  error?: string
  /** Texto descriptivo permanente bajo el control (microcopy corto). */
  descripcion?: string
  className?: string
  children: React.ReactNode
}

/**
 * Agrupa label + control + hint + error en un solo lugar, con la marca de
 * requerido y el espaciado consistente. Filosofía «intuitivo, no saturado»: la
 * explicación larga vive en `hint` (ícono «?»), no como párrafo sobre el campo.
 */
export function FormField({
  label,
  htmlFor,
  requerido = false,
  hint,
  error,
  descripcion,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center gap-1.5">
        <Label htmlFor={htmlFor}>
          {label}
          {requerido && <span className="ml-0.5 text-destructive">*</span>}
        </Label>
        {hint && <HelpTooltip>{hint}</HelpTooltip>}
      </div>

      {children}

      {error ? (
        <FieldError>{error}</FieldError>
      ) : descripcion ? (
        <p className="text-xs text-muted-foreground">{descripcion}</p>
      ) : null}
    </div>
  )
}

/** Mensaje de error de un campo, con ícono y color de peligro. */
export function FieldError({ children }: { children: React.ReactNode }) {
  if (!children) return null
  return (
    <p className="flex items-center gap-1 text-xs text-destructive" role="alert">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      {children}
    </p>
  )
}
