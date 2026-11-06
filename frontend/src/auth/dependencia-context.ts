import { createContext } from 'react'

/**
 * Dependencia activa: la que se usa como `dependencia_id` por defecto en las
 * consultas de anexos cuando el usuario tiene ámbito sobre varias o es global
 * (plan §5, E2). `null` = sin selección explícita; el backend acota al ámbito
 * del usuario automáticamente.
 */
export interface DependenciaContextValue {
  dependenciaId: number | null
  setDependenciaId: (id: number | null) => void
}

export const DependenciaContext = createContext<DependenciaContextValue | null>(
  null,
)
