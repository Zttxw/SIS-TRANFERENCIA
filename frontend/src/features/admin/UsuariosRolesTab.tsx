import { useDeferredValue, useState } from 'react'
import { ShieldPlus, UserPlus, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pagination } from '@/components/ui/pagination'
import { Spinner } from '@/components/ui/spinner'
import { listarDependencias } from '@/features/organization/dependencias.service'
import { useQuery } from '@tanstack/react-query'
import {
  useAsignarRol,
  useCrearExterno,
  useRevocarRol,
  useRolesAsignables,
  useUsuarios,
} from './use-usuarios'
import type { CuentaUsuario } from './usuarios.service'

/** Etiquetas de rol — espejo de App\Support\Enums\Rol::etiqueta(). */
const ETIQUETA_ROL: Record<string, string> = {
  administrador: 'Administrador',
  servidor: 'Servidor público',
  responsable_equipo: 'Responsable de equipo de trabajo',
  responsable_centro_costo: 'Responsable de centro de costo',
  coordinador: 'Coordinador acreditado',
  etts: 'ETTS',
  ette: 'ETTE',
  delegado_ette: 'Delegado ETTE',
}

export function UsuariosRolesTab() {
  const [buscar, setBuscar] = useState('')
  const buscarDiferido = useDeferredValue(buscar)
  const [pagina, setPagina] = useState(1)
  const [altaAbierta, setAltaAbierta] = useState(false)
  const [cuentaRoles, setCuentaRoles] = useState<CuentaUsuario | null>(null)

  const { data, isLoading, error } = useUsuarios(buscarDiferido, pagina)
  const cuentas = data?.data ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="Buscar cuenta por DNI o nombre..."
            value={buscar}
            onChange={(e) => {
              setBuscar(e.target.value)
              setPagina(1)
            }}
            className="pr-8 text-xs"
          />
          {buscar && (
            <button
              type="button"
              onClick={() => {
                setBuscar('')
                setPagina(1)
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Button onClick={() => setAltaAbierta(true)} className="gap-1.5">
          <UserPlus className="h-4 w-4" />
          Crear usuario externo
        </Button>
      </div>

      <Card className="overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <Spinner className="h-8 w-8 text-primary" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-destructive">
            No se pudieron consultar las cuentas.
          </div>
        ) : cuentas.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            No se encontraron cuentas con los criterios indicados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b bg-muted/30 font-semibold text-muted-foreground">
                  <th className="px-4 py-3">Cuenta</th>
                  <th className="px-4 py-3">DNI</th>
                  <th className="px-4 py-3">Origen</th>
                  <th className="px-4 py-3">Roles asignados</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cuentas.map((cuenta) => (
                  <tr key={cuenta.id} className="transition-colors hover:bg-muted/20">
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {cuenta.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-foreground">
                      {cuenta.dni ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {cuenta.servidor_id ? 'Padrón SGD' : 'Externo'}
                    </td>
                    <td className="px-4 py-3">
                      {cuenta.asignaciones_rol.length === 0 ? (
                        <span className="italic text-muted-foreground/70">
                          Sin roles
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {cuenta.asignaciones_rol.map((a) => (
                            <span
                              key={a.id}
                              className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-mini font-semibold text-primary"
                              title={a.dependencia?.nombre ?? undefined}
                            >
                              {ETIQUETA_ROL[a.rol] ?? a.rol}
                              {a.dependencia ? ` · ${a.dependencia.codigo}` : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        onClick={() => setCuentaRoles(cuenta)}
                      >
                        <ShieldPlus className="h-3.5 w-3.5" />
                        Gestionar roles
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data?.meta && (
          <Pagination
            currentPage={data.meta.current_page}
            lastPage={data.meta.last_page}
            total={data.meta.total}
            from={data.meta.from}
            to={data.meta.to}
            onPageChange={setPagina}
          />
        )}
      </Card>

      <AltaExternoDialog
        open={altaAbierta}
        onClose={() => setAltaAbierta(false)}
      />
      <GestionRolesDialog
        cuenta={cuentaRoles}
        onClose={() => setCuentaRoles(null)}
      />
    </div>
  )
}

function AltaExternoDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const crear = useCrearExterno()
  const [dni, setDni] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const cerrar = () => {
    if (crear.isPending) return
    setDni('')
    setName('')
    setEmail('')
    setPassword('')
    crear.reset()
    onClose()
  }

  const valido = /^[0-9]{8,15}$/.test(dni) && name.trim() !== '' && password.length >= 8

  return (
    <Dialog open={open} onClose={cerrar} title="Crear usuario externo">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!valido) return
          crear.mutate(
            {
              dni: dni.trim(),
              name: name.trim(),
              email: email.trim() === '' ? null : email.trim(),
              password,
            },
            { onSuccess: cerrar },
          )
        }}
      >
        <p className="text-xs text-muted-foreground">
          Para miembros del ETTE o personal externo que no figura en el padrón
          del SGD. Los roles institucionales se asignan después desde «Gestionar
          roles».
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="externo-dni">DNI</Label>
          <Input
            id="externo-dni"
            value={dni}
            onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
            inputMode="numeric"
            maxLength={15}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="externo-nombre">Nombre completo</Label>
          <Input
            id="externo-nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="externo-email">Correo (opcional)</Label>
          <Input
            id="externo-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="externo-pass">Contraseña inicial</Label>
          <Input
            id="externo-pass"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-mini text-muted-foreground">Mínimo 8 caracteres.</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={cerrar}
            disabled={crear.isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={!valido} loading={crear.isPending}>
            Crear cuenta
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

function GestionRolesDialog({
  cuenta,
  onClose,
}: {
  cuenta: CuentaUsuario | null
  onClose: () => void
}) {
  const confirmar = useConfirm()
  const roles = useRolesAsignables(cuenta !== null)
  const asignar = useAsignarRol()
  const revocar = useRevocarRol()
  const [rol, setRol] = useState<string | null>(null)
  const [dependencia, setDependencia] = useState<number | null>(null)

  const catalogo = useQuery({
    queryKey: ['dependencias', 'catalogo'],
    queryFn: () => listarDependencias(),
    enabled: cuenta !== null,
  })

  const rolSel = roles.data?.find((r) => r.rol === rol) ?? null
  const requiereDep = rolSel?.requiere_dependencia ?? false
  const puedeAsignar = rol !== null && (!requiereDep || dependencia !== null)

  const cerrar = () => {
    setRol(null)
    setDependencia(null)
    asignar.reset()
    onClose()
  }

  return (
    <Dialog
      open={cuenta !== null}
      onClose={cerrar}
      title={cuenta ? `Roles de ${cuenta.name}` : 'Roles'}
    >
      {cuenta && (
        <div className="space-y-5">
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground">
              Roles actuales
            </h3>
            {cuenta.asignaciones_rol.length === 0 ? (
              <p className="text-xs italic text-muted-foreground/70">
                Esta cuenta no tiene roles asignados.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {cuenta.asignaciones_rol.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-1.5 text-xs"
                  >
                    <span>
                      <span className="font-semibold">
                        {ETIQUETA_ROL[a.rol] ?? a.rol}
                      </span>
                      {a.dependencia && (
                        <span className="text-muted-foreground">
                          {' · '}
                          {a.dependencia.codigo} · {a.dependencia.nombre}
                        </span>
                      )}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7"
                      disabled={revocar.isPending}
                      onClick={async () => {
                        if (
                          await confirmar({
                            title: 'Revocar rol',
                            description: `${ETIQUETA_ROL[a.rol] ?? a.rol} · ${cuenta.name}`,
                            confirmText: 'Revocar',
                            variant: 'destructive',
                          })
                        )
                          revocar.mutate(a.id)
                      }}
                    >
                      Revocar
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form
            className="space-y-3 border-t pt-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (!puedeAsignar) return
              asignar.mutate(
                {
                  userId: cuenta.id,
                  rol: rol!,
                  dependencia_id: requiereDep ? dependencia : null,
                },
                {
                  onSuccess: () => {
                    setRol(null)
                    setDependencia(null)
                  },
                },
              )
            }}
          >
            <h3 className="text-xs font-semibold text-muted-foreground">
              Asignar nuevo rol
            </h3>
            <div className="space-y-1.5">
              <Label htmlFor="asignar-rol">Rol</Label>
              <Combobox
                id="asignar-rol"
                value={rol}
                loading={roles.isLoading}
                onChange={(v) => {
                  setRol(v)
                  setDependencia(null)
                }}
                options={(roles.data ?? []).map((r) => ({
                  value: r.rol,
                  label: r.etiqueta,
                }))}
              />
            </div>
            {requiereDep && (
              <div className="space-y-1.5">
                <Label htmlFor="asignar-dependencia">Dependencia del ámbito</Label>
                <Combobox
                  id="asignar-dependencia"
                  value={dependencia}
                  loading={catalogo.isLoading}
                  onChange={setDependencia}
                  options={(catalogo.data ?? []).map((d) => ({
                    value: d.id,
                    label: d.nombre,
                    descripcion: d.codigo,
                  }))}
                />
              </div>
            )}
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={!puedeAsignar}
                loading={asignar.isPending}
              >
                Asignar rol
              </Button>
            </div>
          </form>
        </div>
      )}
    </Dialog>
  )
}
