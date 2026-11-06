import { createBrowserRouter, Navigate } from 'react-router-dom'

import { DependenciaProvider } from '@/auth/DependenciaProvider'
import { RutaProtegida } from '@/auth/RutaProtegida'
import { LoginPage } from '@/features/auth/LoginPage'
import { InicioPage } from '@/features/inicio/InicioPage'
import { AppLayout } from '@/layouts/AppLayout'

/**
 * Enrutado (plan E2). `/login` es público; el resto cuelga de <RutaProtegida>.
 * El <DependenciaProvider> vive dentro del área protegida (necesita al usuario).
 * Las pantallas de anexos se añaden en E3+.
 */
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RutaProtegida />,
    children: [
      {
        element: (
          <DependenciaProvider>
            <AppLayout />
          </DependenciaProvider>
        ),
        children: [
          { index: true, element: <InicioPage /> },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
])
