import * as React from 'react'
import { AlertTriangle } from 'lucide-react'

import { Button } from './button'
import { Dialog } from './dialog'

export interface ConfirmOptions {
  title: string
  /** Resumen de 1–2 líneas de la consecuencia. */
  description?: React.ReactNode
  confirmText?: string
  cancelText?: string
  /** `destructive` pinta el botón primario en rojo (eliminar, desestimar). */
  variant?: 'default' | 'destructive'
}

type Resolver = (ok: boolean) => void

const ConfirmContext = React.createContext<((opts: ConfirmOptions) => Promise<boolean>) | null>(
  null,
)

/**
 * Provee la confirmación imperativa. Envolver la app una vez (en `App`).
 * Uso: `const confirmar = useConfirm(); if (await confirmar({...})) { … }`.
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = React.useState<ConfirmOptions | null>(null)
  const [cargando, setCargando] = React.useState(false)
  const resolverRef = React.useRef<Resolver | null>(null)

  const confirmar = React.useCallback((o: ConfirmOptions) => {
    setOpts(o)
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
    })
  }, [])

  const cerrar = (ok: boolean) => {
    resolverRef.current?.(ok)
    resolverRef.current = null
    setOpts(null)
    setCargando(false)
  }

  const esDestructive = opts?.variant === 'destructive'

  return (
    <ConfirmContext.Provider value={confirmar}>
      {children}
      <Dialog
        open={opts !== null}
        onClose={() => cerrar(false)}
        title={opts?.title ?? ''}
      >
        <div className="space-y-4">
          {opts?.description && (
            <div className="flex gap-3 text-sm text-muted-foreground">
              {esDestructive && (
                <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
              )}
              <div>{opts.description}</div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => cerrar(false)} disabled={cargando}>
              {opts?.cancelText ?? 'Cancelar'}
            </Button>
            <Button
              variant={esDestructive ? 'destructive' : 'default'}
              onClick={() => cerrar(true)}
              disabled={cargando}
            >
              {opts?.confirmText ?? 'Confirmar'}
            </Button>
          </div>
        </div>
      </Dialog>
    </ConfirmContext.Provider>
  )
}

/** Devuelve la función de confirmación. Lanza si falta el provider. */
export function useConfirm() {
  const ctx = React.useContext(ConfirmContext)
  if (!ctx) {
    throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>.')
  }
  return ctx
}
