import type { PlazoCentroCosto } from '@/types/transferencia'

/** Fecha ISO (aaaa-mm-dd) en formato dd/mm/aaaa, sin pasar por la zona horaria. */
function fechaCorta(iso: string): string {
  const [anio, mes, dia] = iso.slice(0, 10).split('-')
  return `${dia}/${mes}/${anio}`
}

/**
 * Plazo de la siguiente acción de un CC según el cronograma (F-16): «vencido»
 * o «vence en N días hábiles». El cálculo y el bloqueo los hace el backend.
 */
export function IndicadorPlazo({ plazo }: { plazo: PlazoCentroCosto | null }) {
  if (!plazo) return <span className="text-mini text-muted-foreground">Sin plazo</span>

  const texto = plazo.vencido
    ? 'Vencido'
    : plazo.dias_habiles === 0
      ? 'Vence hoy'
      : plazo.dias_habiles === 1
        ? 'Vence en 1 día hábil'
        : `Vence en ${plazo.dias_habiles} días hábiles`
  const tono = plazo.vencido
    ? 'bg-danger-soft text-danger-fg border-danger-border'
    : plazo.dias_habiles <= 2
      ? 'bg-warning-soft text-warning-fg border-warning-border'
      : 'bg-muted text-foreground border-border'

  return (
    <div
      className="leading-tight"
      title={`${plazo.actividad} · vence el ${fechaCorta(plazo.fecha_vencimiento)}`}
    >
      <span className={`inline-flex rounded-full border px-2 py-0.5 text-mini font-semibold ${tono}`}>
        {texto}
      </span>
      <div className="mt-0.5 text-mini text-muted-foreground">
        {plazo.accion_etiqueta} · {fechaCorta(plazo.fecha_vencimiento)}
      </div>
    </div>
  )
}
