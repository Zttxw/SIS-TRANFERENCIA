import { createBrowserRouter, Navigate } from 'react-router-dom'

import { DependenciaProvider } from '@/auth/DependenciaProvider'
import { RutaProtegida } from '@/auth/RutaProtegida'
import { EnDesarrolloPage } from '@/components/common/EnDesarrolloPage'
import { AcervoPage } from '@/features/acervo/AcervoPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { DocumentosPage } from '@/features/documentos/DocumentosPage'
import { InformeGestionPage } from '@/features/gestion/InformeGestionPage'
import { NoPatrimonialPage } from '@/features/nopatrimonial/NoPatrimonialPage'
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
          {
            path: 'observaciones',
            element: (
              <EnDesarrolloPage
                titulo="Bandeja General de Observaciones"
                modulo="Gestión Global de Observaciones y Subsanaciones"
                etapa="E7"
              />
            ),
          },
          {
            path: 'entregas',
            element: (
              <EnDesarrolloPage
                titulo="Monitoreo Jerárquico de Entregas"
                modulo="Seguimiento Institucional de Entregas por Nivel"
                etapa="E7"
              />
            ),
          },
          {
            path: 'acta',
            element: (
              <EnDesarrolloPage
                titulo="Anexo 07 · Acta de Transferencia"
                modulo="Emisión de Actas de Transferencia Institucional"
                etapa="E8"
              />
            ),
          },
          {
            path: 'admin',
            element: (
              <EnDesarrolloPage
                titulo="Panel de Administración"
                modulo="Padrón de Servidores y Activación de Cuentas"
                etapa="E9"
              />
            ),
          },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
])
