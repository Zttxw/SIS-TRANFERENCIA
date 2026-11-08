import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation } from 'react-router-dom'
import { z } from 'zod'

import { useAuth } from '@/auth/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/types/api'

const esquema = z.object({
  dni: z
    .string()
    .trim()
    .regex(/^[0-9]{8}$/, 'El DNI debe contener 8 dígitos numéricos.'),
  password: z.string().min(1, 'Ingresa tu contraseña.'),
})

type Campos = z.infer<typeof esquema>

export function LoginPage() {
  const { estado, iniciarSesion } = useAuth()
  const location = useLocation()
  const [mostrarPassword, setMostrarPassword] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Campos>({
    resolver: zodResolver(esquema),
    defaultValues: { dni: '', password: '' },
  })

  if (estado === 'autenticado') {
    const destino = (location.state as { from?: string } | null)?.from ?? '/'
    return <Navigate to={destino} replace />
  }

  async function onSubmit(valores: Campos) {
    try {
      await iniciarSesion({ ...valores, dispositivo: 'web' })
    } catch (error) {
      if (error instanceof ApiError && error.esValidacion && error.errors) {
        for (const [campo, mensajes] of Object.entries(error.errors)) {
          if (campo === 'dni' || campo === 'password') {
            setError(campo, { message: mensajes[0] })
          }
        }
        return
      }
      const mensaje =
        error instanceof ApiError
          ? error.message
          : 'Credenciales inválidas o servicio no disponible.'
      setError('root', { message: mensaje })
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white selection:bg-[#3484A5]/20 selection:text-[#3484A5]">
      {/* ========================================================
          PANEL IZQUIERDO INSTITUCIONAL (#3484A5 ULTRA MINIMALISTA)
          ======================================================== */}
      <section className="hidden md:flex md:w-1/2 lg:w-[48%] flex-col justify-between bg-[#3484A5] text-white p-8 lg:p-12">
        <header>
          <img
            src="/brand/mdsj-blanco.png"
            alt="Municipalidad Distrital de San Jerónimo"
            className="h-11 lg:h-12 w-auto object-contain"
          />
        </header>

        <div className="my-auto py-6 space-y-4 max-w-sm">
          <div className="space-y-2">
            <h1 className="text-lg lg:text-xl font-semibold tracking-tight text-white leading-snug">
              Panel interno de transferencia de gestión
            </h1>
            <p className="text-xs text-white/80 leading-relaxed font-normal">
              Plataforma oficial para la entrega de cargo, verificación de bienes
              y rendición de cuentas de la Municipalidad Distrital de San Jerónimo.
            </p>
          </div>

          <ul className="space-y-2 pt-1 text-xs text-white/85 font-normal">
            <li>• Verificación física de bienes asignados a tu oficina</li>
            <li>• Registro de documentos y expedientes pendientes</li>
            <li>• Emisión y firma del acta oficial de entrega de cargo</li>
          </ul>
        </div>

        <footer className="text-[11px] text-white/60 flex items-center justify-between border-t border-white/10 pt-3">
          <span>Gestión 2023 - 2026</span>
          <span>San Jerónimo · Cusco</span>
        </footer>
      </section>

      {/* Vista móvil: Encabezado compacto */}
      <header className="md:hidden flex bg-[#3484A5] text-white p-4 justify-center">
        <img
          src="/brand/mdsj-blanco.png"
          alt="Municipalidad Distrital de San Jerónimo"
          className="h-9 w-auto object-contain"
        />
      </header>

      {/* ========================================================
          PANEL DERECHO: FORMULARIO COMPACTO ULTRA MINIMALISTA
          ======================================================== */}
      <main className="flex-1 flex flex-col justify-center items-center p-6 sm:p-8 bg-white">
        <div className="w-full max-w-[290px] sm:max-w-[310px] space-y-4">
          {/* Título simple y conciso */}
          <div className="space-y-0.5">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">
              Iniciar sesión
            </h2>
            <p className="text-xs text-slate-500">
              Ingresa tus credenciales para acceder al panel interno.
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
            {/* Campo DNI */}
            <div className="space-y-1">
              <Label htmlFor="dni" className="text-xs font-normal text-slate-700">
                Usuario
              </Label>
              <Input
                id="dni"
                type="text"
                inputMode="numeric"
                autoComplete="username"
                maxLength={8}
                placeholder="DNI (8 dígitos)"
                className="h-[34px] px-2.5 text-xs bg-slate-50/60 border-slate-200 focus-visible:ring-[#3484A5] focus-visible:border-[#3484A5]"
                aria-invalid={!!errors.dni}
                {...register('dni')}
              />
              {errors.dni && (
                <p className="text-[11px] text-destructive">{errors.dni.message}</p>
              )}
            </div>

            {/* Campo Contraseña */}
            <div className="space-y-1">
              <Label htmlFor="password" className="text-xs font-normal text-slate-700">
                Contraseña
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={mostrarPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="h-[34px] pl-2.5 pr-8 text-xs bg-slate-50/60 border-slate-200 focus-visible:ring-[#3484A5] focus-visible:border-[#3484A5]"
                  aria-invalid={!!errors.password}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {mostrarPassword ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Alerta de Error General */}
            {errors.root && (
              <div
                role="alert"
                className="rounded-md border border-destructive/20 bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive"
              >
                {errors.root.message}
              </div>
            )}

            {/* Botón de Ingreso */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-[34px] bg-[#3484A5] hover:bg-[#2b718d] text-white font-medium text-xs shadow-none transition-colors rounded-md cursor-pointer mt-1"
            >
              {isSubmitting ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </form>

          {/* Enlaces de pie */}
          <div className="pt-1 space-y-3 text-center">
            <p className="text-[11px] text-slate-400 leading-tight">
              ¿Olvidaste tu contraseña? Contacta al administrador del sistema.
            </p>

            <div className="border-t border-slate-100 pt-3">
              <a
                href="https://munisanjeronimo.gob.pe"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-slate-500 hover:text-slate-800 transition-colors"
              >
                ← Volver al portal público
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
