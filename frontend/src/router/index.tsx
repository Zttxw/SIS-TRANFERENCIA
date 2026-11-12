import { createBrowserRouter, Navigate } from 'react-router-dom'

import { DependenciaProvider } from '@/auth/DependenciaProvider'
import { RutaProtegida } from '@/auth/RutaProtegida'
import { NotFoundPage } from '@/components/common/NotFoundPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { AppLayout } from '@/layouts/AppLayout'
import { Spinner } from '@/components/ui/spinner'

/**
 * Enrutado (plan E2/E3/E4/E5/E6). `/login` es público; el resto cuelga de <RutaProtegida>.
 * El <DependenciaProvider> vive dentro del área protegida (necesita al usuario).
 */
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RutaProtegida />,
    HydrateFallback: () => <div role="status" className="flex min-h-screen items-center justify-center gap-2"><Spinner className="h-5 w-5" /> Cargando el sistema…</div>,
    children: [
      {
        element: (
          <DependenciaProvider>
            <AppLayout />
          </DependenciaProvider>
        ),
        children: [
          { index: true, lazy: () => import('@/features/dashboard/DashboardPage').then(({ DashboardPage }) => ({ Component: DashboardPage })) },
          { path: 'organigrama', lazy: () => import('@/features/organization/EstructuraOrganicaPage').then(({ EstructuraOrganicaPage }) => ({ Component: EstructuraOrganicaPage })) },
          { path: 'documentos', lazy: () => import('@/features/documentos/DocumentosPage').then(({ DocumentosPage }) => ({ Component: DocumentosPage })) },
          { path: 'gestion', lazy: () => import('@/features/gestion/InformeGestionPage').then(({ InformeGestionPage }) => ({ Component: InformeGestionPage })) },
          { path: 'acervo', lazy: () => import('@/features/acervo/AcervoPage').then(({ AcervoPage }) => ({ Component: AcervoPage })) },
          { path: 'personal', lazy: () => import('@/features/personal/PersonalPage').then(({ PersonalPage }) => ({ Component: PersonalPage })) },
          { path: 'nopatrimonial', lazy: () => import('@/features/nopatrimonial/NoPatrimonialPage').then(({ NoPatrimonialPage }) => ({ Component: NoPatrimonialPage })) },
          { path: 'patrimonio', lazy: () => import('@/features/patrimonio/PatrimonioPage').then(({ PatrimonioPage }) => ({ Component: PatrimonioPage })) },
          { path: 'observaciones', lazy: () => import('@/features/observaciones/ObservacionesPage').then(({ ObservacionesPage }) => ({ Component: ObservacionesPage })) },
          { path: 'entregas', lazy: () => import('@/features/entregas/EntregasPage').then(({ EntregasPage }) => ({ Component: EntregasPage })) },
          { path: 'acta', lazy: () => import('@/features/acta/ActaPage').then(({ ActaPage }) => ({ Component: ActaPage })) },
          { path: 'reportes', lazy: () => import('@/features/reportes/ReportesPage').then(({ ReportesPage }) => ({ Component: ReportesPage })) },
          { path: 'usuarios', lazy: () => import('@/features/admin/AdminPage').then(({ AdminPage }) => ({ Component: AdminPage })) },
          { path: 'cronograma', lazy: () => import('@/features/cronograma/CronogramaPage').then(({ CronogramaPage }) => ({ Component: CronogramaPage })) },
          { path: 'delegados', lazy: () => import('@/features/delegados/DelegadosPage').then(({ DelegadosPage }) => ({ Component: DelegadosPage })) },
          { path: 'admin', element: <Navigate to="/usuarios" replace /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
