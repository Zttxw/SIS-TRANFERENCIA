import { useAuth } from '@/auth/hooks'

/**
 * ¿El usuario observa como titular ETTE en suplencia del coordinador (D-04)?
 * Solo cuando es titular y no es el coordinador asignado al CC.
 */
export function useEsTitularSuplente(dependenciaId?: number | null): boolean {
  const { usuario } = useAuth()
  const roles = usuario?.roles ?? []
  if (!roles.some((r) => r.rol === 'ette')) return false
  return !roles.some(
    (r) => r.rol === 'delegado_ette' && (dependenciaId == null || r.dependencia_id === dependenciaId),
  )
}
