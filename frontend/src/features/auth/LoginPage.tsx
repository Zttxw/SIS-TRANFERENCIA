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
import { FranjaAndina } from '@/components/common/FranjaAndina'
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
          PANEL IZQUIERDO INSTITUCIONAL (TEAL MDSJ)
          ======================================================== */}
      <section className="relative hidden md:flex md:w-1/2 lg:w-[54%] flex-col justify-between bg-gradient-to-br from-[#175b73] via-[#1d6d8a] to-[#144f64] text-white p-8 lg:p-14 xl:p-16 overflow-hidden">
        {/* Trama de puntos sutil en fondo */}
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.8) 1.2px, transparent 1.2px)',
            backgroundSize: '22px 22px',
          }}
        />

        {/* Resplandor decorativo sutil */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />

        {/* Encabezado: Logotipo oficial MDSJ */}
        <header className="relative z-10 flex items-center gap-3">
          <img
            src="/brand/logo-oficial-blanco.png"
            alt="Municipalidad Distrital de San Jerónimo"
            className="h-14 lg:h-16 w-auto object-contain drop-shadow"
          />
        </header>

        {/* Contenido Central: Mensaje y Pilares */}
        <div className="relative z-10 my-auto py-10 space-y-8 max-w-xl">
          <div className="space-y-4">
            <h1 className="text-3xl lg:text-4xl xl:text-[2.6rem] font-extrabold tracking-tight text-white leading-tight">
              Panel interno de transferencia de gestión
            </h1>
            <p className="text-sm lg:text-base text-cyan-50/90 leading-relaxed font-normal">
              Plataforma oficial para la rendición de cuentas, verificación física
              de inventarios patrimoniales y suscripción del Acta de Transferencia
              de la Municipalidad Distrital de San Jerónimo.
            </p>
          </div>

          {/* Lista de características institucionales */}
          <ul className="space-y-3.5 pt-2 text-xs lg:text-sm text-cyan-50/95 font-medium">
            <li className="flex items-start gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-teal-200/40 bg-teal-400/20 text-teal-100 shadow-sm mt-0.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </span>
              <span>Conforme a la Directiva CGR N.° 016-2022-CG/PREVI y Directiva MDSJ</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-teal-200/40 bg-teal-400/20 text-teal-100 shadow-sm mt-0.5">
                <ShieldCheck className="h-3.5 w-3.5" />
              </span>
              <span>Contraste físico con padrón SIGA-MEF y conciliación documental</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-teal-200/40 bg-teal-400/20 text-teal-100 shadow-sm mt-0.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </span>
              <span>Cadena de custodia digital y sellado probatorio con hash SHA-256</span>
            </li>
          </ul>
        </div>

        {/* Pie de panel izquierdo */}
        <footer className="relative z-10 text-xs text-cyan-100/75 flex items-center justify-between border-t border-white/10 pt-4">
          <span>Gestión Municipal 2023 - 2026</span>
          <span>San Jerónimo · Cusco, Perú</span>
        </footer>
      </section>

      {/* ========================================================
          FRANJA ANDINA TIPO TEJIDO (CENTRO / DIVISIÓN)
          ======================================================== */}
      {/* Vista de escritorio: Franja vertical entre paneles */}
      <div className="hidden md:block relative z-20 shadow-2xl">
        <FranjaAndina orientation="vertical" className="h-full" />
      </div>

      {/* Vista móvil: Encabezado compacto + Franja horizontal */}
      <header className="md:hidden flex flex-col bg-[#1d6d8a] text-white">
        <div className="p-5 flex items-center justify-center">
          <img
            src="/brand/logo-oficial-blanco.png"
            alt="Municipalidad Distrital de San Jerónimo"
            className="h-12 w-auto object-contain"
          />
        </div>
        <FranjaAndina orientation="horizontal" className="h-4" />
      </header>

      {/* ========================================================
          PANEL DERECHO: FORMULARIO DE ACCESO
          ======================================================== */}
      <main className="flex-1 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-16">
        <div className="w-full max-w-sm sm:max-w-md space-y-6">
          {/* Badge de Acceso Restringido */}
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
              <Lock className="h-3 w-3 text-slate-500" />
              <span>Acceso restringido</span>
            </span>
          </div>

          {/* Título de Bienvenida */}
          <div className="space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Iniciar sesión
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Ingresa tus credenciales para acceder al panel interno.
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Campo DNI */}
            <div className="space-y-1.5">
              <Label htmlFor="dni" className="text-xs font-semibold text-slate-700">
                Usuario (DNI)
              </Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </span>
                <Input
                  id="dni"
                  type="text"
                  inputMode="numeric"
                  autoComplete="username"
                  maxLength={8}
                  placeholder="Número de DNI (8 dígitos)"
                  className="pl-9 h-11 text-sm bg-slate-50/50 border-slate-200 focus-visible:ring-[#1d6d8a] focus-visible:border-[#1d6d8a]"
                  aria-invalid={!!errors.dni}
                  {...register('dni')}
                />
              </div>
              {errors.dni && (
                <p className="text-xs text-destructive font-medium">{errors.dni.message}</p>
              )}
            </div>

            {/* Campo Contraseña */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                Contraseña
              </Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </span>
                <Input
                  id="password"
                  type={mostrarPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pl-9 pr-10 h-11 text-sm bg-slate-50/50 border-slate-200 focus-visible:ring-[#1d6d8a] focus-visible:border-[#1d6d8a]"
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
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive font-medium">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Alerta de Error General */}
            {errors.root && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive font-medium"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errors.root.message}</span>
              </div>
            )}

            {/* Botón de Ingreso */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 bg-[#1d6d8a] hover:bg-[#15546b] text-white font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Ingresando...</span>
              ) : (
                <>
                  <span>Ingresar</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Enlaces y Ayuda */}
          <div className="pt-2 space-y-4 text-center">
            <p className="text-xs text-slate-500">
              ¿Olvidaste tu contraseña? Contacta al administrador del sistema o a la OTI.
            </p>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-50 px-2 text-slate-400 text-[10px] tracking-wider">
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
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Volver al portal institucional</span>
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
