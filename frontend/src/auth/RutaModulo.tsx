import { Navigate, Outlet } from 'react-router-dom'

import { useModulo } from '@/auth/hooks'
import type { ModuloConfigurable } from '@/types/auth'

/** Rutas de un módulo que se puede apagar: si está apagado, vuelven al inicio. */
export function RutaModulo({ modulo }: { modulo: ModuloConfigurable }) {
  return useModulo(modulo) ? <Outlet /> : <Navigate to="/" replace />
}
