import { useState } from 'react'
import {
  AlertCircle,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { useActivarCuenta, usePrepararActivacion } from './use-admin'
import type { ServidorPadronItem } from '@/types/admin'

interface ActivarCuentaModalProps {
  open: boolean
  onClose: () => void
  servidor: ServidorPadronItem | null
}

function generarPasswordSegura(): string {
  const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let res = 'Mdsj@'
  for (let i = 0; i < 5; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return res
}

export function ActivarCuentaModal({
  open,
  onClose,
  servidor,
}: ActivarCuentaModalProps) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [errorLocal, setErrorLocal] = useState<string | null>(null)

  const { data: propuesta, isLoading: cargandoPropuesta, error: errorPropuesta } = usePrepararActivacion(
    servidor?.id ?? null
  )

  const activarMutation = useActivarCuenta()

  if (!open || !servidor) return null

  const tieneCuenta = servidor.cuenta !== null || propuesta?.tiene_cuenta

  const handleGenerarPassword = () => {
    const nueva = generarPasswordSegura()
    setPassword(nueva)
    setConfirmPassword(nueva)
    setErrorLocal(null)
    toast.info('Contraseña aleatoria generada')
  }

  const handleCopiarPassword = () => {
    if (!password) return
    navigator.clipboard.writeText(password)
    toast.success('Contraseña copiada al portapapeles')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (tieneCuenta) return

    if (password.length < 8) {
      setErrorLocal('La contraseña debe tener como mínimo 8 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setErrorLocal('Las contraseñas ingresadas no coinciden.')
      return
    }

    setErrorLocal(null)
    activarMutation.mutate(
      {
        servidorId: servidor.id,
        payload: { password },
      },
      {
        onSuccess: () => {
          setPassword('')
          setConfirmPassword('')
          onClose()
        },
      }
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="relative w-full max-w-lg border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Activación de Cuenta Institucional
              </h2>
              <p className="text-xs text-muted-foreground">
                Habilitación de acceso al Sistema de Transferencia
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {/* Ficha Resumen del Servidor */}
          <div className="rounded-lg border bg-muted/30 p-3.5 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-foreground">
                {servidor.nombres} {servidor.apellidos}
              </span>
              <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
                DNI {servidor.dni}
              </span>
            </div>
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Cargo: </span>
              {servidor.cargo || 'Servidor Municipal'}
            </p>
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Dependencia: </span>
              {servidor.dependencia
                ? `${servidor.dependencia.codigo} - ${servidor.dependencia.nombre}`
                : 'Sin centro de costo asignado'}
            </p>
          </div>

          {/* Estado de Cuenta Previa */}
          {tieneCuenta ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-700 dark:text-amber-400">
              <div className="flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Cuenta Previamente Habilitada</span>
                  <p className="mt-0.5 text-muted-foreground">
                    Este servidor público ya posee un usuario activo vinculado a su DNI. Las credenciales están operativas.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Propuesta de Roles a Asignar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Roles y Ámbitos Asignados por Directiva
                  </Label>
                  {cargandoPropuesta && <Spinner className="h-3.5 w-3.5 text-primary" />}
                </div>

                {errorPropuesta ? (
                  <p className="rounded bg-destructive/10 p-2 text-xs text-destructive">
                    No se pudo calcular la propuesta de roles automática.
                  </p>
                ) : propuesta ? (
                  <div className="space-y-1.5">
                    {propuesta.roles.map((rolItem, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2 text-xs"
                      >
                        <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                            {rolItem.etiqueta}
                          </span>
                          {rolItem.dependencia && (
                            <span className="block text-[11px] text-muted-foreground">
                              Ámbito: {rolItem.dependencia}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Formulario de Contraseña */}
              <div className="space-y-3 border-t pt-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password-field" className="text-xs font-medium">
                    Contraseña Inicial de Acceso <span className="text-destructive">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerarPassword}
                    className="h-6 gap-1 text-[11px] text-primary"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Generar aleatoria
                  </Button>
                </div>

                <div className="relative">
                  <Input
                    id="password-field"
                    type={mostrarPassword ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setErrorLocal(null)
                    }}
                    className="text-xs pr-16"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {password && (
                      <button
                        type="button"
                        onClick={handleCopiarPassword}
                        className="p-1 text-muted-foreground hover:text-foreground"
                        title="Copiar contraseña"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setMostrarPassword(!mostrarPassword)}
                      className="p-1 text-muted-foreground hover:text-foreground"
                    >
                      {mostrarPassword ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="confirm-field" className="text-xs font-medium">
                    Confirmar Contraseña <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="confirm-field"
                    type={mostrarPassword ? 'text' : 'password'}
                    placeholder="Repita la contraseña"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      setErrorLocal(null)
                    }}
                    className="text-xs"
                  />
                </div>

                {errorLocal && (
                  <p className="flex items-center gap-1.5 text-xs text-destructive">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {errorLocal}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Acciones */}
          <div className="flex items-center justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={activarMutation.isPending}
            >
              Cerrar
            </Button>
            {!tieneCuenta && (
              <Button
                type="submit"
                size="sm"
                className="gap-2"
                disabled={activarMutation.isPending || !password || password.length < 8}
              >
                {activarMutation.isPending ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    Activando Cuenta...
                  </>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4" />
                    Activar Cuenta de Acceso
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  )
}
