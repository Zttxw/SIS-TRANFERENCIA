import { createBrowserRouter, Navigate } from 'react-router-dom'

import { DependenciaProvider } from '@/auth/DependenciaProvider'
import { RutaProtegida } from '@/auth/RutaProtegida'
import { AcervoPage } from '@/features/acervo/AcervoPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { DocumentosPage } from '@/features/documentos/DocumentosPage'
import { InformeGestionPage } from '@/features/gestion/InformeGestionPage'
import { NoPatrimonialPage } from '@/features/nopatrimonial/NoPatrimonialPage'
import { PersonalPage } from '@/features/personal/PersonalPage'
import { AppLayout } from '@/layouts/AppLayout'

/**
 * Enrutado (plan E2/E3/E4/E5). `/login` es público; el resto cuelga de <RutaProtegida>.
 * El <DependenciaProvider> vive dentro del área protegida (necesita al usuario).
 * Dashboard vive en index (`/`), Anexos 01, 02, 03, 05, 06 montados.
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
          { path: 'documentos', element: <DocumentosPage /> },
          { path: 'gestion', element: <InformeGestionPage /> },
          { path: 'acervo', element: <AcervoPage /> },
          { path: 'personal', element: <PersonalPage /> },
          { path: 'nopatrimonial', element: <NoPatrimonialPage /> },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
])
