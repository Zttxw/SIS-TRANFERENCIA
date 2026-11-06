import { CheckCircle2 } from 'lucide-react'

import { useAuth } from '@/auth/hooks'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

/**
 * Página de inicio (placeholder E1/E2). Confirma la sesión activa y sus roles;
 * se reemplaza por el Dashboard de estado en E3.
 */
export function InicioPage() {
  const { usuario } = useAuth()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Bienvenido{usuario ? `, ${usuario.nombre}` : ''}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sistema de Transferencia de Gestión 2026 · San Jerónimo
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            Sesión iniciada (E2)
          </CardTitle>
          <CardDescription>
            Autenticación por DNI, navegación protegida y permisos derivados de
            los roles ya operan. El Dashboard de estado llega en E3.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {usuario?.servidor?.dependencia && (
            <p className="text-muted-foreground">
              Dependencia:{' '}
              <span className="font-medium text-foreground">
                {usuario.servidor.dependencia.codigo} ·{' '}
                {usuario.servidor.dependencia.nombre}
              </span>
            </p>
          )}
          <div>
            <p className="mb-1 text-muted-foreground">Roles asignados:</p>
            <ul className="flex flex-wrap gap-1.5">
              {usuario?.roles.length ? (
                usuario.roles.map((r, i) => (
                  <li
                    key={`${r.rol}-${r.dependencia_id ?? 'global'}-${i}`}
                    className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground"
                  >
                    {r.etiqueta}
                  </li>
                ))
              ) : (
                <li className="text-xs text-muted-foreground">Sin roles.</li>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
