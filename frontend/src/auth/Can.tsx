import { usePermiso } from '@/auth/hooks'
import type { Permiso } from '@/auth/permisos'

/**
 * Gating declarativo por permiso (plan §5). Renderiza `children` solo si el
 * usuario tiene el permiso; opcionalmente muestra `fallback`.
 *
 *   <Can permiso="anexos.registrar"><Button>Nuevo</Button></Can>
 */
export function Can({
  permiso,
  fallback = null,
  children,
}: {
  permiso: Permiso
  fallback?: React.ReactNode
  children: React.ReactNode
}) {
  const permitido = usePermiso(permiso)
  return <>{permitido ? children : fallback}</>
}
