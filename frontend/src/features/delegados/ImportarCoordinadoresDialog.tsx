import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Download, FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { notificarError } from '@/lib/api-errors'
import {
  delegadosService,
  type AccionImportacion,
  type ResultadoImportacion,
} from './delegados.service'

const ETIQUETA_ACCION: Record<AccionImportacion, string> = {
  crear_usuario: 'Crear cuenta y asignar',
  asignar: 'Asignar',
  ya_asignado: 'Ya asignado',
  error: 'Error',
}

const VARIANTE_ACCION: Record<AccionImportacion, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  crear_usuario: 'default',
  asignar: 'default',
  ya_asignado: 'secondary',
  error: 'destructive',
}

interface Props {
  open: boolean
  onClose: () => void
}

/**
 * Carga de coordinadores ETTE por plantilla Excel (D-10): previsualiza fila por
 * fila y, al confirmar, aplica solo las filas válidas.
 */
export function ImportarCoordinadoresDialog({ open, onClose }: Props) {
  const cliente = useQueryClient()
  const [archivo, setArchivo] = useState<File | null>(null)
  const [previa, setPrevia] = useState<ResultadoImportacion | null>(null)
  const [aplicado, setAplicado] = useState<ResultadoImportacion | null>(null)

  const previsualizar = useMutation({
    mutationFn: (file: File) => delegadosService.importar(file, 'previsualizar'),
    onSuccess: setPrevia,
    onError: (error) => notificarError(error),
  })
  const confirmar = useMutation({
    mutationFn: (file: File) => delegadosService.importar(file, 'confirmar'),
    onSuccess: async (resultado) => {
      setAplicado(resultado)
      await cliente.invalidateQueries({ queryKey: ['delegados'] })
      toast.success('Importación aplicada.')
    },
    onError: (error) => notificarError(error),
  })
  const plantilla = useMutation({
    mutationFn: delegadosService.descargarPlantilla,
    onError: (error) => notificarError(error),
  })

  const cerrar = () => {
    if (confirmar.isPending) return
    setArchivo(null)
    setPrevia(null)
    setAplicado(null)
    previsualizar.reset()
    confirmar.reset()
    onClose()
  }

  const resultado = aplicado ?? previa
  const aplicables = previa ? previa.resumen.crear_usuario + previa.resumen.asignar : 0

  return (
    <Dialog
      open={open}
      onClose={cerrar}
      anchoClassName="max-w-5xl"
      title="Importar coordinadores ETTE desde Excel"
      description="Complete la plantilla (una fila por coordinador y centro de costo), revise la previsualización y confirme. Solo se aplican las filas válidas."
    >
      <div className="space-y-4">
        {!aplicado && (
          <div className="flex flex-wrap items-end gap-3">
            <Button variant="outline" onClick={() => plantilla.mutate()} loading={plantilla.isPending}>
              <Download className="h-4 w-4" /> Descargar plantilla
            </Button>
            <div className="min-w-64 flex-1 space-y-1.5">
              <Label htmlFor="importar-archivo">Archivo .xlsx</Label>
              <Input
                id="importar-archivo"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  setArchivo(e.target.files?.[0] ?? null)
                  setPrevia(null)
                }}
              />
            </div>
            <Button
              disabled={!archivo}
              loading={previsualizar.isPending}
              onClick={() => archivo && previsualizar.mutate(archivo)}
            >
              <FileSpreadsheet className="h-4 w-4" /> Previsualizar
            </Button>
          </div>
        )}

        {resultado && (
          <>
            <div className="flex flex-wrap gap-2 text-xs">
              {(Object.keys(ETIQUETA_ACCION) as AccionImportacion[]).map((accion) => (
                <Badge key={accion} variant={VARIANTE_ACCION[accion]}>
                  {ETIQUETA_ACCION[accion]}: {resultado.resumen[accion]}
                </Badge>
              ))}
            </div>
            <div className="max-h-80 overflow-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted text-left">
                  <tr>
                    <th className="px-2 py-1.5">Fila</th>
                    <th className="px-2 py-1.5">DNI</th>
                    <th className="px-2 py-1.5">Nombre</th>
                    <th className="px-2 py-1.5">Centro de costo</th>
                    <th className="px-2 py-1.5">Resultado</th>
                    <th className="px-2 py-1.5">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.resultados.map((fila) => (
                    <tr key={fila.fila} className="border-t align-top">
                      <td className="px-2 py-1.5">{fila.fila}</td>
                      <td className="px-2 py-1.5 font-mono">{fila.dni}</td>
                      <td className="px-2 py-1.5">{fila.nombre || '—'}</td>
                      <td className="px-2 py-1.5">
                        <span className="font-mono">{fila.codigo_cc}</span>
                        {fila.centro_costo ? ` · ${fila.centro_costo}` : ''}
                      </td>
                      <td className="px-2 py-1.5">
                        <Badge variant={VARIANTE_ACCION[fila.accion]}>{ETIQUETA_ACCION[fila.accion]}</Badge>
                      </td>
                      <td className="px-2 py-1.5">
                        {fila.motivo && <p className="text-danger-fg">{fila.motivo}</p>}
                        {fila.avisos.map((aviso) => (
                          <p key={aviso} className="text-warning-fg">{aviso}</p>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {aplicado && (aplicado.credenciales?.length ?? 0) > 0 && (
          <div className="space-y-2 rounded-lg border border-warning-border bg-warning-soft/50 p-3 text-xs">
            <p className="font-medium text-warning-fg">
              Contraseñas temporales de las cuentas creadas. Se muestran solo esta vez: entréguelas a cada coordinador.
            </p>
            <table className="w-full">
              <tbody>
                {aplicado.credenciales!.map((c) => (
                  <tr key={c.dni}>
                    <td className="py-0.5 pr-3 font-mono">{c.dni}</td>
                    <td className="py-0.5 pr-3">{c.nombre}</td>
                    <td className="py-0.5 font-mono select-all">{c.password}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t pt-3">
          <Button variant="outline" onClick={cerrar} disabled={confirmar.isPending}>
            {aplicado ? 'Cerrar' : 'Cancelar'}
          </Button>
          {previa && !aplicado && (
            <Button
              disabled={aplicables === 0 || !archivo}
              loading={confirmar.isPending}
              onClick={() => archivo && confirmar.mutate(archivo)}
            >
              Aplicar {aplicables} {aplicables === 1 ? 'fila válida' : 'filas válidas'}
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  )
}
