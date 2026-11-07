import { useCallback, useMemo, useState } from 'react'

import { DependenciaContext } from '@/auth/dependencia-context'
import { useAuth } from '@/auth/hooks'

const STORAGE_KEY = 'sistransfer.dependencia'

/**
 * Override persistido:
 *  - ausente  -> sin selección explícita: se usa el default (dependencia propia)
 *  - 'all'    -> el usuario eligió explícitamente «todo mi ámbito» (null)
 *  - número   -> una dependencia concreta
 */
type Override = number | 'all' | undefined

function leerPersistida(): Override {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return undefined
    if (raw === 'all') return 'all'
    const n = Number(raw)
    return Number.isFinite(n) ? n : undefined
  } catch {
    return undefined
  }
}

/**
 * Proveedor de la dependencia activa (plan §5, E2). El valor efectivo se
 * DERIVA en render: la selección explícita (persistida) si existe; si no, la
 * dependencia del servidor del usuario. Persiste cada cambio. Sin usuario cae
 * a `null` sin necesidad de efectos.
 */
export function DependenciaProvider({ children }: { children: React.ReactNode }) {
  const { usuario } = useAuth()
  const [override, setOverride] = useState<Override>(() => leerPersistida())

  // Por defecto se asocia al servidor del usuario, o a OTI (id 48) como despacho institucional activo
  const propia = usuario?.servidor?.dependencia_id ?? 48
  const dependenciaId =
    override === undefined ? propia : override === 'all' ? null : override

  const setDependenciaId = useCallback((id: number | null) => {
    const nuevo: Override = id === null ? 'all' : id
    setOverride(nuevo)
    try {
      localStorage.setItem(STORAGE_KEY, String(nuevo))
    } catch {
      /* no-op */
    }
  }, [])

  const value = useMemo(
    () => ({ dependenciaId, setDependenciaId }),
    [dependenciaId, setDependenciaId],
  )

  return <DependenciaContext value={value}>{children}</DependenciaContext>
}
