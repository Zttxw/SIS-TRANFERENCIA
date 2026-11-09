import * as React from 'react'

/**
 * Cierra un panel flotante (dropdown, popover, tooltip) al hacer clic fuera del
 * elemento referenciado o al presionar Escape. Devuelve la ref a adjuntar al
 * contenedor del panel + su disparador.
 */
export function useDismiss(abierto: boolean, onCerrar: () => void) {
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!abierto) return

    const alClicFuera = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onCerrar()
      }
    }
    const alTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
    }

    document.addEventListener('mousedown', alClicFuera)
    document.addEventListener('keydown', alTecla)
    return () => {
      document.removeEventListener('mousedown', alClicFuera)
      document.removeEventListener('keydown', alTecla)
    }
  }, [abierto, onCerrar])

  return ref
}
