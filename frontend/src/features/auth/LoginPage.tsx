import { zodResolver } from '@hookform/resolvers/zod'
import { Building2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation } from 'react-router-dom'
import { z } from 'zod'

import { useAuth } from '@/auth/hooks'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/types/api'

// Validación cliente alineada a LoginRequest del backend (DNI de 8 dígitos).
const esquema = z.object({
  dni: z
    .string()
    .trim()
    .regex(/^[0-9]{8}$/, 'El DNI debe tener 8 dígitos.'),
  password: z.string().min(1, 'Ingresa tu contraseña.'),
})

type Campos = z.infer<typeof esquema>

export function LoginPage() {
  const { estado, iniciarSesion } = useAuth()
  const location = useLocation()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Campos>({
    resolver: zodResolver(esquema),
    defaultValues: { dni: '', password: '' },
  })

  // Si ya hay sesión, redirige a donde intentaba ir (o al inicio).
  if (estado === 'autenticado') {
    const destino =
      (location.state as { from?: string } | null)?.from ?? '/'
    return <Navigate to={destino} replace />
  }

  async function onSubmit(valores: Campos) {
    try {
      await iniciarSesion({ ...valores, dispositivo: 'web' })
    } catch (error) {
      if (error instanceof ApiError && error.esValidacion && error.errors) {
        // Mapea errores 422 a los campos del formulario.
        for (const [campo, mensajes] of Object.entries(error.errors)) {
          if (campo === 'dni' || campo === 'password') {
            setError(campo, { message: mensajes[0] })
          }
        }
        return
      }
      // 401/credenciales inválidas u otro error: mensaje general en el formulario.
      const mensaje =
        error instanceof ApiError
          ? error.message
          : 'No se pudo iniciar sesión. Intenta nuevamente.'
      setError('root', { message: mensaje })
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>SIS-TRANSFERENCIA</CardTitle>
          <CardDescription>
            Transferencia de Gestión 2026 · San Jerónimo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <div className="space-y-1.5">
              <Label htmlFor="dni">DNI</Label>
              <Input
                id="dni"
                inputMode="numeric"
                autoComplete="username"
                maxLength={8}
                placeholder="12345678"
                aria-invalid={!!errors.dni}
                {...register('dni')}
              />
              {errors.dni && (
                <p className="text-xs text-destructive">{errors.dni.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            {errors.root && (
              <div
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
              >
                {errors.root.message}
              </div>
            )}

            <Button type="submit" className="w-full" loading={isSubmitting}>
              Iniciar sesión
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
