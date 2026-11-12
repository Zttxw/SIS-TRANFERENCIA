import type { FilaAnexo } from './TablaAnexos'

interface Props {
  filas: FilaAnexo[]
}

type Clase = 'completado' | 'registrado' | 'pendiente' | 'sin_registros'

function clasificar(estado: string): Clase {
  const e = estado.toLowerCase()
  if (e.includes('completado') || e.includes('verificado') || e.includes('consolidada') || e.includes('disponible')) {
    return 'completado'
  }
  if (e.includes('registrado')) return 'registrado'
  if (e.includes('sin registros')) return 'sin_registros'
  return 'pendiente'
}

/**
 * Resumen compacto del avance de los anexos (plan 07 · rediseño «Mi entrega»).
 * Barra de progreso global + conteos por estado. Discreto: no compite con la
 * tabla. El avance global usa `completado` de cada fila (estado de llenado).
 */
export function ResumenAnexos({ filas }: Props) {
  const total = filas.length
  const completados = filas.filter((f) => f.completado).length
  const pct = total > 0 ? Math.round((completados / total) * 100) : 0

  const cuenta = (c: Clase) => filas.filter((f) => clasificar(f.estado) === c).length
  const chips: Array<{ etiqueta: string; valor: number; punto: string }> = [
    { etiqueta: 'Completados', valor: cuenta('completado'), punto: 'bg-success' },
    { etiqueta: 'Registrados', valor: cuenta('registrado'), punto: 'bg-[color:var(--secondary)]' },
    { etiqueta: 'Pendientes', valor: cuenta('pendiente'), punto: 'bg-warning' },
    { etiqueta: 'Sin registros', valor: cuenta('sin_registros'), punto: 'bg-muted-foreground/50' },
  ]

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Avance global */}
      <div className="flex items-center gap-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-foreground">{pct}%</span>
            <span className="text-xs text-muted-foreground">avance · {completados} de {total} anexos</span>
          </div>
          <div className="mt-1 h-1.5 w-44 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* Conteos por estado */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {chips.map((c) => (
          <span key={c.etiqueta} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={`h-2 w-2 rounded-full ${c.punto}`} />
            <span className="font-semibold text-foreground">{c.valor}</span> {c.etiqueta}
          </span>
        ))}
      </div>
    </div>
  )
}
