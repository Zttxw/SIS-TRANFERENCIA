import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '@/auth/hooks'
import { destinoPermitidoSesion } from '@/auth/sesion-runtime'
import { Spinner } from '@/components/ui/spinner'

/**
 * Guard de rutas (plan E2). Mientras se resuelve la sesión muestra un spinner;
 * si no hay sesión redirige al login recordando el origen; si la hay, renderiza
 * las rutas hijas.
 */
export function RutaProtegida() {
  const { estado, permisos } = useAuth()
  const location = useLocation()

  if (estado === 'cargando') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    )
  }

  if (estado === 'anonimo') {
    return (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    )
  }

  const destino = destinoPermitidoSesion(location.pathname, permisos)
  if (destino !== location.pathname) {
    return <Navigate to={destino} replace />
  }

  return <Outlet />
}
