import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  User,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation } from 'react-router-dom'
import { z } from 'zod'

import { useAuth } from '@/auth/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/types/api'

// Validación cliente de DNI (8 dígitos numéricos) y contraseña requerida
const esquema = z.object({
  dni: z
    .string()
    .trim()
    .regex(/^[0-9]{8}$/, 'El DNI debe contener exactamente 8 dígitos numéricos.'),
  password: z.string().min(1, 'Ingresa tu contraseña institucional.'),
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

  // Redirección si ya cuenta con sesión activa
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
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 selection:bg-[#1d6d8a]/20 selection:text-[#1d6d8a]">
      {/* ========================================================
          PANEL IZQUIERDO INSTITUCIONAL (TEAL MDSJ LIMPIO Y PLANO)
          ======================================================== */}
      <section className="relative hidden md:flex md:w-1/2 lg:w-[50%] flex-col justify-between bg-[#1d6d8a] text-white p-8 lg:p-12 xl:p-14 overflow-hidden">
        {/* Encabezado: Logotipo oficial MDSJ (mdsj-blanco.png) */}
        <header className="flex items-center">
          <img
            src="/brand/mdsj-blanco.png"
            alt="Municipalidad Distrital de San Jerónimo"
            className="h-10 lg:h-12 w-auto object-contain"
          />
        </header>

        {/* Contenido Central: Mensaje y Pilares con tipografía proporcionada */}
        <div className="my-auto py-8 space-y-6 max-w-lg">
          <div className="space-y-3">
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-white leading-snug">
              Panel interno de transferencia de gestión
            </h1>
            <p className="text-xs lg:text-sm text-cyan-50/85 leading-relaxed font-normal">
              Plataforma oficial para la rendición de cuentas, verificación física
              de inventarios patrimoniales y suscripción del Acta de Transferencia
              de la Municipalidad Distrital de San Jerónimo.
            </p>
          </div>

          {/* Lista de características institucionales */}
          <ul className="space-y-3 pt-1 text-xs text-cyan-50/90 font-normal">
            <li className="flex items-start gap-2.5">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-teal-400/20 text-teal-100 mt-0.5">
                <CheckCircle2 className="h-3 w-3" />
              </span>
              <span>Conforme a la Directiva CGR N.° 016-2022-CG/PREVI y Directiva MDSJ</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-teal-400/20 text-teal-100 mt-0.5">
                <ShieldCheck className="h-3 w-3" />
              </span>
              <span>Contraste físico con padrón SIGA-MEF y conciliación documental</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-teal-400/20 text-teal-100 mt-0.5">
                <CheckCircle2 className="h-3 w-3" />
              </span>
              <span>Cadena de custodia digital y sellado probatorio con hash SHA-256</span>
            </li>
          </ul>
        </div>

        {/* Pie de panel izquierdo */}
        <footer className="text-[11px] text-cyan-100/70 flex items-center justify-between border-t border-white/10 pt-3">
          <span>Gestión Municipal 2023 - 2026</span>
          <span>San Jerónimo · Cusco, Perú</span>
        </footer>
      </section>

      {/* Vista móvil: Encabezado compacto institucional */}
      <header className="md:hidden flex flex-col bg-[#1d6d8a] text-white p-5">
        <div className="flex items-center justify-center">
          <img
            src="/brand/mdsj-blanco.png"
            alt="Municipalidad Distrital de San Jerónimo"
            className="h-9 w-auto object-contain"
          />
        </div>
      </header>

      {/* ========================================================
          PANEL DERECHO: FORMULARIO DE ACCESO
          ======================================================== */}
      <main className="flex-1 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-14 bg-white md:bg-slate-50/60">
        <div className="w-full max-w-sm space-y-5">
          {/* Badge de Acceso Restringido */}
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 border border-slate-200">
              <Lock className="h-3 w-3 text-slate-500" />
              <span>Acceso restringido</span>
            </span>
          </div>

          {/* Título de Bienvenida */}
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Iniciar sesión
            </h2>
            <p className="text-xs text-slate-500">
              Ingresa tus credenciales para acceder al panel interno.
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5" noValidate>
            {/* Campo DNI */}
            <div className="space-y-1">
              <Label htmlFor="dni" className="text-xs font-medium text-slate-700">
                Usuario (DNI)
              </Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="h-3.5 w-3.5" />
                </span>
                <Input
                  id="dni"
                  type="text"
                  inputMode="numeric"
                  autoComplete="username"
                  maxLength={8}
                  placeholder="Número de DNI (8 dígitos)"
                  className="pl-9 h-10 text-xs sm:text-sm bg-slate-50/50 border-slate-200 focus-visible:ring-[#1d6d8a] focus-visible:border-[#1d6d8a]"
                  aria-invalid={!!errors.dni}
                  {...register('dni')}
                />
              </div>
              {errors.dni && (
                <p className="text-[11px] text-destructive font-medium">{errors.dni.message}</p>
              )}
            </div>

            {/* Campo Contraseña */}
            <div className="space-y-1">
              <Label htmlFor="password" className="text-xs font-medium text-slate-700">
                Contraseña
              </Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-3.5 w-3.5" />
                </span>
                <Input
                  id="password"
                  type={mostrarPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pl-9 pr-9 h-10 text-xs sm:text-sm bg-slate-50/50 border-slate-200 focus-visible:ring-[#1d6d8a] focus-visible:border-[#1d6d8a]"
                  aria-invalid={!!errors.password}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
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
                <p className="text-[11px] text-destructive font-medium">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Alerta de Error General */}
            {errors.root && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive font-medium"
              >
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{errors.root.message}</span>
              </div>
            )}

            {/* Botón de Ingreso */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 bg-[#1d6d8a] hover:bg-[#15546b] text-white font-medium text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
            >
              {isSubmitting ? (
                <span>Ingresando...</span>
              ) : (
                <>
                  <span>Ingresar</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </form>

          {/* Enlaces y Ayuda */}
          <div className="pt-2 space-y-3.5 text-center">
            <p className="text-[11px] text-slate-500">
              ¿Olvidaste tu contraseña? Contacta al administrador del sistema o a la OTI.
            </p>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white md:bg-slate-50/60 px-2 text-slate-400 text-[10px] tracking-wider">
                  MDSJ
                </span>
              </div>
            </div>

            <div>
              <a
                href="https://munisanjeronimo.gob.pe"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#1d6d8a] transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                <span>Volver al portal institucional</span>
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
