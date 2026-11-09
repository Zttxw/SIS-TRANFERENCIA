import { useMemo, useState } from 'react'
import {
  Building2,
  CheckCircle2,
  Clock,
  KeyRound,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserCog,
  Users,
  X,
} from 'lucide-react'

import { usePermiso } from '@/auth/hooks'
import { PERMISOS } from '@/auth/permisos'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Spinner } from '@/components/ui/spinner'
import { ActivarCuentaModal } from './ActivarCuentaModal'
import { useServidores } from './use-admin'
import type { ServidorPadronItem } from '@/types/admin'

export function AdminPage() {
  const puedeGestionarUsuarios = usePermiso(PERMISOS.GestionarUsuarios)

  const [buscar, setBuscar] = useState('')
  const [pagina, setPagina] = useState(1)
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'con_cuenta' | 'sin_cuenta'>('todos')
  const [servidorParaActivar, setServidorParaActivar] = useState<ServidorPadronItem | null>(null)

  const { data: servidoresData, isLoading, error } = useServidores({
    buscar,
    page: pagina,
  })

  // Manejo de búsqueda y paginación
  const handleBuscar = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBuscar(e.target.value)
    setPagina(1)
  }

  const handleLimpiarBuscador = () => {
    setBuscar('')
    setPagina(1)
  }

  // Filtrado local según estado de cuenta
  const itemsServidores = servidoresData?.data
  const servidoresFiltrados = useMemo(() => {
    const list = itemsServidores ?? []
    if (filtroEstado === 'todos') return list
    if (filtroEstado === 'con_cuenta') return list.filter((s) => s.cuenta !== null)
    return list.filter((s) => s.cuenta === null)
  }, [itemsServidores, filtroEstado])

  // KPIs de la página o universo
  const totalEnPadron = servidoresData?.meta?.total ?? 0
  const cuentasActivas = (itemsServidores ?? []).filter((s) => s.cuenta !== null).length
  const cuentasPendientes = (itemsServidores ?? []).filter((s) => s.cuenta === null).length
  const totalResponsables = (itemsServidores ?? []).filter((s) => s.es_responsable).length

  // Si no cuenta con el permiso usuarios.gestionar
  if (!puedeGestionarUsuarios) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Panel de Administración Institucional
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestión de usuarios y activación de credenciales según Directiva N.° 001-2026-MDSJ/A §7.1
          </p>
        </div>

        <Card className="border-destructive/40 bg-destructive/5 p-8 text-center shadow-sm">
          <ShieldAlert className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-base font-semibold text-destructive">
            Acceso Exclusivo de Administración
          </h2>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
            El módulo de alta de usuarios, padrón de servidores y asignación de credenciales requiere el permiso{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground font-semibold">
              usuarios.gestionar
            </code>
            , reservado para la Administración del Sistema.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabecera Principal */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
              Módulo §7.1
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              Directiva N.° 001-2026-MDSJ/A
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
            Padrón de Servidores y Activación de Cuentas
          </h1>
          <p className="text-sm text-muted-foreground">
            Administración de cuentas de acceso, roles asignados y credenciales de los servidores institucionales.
          </p>
        </div>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Servidores en Padrón
            </CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalEnPadron}</div>
            <p className="text-nota text-muted-foreground">Servidores registrados en el SGD/SIGA</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-success-fg">
              Cuentas Habilitadas
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success-fg" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success-fg">
              {cuentasActivas}
            </div>
            <p className="text-nota text-muted-foreground">Con credenciales operativas</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-warning-fg">
              Cuentas Pendientes
            </CardTitle>
            <Clock className="h-4 w-4 text-warning-fg" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning-fg">
              {cuentasPendientes}
            </div>
            <p className="text-nota text-muted-foreground">Por activar en esta página</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-info-fg">
              Responsables de Despacho
            </CardTitle>
            <UserCog className="h-4 w-4 text-info-fg" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info-fg">
              {totalResponsables}
            </div>
            <p className="text-nota text-muted-foreground">Encargados de centros de costo</p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <Card className="shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Buscador */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por DNI, nombres, apellidos o cargo..."
                value={buscar}
                onChange={handleBuscar}
                className="pl-9 pr-8 text-xs"
              />
              {buscar && (
                <button
                  type="button"
                  onClick={handleLimpiarBuscador}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Toggle de Estado */}
            <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1 text-xs">
              <button
                type="button"
                onClick={() => setFiltroEstado('todos')}
                className={`rounded-md px-3 py-1 font-medium transition-colors ${
                  filtroEstado === 'todos'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Todos ({(itemsServidores ?? []).length})
              </button>
              <button
                type="button"
                onClick={() => setFiltroEstado('sin_cuenta')}
                className={`rounded-md px-3 py-1 font-medium transition-colors ${
                  filtroEstado === 'sin_cuenta'
                    ? 'bg-background text-warning-fg shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Sin Cuenta ({cuentasPendientes})
              </button>
              <button
                type="button"
                onClick={() => setFiltroEstado('con_cuenta')}
                className={`rounded-md px-3 py-1 font-medium transition-colors ${
                  filtroEstado === 'con_cuenta'
                    ? 'bg-background text-success-fg shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Con Cuenta ({cuentasActivas})
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Servidores */}
      <Card className="shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <Spinner className="h-8 w-8 text-primary" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-destructive">
            Error al consultar el padrón de servidores.
          </div>
        ) : servidoresFiltrados.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            No se encontraron servidores con los criterios de búsqueda indicados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b bg-muted/30 text-muted-foreground font-semibold">
                  <th className="py-3 px-4">Servidor Público</th>
                  <th className="py-3 px-4">DNI</th>
                  <th className="py-3 px-4">Cargo Institucional</th>
                  <th className="py-3 px-4">Centro de Costo Asignado</th>
                  <th className="py-3 px-4 text-center">Estado de Cuenta</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {servidoresFiltrados.map((servidor) => {
                  const tieneCuenta = servidor.cuenta !== null

                  return (
                    <tr
                      key={servidor.id}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      {/* Servidor */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                            {servidor.nombres.charAt(0)}
                            {servidor.apellidos.charAt(0)}
                          </div>
                          <div>
                            <span className="font-semibold text-foreground block">
                              {servidor.nombres} {servidor.apellidos}
                            </span>
                            {servidor.es_responsable && (
                              <span className="inline-flex items-center gap-1 text-mini font-semibold text-info-fg">
                                <ShieldCheck className="h-3 w-3" />
                                Responsable de Despacho
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* DNI */}
                      <td className="py-3 px-4 font-mono font-medium text-foreground">
                        {servidor.dni}
                      </td>

                      {/* Cargo */}
                      <td className="py-3 px-4 text-muted-foreground max-w-[200px] truncate">
                        {servidor.cargo || 'Servidor Municipal'}
                      </td>

                      {/* Dependencia */}
                      <td className="py-3 px-4 text-muted-foreground max-w-[240px]">
                        {servidor.dependencia ? (
                          <div className="flex items-start gap-1">
                            <Building2 className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground mt-0.5" />
                            <span className="truncate" title={servidor.dependencia.nombre}>
                              <span className="font-mono text-nota font-semibold text-foreground">
                                {servidor.dependencia.codigo}
                              </span>{' '}
                              · {servidor.dependencia.nombre}
                            </span>
                          </div>
                        ) : (
                          <span className="italic text-muted-foreground/70">Sin dependencia</span>
                        )}
                      </td>

                      {/* Estado Cuenta */}
                      <td className="py-3 px-4 text-center">
                        {tieneCuenta ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-0.5 text-nota font-semibold text-success-fg">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Activa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2.5 py-0.5 text-nota font-semibold text-warning-fg">
                            <Clock className="h-3.5 w-3.5" />
                            Sin Cuenta
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-right">
                        {tieneCuenta ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setServidorParaActivar(servidor)}
                            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            Ver Asignación
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => setServidorParaActivar(servidor)}
                            className="h-8 gap-1.5 text-xs shadow-sm"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                            Activar Cuenta
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {servidoresData?.meta && (
          <Pagination
            currentPage={servidoresData.meta.current_page}
            lastPage={servidoresData.meta.last_page}
            total={servidoresData.meta.total}
            from={servidoresData.meta.from}
            to={servidoresData.meta.to}
            onPageChange={(p) => setPagina(p)}
          />
        )}
      </Card>

      {/* Modal de Activación */}
      <ActivarCuentaModal
        open={servidorParaActivar !== null}
        onClose={() => setServidorParaActivar(null)}
        servidor={servidorParaActivar}
      />
    </div>
  )
}
