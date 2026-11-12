import { useDeferredValue, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { usePermiso } from '@/auth/hooks'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { DataTable } from '@/components/ui/data-table'
import { Dialog } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { notificarError } from '@/lib/api-errors'
import { listarDependencias } from '@/features/organization/dependencias.service'
import { delegadosService, type CuentaDelegado } from './delegados.service'

export function DelegadosPage() {
  const permitido = usePermiso('delegados.gestionar')
  const confirmar = useConfirm()
  const cliente = useQueryClient()
  const [abierto, setAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const buscar = useDeferredValue(busqueda)
  const [cuenta, setCuenta] = useState<CuentaDelegado | null>(null)
  const [dependencia, setDependencia] = useState<number | null>(null)
  const consulta = useQuery({
    queryKey: ['delegados'],
    queryFn: delegadosService.listar,
    enabled: permitido,
  })
  const catalogo = useQuery({
    queryKey: ['dependencias', 'catalogo'],
    queryFn: () => listarDependencias(),
    enabled: permitido && abierto,
  })
  const candidatos = useQuery({
    queryKey: ['delegados', 'candidatos', buscar],
    queryFn: () => delegadosService.candidatos(buscar),
    enabled: permitido && abierto,
  })
  const cuentas = candidatos.data ?? []
  const opcionesCuentas =
    cuenta && !cuentas.some((item) => item.id === cuenta.id)
      ? [cuenta, ...cuentas]
      : cuentas

  const guardar = useMutation({
    mutationFn: () =>
      delegadosService.designar({
        user_id: cuenta!.id,
        dependencia_id: dependencia!,
      }),
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: ['delegados'] })
      setAbierto(false)
      toast.success('Delegado ETTE designado.')
    },
    onError: (error) => notificarError(error),
  })
  const revocar = useMutation({
    mutationFn: delegadosService.revocar,
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: ['delegados'] })
      toast.success('Designación revocada.')
    },
    onError: (error) => notificarError(error),
  })

  if (!permitido)
    return (
      <p role="alert">
        Su perfil requiere permiso para gestionar delegados ETTE.
      </p>
    )

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Delegados ETTE</h1>
        <Button
          onClick={() => {
            setCuenta(null)
            setDependencia(null)
            setBusqueda('')
            guardar.reset()
            setAbierto(true)
          }}
        >
          Designar delegado
        </Button>
      </div>
      <DataTable
        filas={consulta.data}
        loading={consulta.isLoading}
        error={consulta.error}
        onReintentar={() => void consulta.refetch()}
        rowKey={(item) => item.id}
        vacio={{ titulo: 'El proceso todavía no tiene delegados designados' }}
        columnas={[
          {
            id: 'nombre',
            header: 'Delegado',
            cell: (item) => item.usuario.name,
          },
          { id: 'dni', header: 'DNI', cell: (item) => item.usuario.dni },
          {
            id: 'dependencia',
            header: 'Dependencia exacta',
            cell: (item) =>
              `${item.dependencia.codigo} · ${item.dependencia.nombre}`,
          },
          {
            id: 'acciones',
            header: 'Acciones',
            cell: (item) => (
              <Button
                variant="outline"
                size="sm"
                disabled={revocar.isPending}
                onClick={async () => {
                  if (
                    await confirmar({
                      title: 'Revocar designación',
                      description: `${item.usuario.name} · ${item.dependencia.nombre}`,
                      confirmText: 'Revocar',
                      variant: 'destructive',
                    })
                  )
                    revocar.mutate(item.id)
                }}
              >
                Revocar
              </Button>
            ),
          },
        ]}
      />
      <Dialog
        open={abierto}
        onClose={() => {
          if (!guardar.isPending) setAbierto(false)
        }}
        title="Designar delegado ETTE"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (cuenta && dependencia) guardar.mutate()
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="delegado-cuenta">Cuenta del padrón</Label>
            <Combobox
              id="delegado-cuenta"
              value={cuenta?.id}
              onBuscar={setBusqueda}
              loading={candidatos.isFetching}
              onChange={(id) =>
                setCuenta(
                  opcionesCuentas.find((item) => item.id === id) ?? null,
                )
              }
              options={opcionesCuentas.map((item) => ({
                value: item.id,
                label: item.name,
                descripcion: item.dni,
              }))}
            />
            {candidatos.isError && (
              <p className="text-xs text-danger-fg">
                No se pudieron consultar las cuentas.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="delegado-dependencia">Dependencia</Label>
            <Combobox
              id="delegado-dependencia"
              value={dependencia}
              onChange={setDependencia}
              loading={catalogo.isLoading}
              options={(catalogo.data ?? []).map((d) => ({
                value: d.id,
                label: d.nombre,
                descripcion: d.codigo,
              }))}
            />
            {catalogo.isError && (
              <p className="text-xs text-danger-fg">
                No se pudo consultar el catálogo de dependencias.
              </p>
            )}
          </div>
          {guardar.error && (
            <p role="alert" className="text-sm text-danger-fg">
              {guardar.error.message}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAbierto(false)}
              disabled={guardar.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!cuenta || !dependencia}
              loading={guardar.isPending}
            >
              Designar
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
