import { Construction } from 'lucide-react'
import { Link } from 'react-router-dom'

import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface EnDesarrolloPageProps {
  titulo: string
  modulo: string
  etapa: string
}

export function EnDesarrolloPage({ titulo, modulo, etapa }: EnDesarrolloPageProps) {
  return (
    <div className="mx-auto max-w-3xl py-12">
      <Card className="border-dashed bg-muted/20 text-center p-8">
        <CardContent className="space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
            <Construction className="h-7 w-7" />
          </div>
          <div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              Próxima Etapa: {etapa}
            </span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground">{titulo}</h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              El módulo de <span className="font-semibold text-foreground">{modulo}</span> está programado para su implementación en la siguiente etapa del plan de trabajo.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Volver al Dashboard Principal
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

