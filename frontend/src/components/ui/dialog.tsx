import * as React from 'react'
import { X } from 'lucide-react'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  /** Ancho máximo del contenido (por defecto `max-w-lg`). */
  anchoClassName?: string
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  anchoClassName = 'max-w-lg',
}: DialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      {/* Modal Content */}
      <div className={`relative z-50 max-h-[90vh] w-full overflow-y-auto rounded-xl border bg-card p-6 shadow-xl transition-all ${anchoClassName}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Cerrar</span>
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}
