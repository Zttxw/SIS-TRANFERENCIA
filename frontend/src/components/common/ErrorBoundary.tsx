import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertOctagon, Home, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React tree:', error, errorInfo)
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleGoHome = () => {
    window.location.href = '/'
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
          <Card className="w-full max-w-md border-destructive/40 bg-card p-6 shadow-2xl text-center">
            <CardContent className="space-y-4 pt-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                <AlertOctagon className="h-8 w-8" />
              </div>

              <div>
                <h1 className="text-lg font-bold text-foreground">
                  Se produjo un error inesperado en la interfaz
                </h1>
                <p className="mt-1 text-xs text-muted-foreground">
                  Municipalidad Distrital de San Jerónimo · Sistema Institucional de Transferencia
                </p>
              </div>

              {this.state.error && (
                <div className="rounded-lg bg-muted/40 p-3 text-left font-mono text-[11px] text-muted-foreground break-words max-h-32 overflow-y-auto">
                  {this.state.error.message || 'Error desconocido en la aplicación.'}
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                <Button
                  onClick={this.handleReload}
                  variant="default"
                  size="sm"
                  className="w-full sm:w-auto gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Recargar Página
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto gap-1.5"
                >
                  <Home className="h-3.5 w-3.5" />
                  Ir al Inicio
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

