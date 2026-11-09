import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'

import { AuthProvider } from '@/auth/AuthProvider'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { ConfirmProvider } from '@/components/ui/confirm-dialog'
import { queryClient } from '@/lib/query'
import { router } from '@/router'

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ConfirmProvider>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </ConfirmProvider>
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
