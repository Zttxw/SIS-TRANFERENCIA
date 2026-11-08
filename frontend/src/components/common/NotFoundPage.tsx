import { Link } from 'react-router-dom'
import { ArrowLeft, Compass } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function NotFoundPage() {
  return (
    <div className="flex min-h-[500px] items-center justify-center p-4">
      <Card className="w-full max-w-md border-dashed bg-card p-8 shadow-sm text-center">
        <CardContent className="space-y-4 pt-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Compass className="h-8 w-8" />
          </div>

          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              404 · Página No Encontrada
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              La dirección consultada no existe o no corresponde a una ruta habilitada en el Sistema Institucional de Transferencia.
            </p>
          </div>

          <div className="pt-2">
            <Link
              to="/"
              className={buttonVariants({ variant: 'default', size: 'sm', className: 'gap-2' })}
            >
              <ArrowLeft className="h-4 w-4" />
              Retornar al Dashboard Principal
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

