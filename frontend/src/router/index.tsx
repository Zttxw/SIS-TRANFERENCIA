import { createBrowserRouter } from 'react-router-dom'

import { DependenciaProvider } from '@/auth/DependenciaProvider'
import { RutaProtegida } from '@/auth/RutaProtegida'
import { NotFoundPage } from '@/components/common/NotFoundPage'
import { AcervoPage } from '@/features/acervo/AcervoPage'
import { ActaPage } from '@/features/acta/ActaPage'
import { AdminPage } from '@/features/admin/AdminPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { DocumentosPage } from '@/features/documentos/DocumentosPage'
import { EntregasPage } from '@/features/entregas/EntregasPage'
import { InformeGestionPage } from '@/features/gestion/InformeGestionPage'
import { NoPatrimonialPage } from '@/features/nopatrimonial/NoPatrimonialPage'
import { ObservacionesPage } from '@/features/observaciones/ObservacionesPage'
import { PatrimonioPage } from '@/features/patrimonio/PatrimonioPage'
import { PersonalPage } from '@/features/personal/PersonalPage'
import { AppLayout } from '@/layouts/AppLayout'

/**
 * Enrutado (plan E2/E3/E4/E5/E6). `/login` es público; el resto cuelga de <RutaProtegida>.
 * El <DependenciaProvider> vive dentro del área protegida (necesita al usuario).
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
          { path: 'patrimonio', element: <PatrimonioPage /> },
          { path: 'observaciones', element: <ObservacionesPage /> },
          { path: 'entregas', element: <EntregasPage /> },
          { path: 'acta', element: <ActaPage /> },
          { path: 'admin', element: <AdminPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
