import { Building2 } from 'lucide-react'

import { useDependenciaActiva } from '@/auth/hooks'
import { Card } from '@/components/ui/card'
import { ConsolidadoSubarbol } from './ConsolidadoSubarbol'
import { EntregaCentroCostoCard } from './EntregaCentroCostoCard'
import { useEstadoEntrega } from './use-entregas'

/**
 * Entrega del centro de costo activo (directiva 2026, D-07): el responsable la
 * presenta al coordinador ETTE, este la acepta, se firma y se remite al CC padre
 * o al ETTS. El CC padre no revisa ni devuelve lo que envían sus hijos (D-08).
 */
export function EntregasPage() {
  const { dependenciaId } = useDependenciaActiva()
  const { data: estado, isLoading } = useEstadoEntrega(dependenciaId)

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Entrega del centro de costo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Presente los anexos al coordinador ETTE. Él acepta lo entregado (con observaciones solo como
          constancia), se firman los anexos 02 al 07 y la entrega se remite al centro de costo padre o
          al ETTS.
        </p>
      </div>

      {!dependenciaId ? (
        <Card className="border-dashed p-8 text-center">
          <Building2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Seleccione un centro de costo</h3>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
            Elija el centro de costo en el selector superior para ver y gestionar su entrega.
          </p>
        </Card>
      ) : isLoading || !estado ? (
        <Card className="p-12 text-center text-xs text-muted-foreground">Consultando el estado de la entrega…</Card>
      ) : (
        <>
          <EntregaCentroCostoCard estado={estado} />
          <ConsolidadoSubarbol dependenciaId={estado.dependencia.id} />
        </>
      )}
    </div>
  )
}
