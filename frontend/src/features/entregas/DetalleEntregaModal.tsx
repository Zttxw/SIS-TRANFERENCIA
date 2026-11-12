import {
  Archive,
  Building2,
  ClipboardList,
  Package,
  PackageOpen,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

import { useDependenciaActiva } from '@/auth/hooks'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import type { DependenciaResumen } from '@/types/transferencia'
import { useEstadoEntrega } from './use-entregas'
import { DocumentoFirmaDetalle } from '@/features/firmaperu/DocumentoFirmaDetalle'
import type { TipoDocumentoFirma } from '@/features/firmaperu/firmaperu.types'

interface DetalleEntregaModalProps {
  dependencia: DependenciaResumen | null
  open: boolean
  onClose: () => void
}

export function DetalleEntregaModal({
  dependencia,
  open,
  onClose,
}: DetalleEntregaModalProps) {
  const { setDependenciaId } = useDependenciaActiva()
  const { data: estado, isLoading, isError } = useEstadoEntrega(dependencia?.id)

  if (!dependencia) return null

  const handleSeleccionarComoActiva = () => {
    setDependenciaId(dependencia.id)
    toast.success(`Centro de costo activo: ${dependencia.codigo} · ${dependencia.nombre}`)
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`${dependencia.codigo} · ${dependencia.nombre}`}
      description="Resumen cuantitativo institucional de los 6 anexos de la transferencia."
    >
      <div className="max-h-[70vh] space-y-4 overflow-y-auto py-1 pr-1">
        {isLoading ? (
          <div className="py-8 text-center">
            <Spinner className="mx-auto h-6 w-6 text-primary" />
            <p className="mt-2 text-xs text-muted-foreground">Consultando estado de entrega...</p>
          </div>
        ) : isError || !estado ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-center text-xs text-destructive">
            No se pudo obtener el estado de entrega para esta dependencia.
          </div>
        ) : (
          <>
            {/* Banner de Estado de Entrega */}
            <div className="rounded-lg border bg-muted/40 p-3 flex items-center justify-between">
              <div>
                <span className="text-nota font-medium text-muted-foreground block">
                  Estado de Entrega Jerárquica
                </span>
                <span className="font-semibold text-sm capitalize">
                  {estado.entrega?.estado ?? 'Borrador (Sin remitir)'}
                </span>
              </div>
              {estado.entrega?.hacia_etts && (
                <span className="text-nota font-semibold text-primary bg-primary/10 rounded-full px-2.5 py-0.5">
                  Destino: ETTS Institucional
                </span>
              )}
            </div>

            {/* Cuadrícula de Anexos */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Anexo 02 Gestión */}
              <div className="rounded-md border p-2.5 bg-background">
                <div className="flex items-center gap-1.5 font-medium text-muted-foreground mb-1">
                  <ClipboardList className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Anexo 02 · Gestión</span>
                </div>
                <div className="font-semibold text-foreground">
                  {estado.anexo02_gestion.existe
                    ? `Registrado (${estado.anexo02_gestion.estado})`
                    : 'Pendiente de registro'}
                </div>
              </div>

              {/* Anexo 03 Acervo */}
              <div className="rounded-md border p-2.5 bg-background">
                <div className="flex items-center gap-1.5 font-medium text-muted-foreground mb-1">
                  <Archive className="h-3.5 w-3.5 text-warning-fg" />
                  <span>Anexo 03 · Acervo</span>
                </div>
                <div className="font-semibold text-foreground">
                  {estado.anexo03_acervo.total_series} series documentales
                </div>
              </div>

              {/* Anexo 04 Patrimonio */}
              <div className="rounded-md border p-2.5 bg-background">
                <div className="flex items-center gap-1.5 font-medium text-muted-foreground mb-1">
                  <Package className="h-3.5 w-3.5 text-success-fg" />
                  <span>Anexo 04 · Patrimonio</span>
                </div>
                <div className="font-semibold text-foreground">
                  {estado.anexo04_patrimonio.confirmados} / {estado.anexo04_patrimonio.total_bienes} bienes ({estado.anexo04_patrimonio.porcentaje_avance}%)
                </div>
              </div>

              {/* Anexo 05 Personal */}
              <div className="rounded-md border p-2.5 bg-background">
                <div className="flex items-center gap-1.5 font-medium text-muted-foreground mb-1">
                  <Users className="h-3.5 w-3.5 text-purple-600" />
                  <span>Anexo 05 · Personal</span>
                </div>
                <div className="font-semibold text-foreground">
                  {estado.anexo05_personal.total_personal} servidores a cargo
                </div>
              </div>

              {/* Anexo 06 No Patrimonial */}
              <div className="col-span-2 rounded-md border p-2.5 bg-background">
                <div className="flex items-center gap-1.5 font-medium text-muted-foreground mb-1">
                  <PackageOpen className="h-3.5 w-3.5 text-danger-fg" />
                  <span>Anexo 06 · Bienes No Patrimoniales</span>
                </div>
                <div className="font-semibold text-foreground">
                  {estado.anexo06_nopatrimonial.total_bienes} bienes auxiliares inventariados
                </div>
              </div>
            </div>

            <div className="space-y-3 border-t pt-3">
              <h3 className="text-sm font-semibold">Firma de documentos</h3>
              {(['anexo02', 'anexo03', 'anexo04', 'anexo05', 'anexo06', 'anexo07'] as TipoDocumentoFirma[]).map((tipo) => (
                <div key={tipo} className="space-y-1">
                  <p className="text-xs font-medium">{tipo === 'anexo07' ? 'Acta 07' : `Anexo ${tipo.slice(-2)}`}</p>
                  <DocumentoFirmaDetalle tipoDocumento={tipo} dependenciaId={dependencia.id} soloLectura />
                </div>
              ))}
            </div>

            {/* Acciones */}
            <div className="flex items-center justify-between pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-xs"
              >
                Cerrar
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleSeleccionarComoActiva}
                className="gap-1.5 text-xs"
              >
                <Building2 className="h-3.5 w-3.5" />
                Establecer como Centro de Costo Activo
              </Button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  )
}
