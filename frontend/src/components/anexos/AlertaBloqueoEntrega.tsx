import { AlertCircle, CheckCircle, Info, Lock } from 'lucide-react'

import type { EstadoEntrega } from '@/types/transferencia'

interface AlertaBloqueoEntregaProps {
  estadoEntrega?: EstadoEntrega | null
  className?: string
}

export function AlertaBloqueoEntrega({ estadoEntrega, className = '' }: AlertaBloqueoEntregaProps) {
  if (!estadoEntrega || estadoEntrega === 'borrador') {
    return null
  }

  if (estadoEntrega === 'remitida') {
    return (
      <div
        className={`flex items-start gap-3 rounded-lg border border-info-border bg-info-soft p-4 text-info-fg ${className}`}
        role="alert"
      >
        <Lock className="h-5 w-5 shrink-0 text-info mt-0.5" />
        <div className="text-sm space-y-1">
          <p className="font-semibold">Entrega en modo Solo Lectura (Remitida)</p>
          <p className="text-info-fg/90">
            La entrega de este centro de costo ya fue remitida al nivel jerárquico superior para su revisión.
            Los campos se encuentran bloqueados para edición. Solo podrán modificarse si la entrega es observada.
          </p>
        </div>
      </div>
    )
  }

  if (estadoEntrega === 'observada') {
    return (
      <div
        className={`flex items-start gap-3 rounded-lg border border-warning-border bg-warning-soft p-4 text-warning-fg ${className}`}
        role="alert"
      >
        <AlertCircle className="h-5 w-5 shrink-0 text-warning mt-0.5" />
        <div className="text-sm space-y-1">
          <p className="font-semibold">Entrega con Observaciones Pendientes</p>
          <p className="text-warning-fg/90">
            La entrega ha sido devuelta con observaciones. La edición de este anexo se encuentra habilitada para
            que proceda con las correcciones pertinentes y la posterior respuesta de subsanación.
          </p>
        </div>
      </div>
    )
  }

  if (estadoEntrega === 'consolidada') {
    return (
      <div
        className={`flex items-start gap-3 rounded-lg border border-success-border bg-success-soft p-4 text-success-fg ${className}`}
        role="alert"
      >
        <CheckCircle className="h-5 w-5 shrink-0 text-success mt-0.5" />
        <div className="text-sm space-y-1">
          <p className="font-semibold">Entrega Consolidada y Aprobada</p>
          <p className="text-success-fg/90">
            La información de este anexo ha sido verificada y consolidada de manera definitiva en el proceso
            institucional de transferencia. El registro es inmutable.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border border-muted bg-muted/30 p-4 text-muted-foreground ${className}`}
    >
      <Info className="h-5 w-5 shrink-0 mt-0.5" />
      <div className="text-sm">
        <p className="font-medium text-foreground">Estado de la entrega: {estadoEntrega}</p>
      </div>
    </div>
  )
}

