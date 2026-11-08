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

  const propia = usuario?.servidor?.dependencia_id ?? null
  const esGlobal = usuario?.es_global === true
  const ambito = useMemo(
    () => usuario?.dependencias_ambito ?? (propia ? [propia] : []),
    [usuario?.dependencias_ambito, propia],
  )

  // Derivación del dependenciaId según jerarquía y ámbito del usuario
  let dependenciaId: number | null
  if (!usuario) {
    dependenciaId = null
  } else if (esGlobal) {
    // Superjefe / Admin / ETTS: puede ver tablero global (null) o cualquier dependencia
    dependenciaId =
      override === undefined ? null : override === 'all' ? null : override
  } else if (ambito.length > 0) {
    // Jefe o Servidor con ámbito restringido a su dependencia o subárbol
    if (ambito.length === 1) {
      dependenciaId = ambito[0]
    } else if (typeof override === 'number' && ambito.includes(override)) {
      dependenciaId = override
    } else {
      dependenciaId = propia && ambito.includes(propia) ? propia : ambito[0]
    }
  } else {
    dependenciaId = propia
  }

  const setDependenciaId = useCallback(
    (id: number | null) => {
      if (!esGlobal && id === null) {
        // Los usuarios no globales no pueden seleccionar la vista global del pliego
        return
      }

      if (!esGlobal && typeof id === 'number' && ambito.length > 0 && !ambito.includes(id)) {
        // No puede seleccionar dependencias fuera de su ámbito
        return
      }

      const nuevo: Override = id === null ? 'all' : id
      setOverride(nuevo)
      try {
        localStorage.setItem(STORAGE_KEY, String(nuevo))
      } catch {
        /* no-op */
      }
    },
    [esGlobal, ambito],
  )

  const value = useMemo(
    () => ({ dependenciaId, setDependenciaId }),
    [dependenciaId, setDependenciaId],
  )

  return <DependenciaContext value={value}>{children}</DependenciaContext>
}
