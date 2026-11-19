import { useDeferredValue, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { notificarError } from '@/lib/api-errors'
import { delegadosService, type CuentaDelegado, type DesignacionDelegado } from './delegados.service'

interface Props {
  designacion: DesignacionDelegado | null
  onClose: () => void
}

/**
 * Reemplazo de coordinador ETTE (RF-15, F-12): revoca la designación actual,
 * acredita al nuevo en el mismo CC y genera la constancia. No cambia plazos.
 */
export function ReemplazarCoordinadorDialog({ designacion, onClose }: Props) {
  const cliente = useQueryClient()
  const [modo, setModo] = useState<'existente' | 'externa'>('existente')
  const [busqueda, setBusqueda] = useState('')
  const buscar = useDeferredValue(busqueda)
  const [cuenta, setCuenta] = useState<CuentaDelegado | null>(null)
  const [motivo, setMotivo] = useState('')
  const [dni, setDni] = useState('')
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [celular, setCelular] = useState('')
  const [clave, setClave] = useState('')

  const candidatos = useQuery({
    queryKey: ['delegados', 'candidatos', buscar],
    queryFn: () => delegadosService.candidatos(buscar),
    enabled: designacion !== null && modo === 'existente',
  })
  const cuentas = (candidatos.data ?? []).filter((c) => c.id !== designacion?.usuario.id)
  const opciones = cuenta && !cuentas.some((c) => c.id === cuenta.id) ? [cuenta, ...cuentas] : cuentas

  const reemplazar = useMutation({
    mutationFn: () =>
      delegadosService.reemplazar(designacion!.id, {
        motivo: motivo.trim(),
        ...(modo === 'existente'
          ? { user_id: cuenta!.id }
          : {
              nuevo: {
                dni,
                name: nombre.trim(),
                email: correo.trim() || undefined,
                celular: celular.trim() || undefined,
                password: clave,
              },
            }),
      }),
    onSuccess: async (nueva) => {
      await cliente.invalidateQueries({ queryKey: ['delegados'] })
      toast.success('Coordinador reemplazado.', {
        action: { label: 'Descargar constancia', onClick: () => void delegadosService.descargarConstancia(nueva.id) },
      })
      cerrar()
    },
    onError: (error) => notificarError(error),
  })

  const cerrar = () => {
    setModo('existente')
    setCuenta(null)
    setBusqueda('')
    setMotivo('')
    setDni('')
    setNombre('')
    setCorreo('')
    setCelular('')
    setClave('')
    onClose()
  }

  const nuevoValido =
    modo === 'existente' ? cuenta !== null : /^[0-9]{8}$/.test(dni) && nombre.trim() !== '' && clave.length >= 8

  return (
    <Dialog
      open={designacion !== null}
      onClose={() => !reemplazar.isPending && cerrar()}
      title="Reemplazar coordinador ETTE"
      description={
        designacion
          ? `${designacion.dependencia.codigo} · ${designacion.dependencia.nombre} — actual: ${designacion.usuario.name}. Las firmas y observaciones ya hechas se conservan y los plazos no cambian.`
          : undefined
      }
    >
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (nuevoValido && motivo.trim().length >= 5) reemplazar.mutate()
        }}
      >
        <div className="flex gap-2 text-sm">
          <Button type="button" size="sm" variant={modo === 'existente' ? 'default' : 'outline'} onClick={() => setModo('existente')}>
            Cuenta existente
          </Button>
          <Button type="button" size="sm" variant={modo === 'externa' ? 'default' : 'outline'} onClick={() => setModo('externa')}>
            Cuenta externa nueva
          </Button>
        </div>

        {modo === 'existente' ? (
          <div className="space-y-1.5">
            <Label htmlFor="reemplazo-cuenta">Nuevo coordinador</Label>
            <Combobox
              id="reemplazo-cuenta"
              value={cuenta?.id}
              onBuscar={setBusqueda}
              loading={candidatos.isFetching}
              onChange={(id) => setCuenta(opciones.find((c) => c.id === id) ?? null)}
              options={opciones.map((c) => ({ value: c.id, label: c.name, descripcion: c.dni }))}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="reemplazo-dni">DNI</Label>
              <Input id="reemplazo-dni" value={dni} maxLength={8} onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reemplazo-nombre">Nombres y apellidos</Label>
              <Input id="reemplazo-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reemplazo-correo">Correo (opcional)</Label>
              <Input id="reemplazo-correo" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reemplazo-celular">Celular (opcional)</Label>
              <Input id="reemplazo-celular" value={celular} onChange={(e) => setCelular(e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="reemplazo-clave">Contraseña inicial</Label>
              <Input id="reemplazo-clave" type="password" minLength={8} value={clave} onChange={(e) => setClave(e.target.value)} />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="reemplazo-motivo">Motivo del reemplazo *</Label>
          <Textarea id="reemplazo-motivo" rows={3} maxLength={500} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        </div>

        <div className="flex justify-end gap-2 border-t pt-3">
          <Button type="button" variant="outline" onClick={cerrar} disabled={reemplazar.isPending}>
            Cancelar
          </Button>
          <Button type="submit" loading={reemplazar.isPending} disabled={!nuevoValido || motivo.trim().length < 5}>
            Reemplazar y generar constancia
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
