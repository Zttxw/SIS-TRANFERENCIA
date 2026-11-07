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
        className={`flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50/80 p-4 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-200 ${className}`}
        role="alert"
      >
        <Lock className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
        <div className="text-sm space-y-1">
          <p className="font-semibold">Entrega en modo Solo Lectura (Remitida)</p>
          <p className="text-blue-800/90 dark:text-blue-300">
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
        className={`flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200 ${className}`}
        role="alert"
      >
        <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
        <div className="text-sm space-y-1">
          <p className="font-semibold">Entrega con Observaciones Pendientes</p>
          <p className="text-amber-800/90 dark:text-amber-300">
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
        className={`flex items-start gap-3 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200 ${className}`}
        role="alert"
      >
        <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
        <div className="text-sm space-y-1">
          <p className="font-semibold">Entrega Consolidada y Aprobada</p>
          <p className="text-emerald-800/90 dark:text-emerald-300">
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

