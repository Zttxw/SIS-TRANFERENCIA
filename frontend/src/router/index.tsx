import { createBrowserRouter, Navigate } from 'react-router-dom'

import { DependenciaProvider } from '@/auth/DependenciaProvider'
import { RutaProtegida } from '@/auth/RutaProtegida'
import { LoginPage } from '@/features/auth/LoginPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { InformeGestionPage } from '@/features/gestion/InformeGestionPage'
import { AppLayout } from '@/layouts/AppLayout'

/**
 * Enrutado (plan E2/E3/E4). `/login` es público; el resto cuelga de <RutaProtegida>.
 * El <DependenciaProvider> vive dentro del área protegida (necesita al usuario).
 * El Dashboard vive en index (`/`), Anexo 02 en `/gestion`.
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
          { index: true, element: <DashboardPage /> },
          { path: 'gestion', element: <InformeGestionPage /> },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
])
