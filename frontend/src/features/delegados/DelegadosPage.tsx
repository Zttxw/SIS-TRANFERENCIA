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
import { Input } from '@/components/ui/input'
import { notificarError } from '@/lib/api-errors'
import { listarDependencias } from '@/features/organization/dependencias.service'
import { delegadosService, type CuentaDelegado, type DesignacionDelegado } from './delegados.service'
import { ImportarCoordinadoresDialog } from './ImportarCoordinadoresDialog'
import { ReemplazarCoordinadorDialog } from './ReemplazarCoordinadorDialog'

const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('es-PE') : '—')

export function DelegadosPage() {
  const permitido = usePermiso('delegados.gestionar')
  const confirmar = useConfirm()
  const cliente = useQueryClient()
  const [abierto, setAbierto] = useState(false)
  const [altaAbierta, setAltaAbierta] = useState(false)
  const [dniNuevo, setDniNuevo] = useState('')
  const [nombreNuevo, setNombreNuevo] = useState('')
  const [correoNuevo, setCorreoNuevo] = useState('')
  const [celularNuevo, setCelularNuevo] = useState('')
  const [vista, setVista] = useState<'vigentes' | 'historial'>('vigentes')
  const [importarAbierto, setImportarAbierto] = useState(false)
  const [aReemplazar, setAReemplazar] = useState<DesignacionDelegado | null>(null)
  const [claveNueva, setClaveNueva] = useState('')
  const [dependenciaNueva, setDependenciaNueva] = useState<number | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const buscar = useDeferredValue(busqueda)
  const [cuenta, setCuenta] = useState<CuentaDelegado | null>(null)
  const [dependencia, setDependencia] = useState<number | null>(null)
  const consulta = useQuery({
    queryKey: ['delegados'],
    queryFn: delegadosService.listar,
    enabled: permitido,
  })
  const historial = useQuery({
    queryKey: ['delegados', 'historial'],
    queryFn: delegadosService.historial,
    enabled: permitido && vista === 'historial',
  })
  const descargar = useMutation({
    mutationFn: (accion: () => Promise<void>) => accion(),
    onError: (error) => notificarError(error),
  })
  const catalogo = useQuery({
    queryKey: ['dependencias', 'catalogo'],
    queryFn: () => listarDependencias(),
    enabled: permitido && (abierto || altaAbierta),
  })
  const candidatos = useQuery({
    queryKey: ['delegados', 'candidatos', buscar],
    queryFn: () => delegadosService.candidatos(buscar),
    enabled: permitido && abierto,
  })
  const opcionesCentros = (catalogo.data ?? []).map((d) => ({
    value: d.id,
    label: `${d.codigo} · ${d.nombre}`,
    descripcion: `Nivel ${d.nivel}`,
  }))
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
      toast.success('Coordinador ETTE acreditado.')
    },
    onError: (error) => notificarError(error),
  })
  const crearExterno = useMutation({
    mutationFn: () => delegadosService.crearExterno({
      dni: dniNuevo, name: nombreNuevo.trim(), email: correoNuevo.trim() || undefined, celular: celularNuevo.trim() || undefined,
      password: claveNueva, dependencia_id: dependenciaNueva!,
    }),
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: ['delegados'] })
      setAltaAbierta(false)
      setDniNuevo(''); setNombreNuevo(''); setCorreoNuevo(''); setCelularNuevo(''); setClaveNueva(''); setDependenciaNueva(null)
      toast.success('Cuenta externa creada y acreditada.')
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
        Su perfil requiere permiso para gestionar coordinadores ETTE.
      </p>
    )

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Coordinadores ETTE</h1>
          <p className="text-sm text-muted-foreground">Un coordinador por centro de costo del Anexo 01. Revisa, observa, verifica y firma el lado ETTE.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" loading={descargar.isPending} onClick={() => descargar.mutate(delegadosService.descargarRelacion)}>Relación (PDF)</Button>
          <Button variant="outline" onClick={() => setImportarAbierto(true)}>Importar Excel</Button>
          <Button variant="outline" onClick={() => setAltaAbierta(true)}>Crear cuenta externa</Button>
          <Button
            onClick={() => {
              setCuenta(null)
              setDependencia(null)
              setBusqueda('')
              guardar.reset()
              setAbierto(true)
            }}
          >
            Acreditar coordinador
          </Button>
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant={vista === 'vigentes' ? 'default' : 'outline'} onClick={() => setVista('vigentes')}>Vigentes</Button>
        <Button size="sm" variant={vista === 'historial' ? 'default' : 'outline'} onClick={() => setVista('historial')}>Revocados y reemplazados</Button>
      </div>
      {vista === 'historial' ? (
        <DataTable
          filas={historial.data}
          loading={historial.isLoading}
          error={historial.error}
          onReintentar={() => void historial.refetch()}
          rowKey={(item) => item.id}
          vacio={{ titulo: 'Aún no hay designaciones revocadas ni reemplazadas' }}
          columnas={[
            { id: 'nombre', header: 'Coordinador', cell: (item) => item.usuario.name },
            { id: 'dni', header: 'DNI', cell: (item) => item.usuario.dni },
            { id: 'cc', header: 'Centro de costo', cell: (item) => `${item.dependencia.codigo} · ${item.dependencia.nombre}` },
            { id: 'acreditado', header: 'Acreditado', cell: (item) => fecha(item.acreditada_en) },
            { id: 'revocado', header: 'Sin efecto desde', cell: (item) => `${fecha(item.revocada_en)}${item.revocada_por ? ` · ${item.revocada_por.name}` : ''}` },
          ]}
        />
      ) : (
      <DataTable
        filas={consulta.data}
        loading={consulta.isLoading}
        error={consulta.error}
        onReintentar={() => void consulta.refetch()}
        rowKey={(item) => item.id}
        vacio={{ titulo: 'El proceso todavía no tiene coordinadores acreditados' }}
        columnas={[
          {
            id: 'nombre',
            header: 'Coordinador',
            cell: (item) => (
              <div>
                <p>{item.usuario.name}</p>
                {item.reemplaza_a && (
                  <p className="text-xs text-muted-foreground">Reemplaza a {item.reemplaza_a.usuario?.name}</p>
                )}
              </div>
            ),
          },
          { id: 'dni', header: 'DNI', cell: (item) => item.usuario.dni },
          {
            id: 'contacto',
            header: 'Contacto',
            cell: (item) => [item.usuario.email, item.usuario.celular].filter(Boolean).join(' · ') || '—',
          },
          {
            id: 'dependencia',
            header: 'Centro de costo',
            cell: (item) =>
              `${item.dependencia.codigo} · ${item.dependencia.nombre}`,
          },
          {
            id: 'acreditado',
            header: 'Acreditado',
            cell: (item) => `${fecha(item.acreditada_en)}${item.acreditada_por ? ` · ${item.acreditada_por.name}` : ''}`,
          },
          {
            id: 'acciones',
            header: 'Acciones',
            cell: (item) => (
              <div className="flex flex-wrap gap-1.5">
              <Button variant="outline" size="sm" onClick={() => setAReemplazar(item)}>
                Reemplazar
              </Button>
              {item.reemplaza_a_id !== null && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={descargar.isPending}
                  onClick={() => descargar.mutate(() => delegadosService.descargarConstancia(item.id))}
                >
                  Constancia
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={revocar.isPending}
                onClick={async () => {
                  if (
                    await confirmar({
                      title: 'Revocar coordinador ETTE',
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
              </div>
            ),
          },
        ]}
      />
      )}
      <ImportarCoordinadoresDialog open={importarAbierto} onClose={() => setImportarAbierto(false)} />
      <ReemplazarCoordinadorDialog designacion={aReemplazar} onClose={() => setAReemplazar(null)} />
      <Dialog
        open={abierto}
        onClose={() => {
          if (!guardar.isPending) setAbierto(false)
        }}
        title="Acreditar coordinador ETTE"
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
            <Label htmlFor="delegado-dependencia">Centro de costo (Anexo 01)</Label>
            <Combobox
              id="delegado-dependencia"
              value={dependencia}
              onChange={setDependencia}
              loading={catalogo.isLoading}
              options={opcionesCentros}
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
              Acreditar
            </Button>
          </div>
        </form>
      </Dialog>
      <Dialog open={altaAbierta} onClose={() => { if (!crearExterno.isPending) setAltaAbierta(false) }} title="Crear coordinador ETTE externo">
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); if (dependenciaNueva) crearExterno.mutate() }}>
          <p className="text-sm text-muted-foreground">La cuenta se acreditará como coordinador ETTE del centro de costo seleccionado.</p>
          <Label htmlFor="externo-dni">DNI</Label>
          <Input id="externo-dni" value={dniNuevo} onChange={(event) => setDniNuevo(event.target.value.replace(/\D/g, ''))} maxLength={8} required />
          <Label htmlFor="externo-nombre">Nombre completo</Label>
          <Input id="externo-nombre" value={nombreNuevo} onChange={(event) => setNombreNuevo(event.target.value)} required />
          <Label htmlFor="externo-correo">Correo (opcional)</Label>
          <Input id="externo-correo" type="email" value={correoNuevo} onChange={(event) => setCorreoNuevo(event.target.value)} />
          <Label htmlFor="externo-celular">Celular (opcional)</Label>
          <Input id="externo-celular" value={celularNuevo} onChange={(event) => setCelularNuevo(event.target.value)} maxLength={20} />
          <Label htmlFor="externo-clave">Contraseña inicial</Label>
          <Input id="externo-clave" type="password" value={claveNueva} onChange={(event) => setClaveNueva(event.target.value)} minLength={8} required />
          <Label htmlFor="externo-dependencia">Centro de costo (Anexo 01)</Label>
          <Combobox id="externo-dependencia" value={dependenciaNueva} onChange={setDependenciaNueva} loading={catalogo.isLoading} options={opcionesCentros} />
          <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setAltaAbierta(false)}>Cancelar</Button><Button type="submit" loading={crearExterno.isPending} disabled={!/^[0-9]{8}$/.test(dniNuevo) || !nombreNuevo.trim() || claveNueva.length < 8 || !dependenciaNueva}>Crear y acreditar</Button></div>
        </form>
      </Dialog>
    </div>
  )
}
