import { useMemo, useState } from 'react'
import { CalendarRange, ChevronDown, ChevronRight } from 'lucide-react'

import { AsyncBoundary } from '@/components/ui/async-boundary'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { agruparAcervoPorSeccion } from './agrupar-por-anio'
import { AcervoCabecera, AcervoRegistro } from './AcervoRegistro'
import type { AcervoDocumental } from '@/types/acervo'

interface AcervoPorAnioProps {
  series: AcervoDocumental[] | undefined
  loading?: boolean
  error?: unknown
  onReintentar?: () => void
  esModificable?: boolean
  onEditar: (serie: AcervoDocumental) => void
  onEliminar: (serie: AcervoDocumental) => void
  eliminando?: boolean
  /** Acción de alta para el estado vacío. */
  accionNuevo?: React.ReactNode
  /** Total real en el servidor; si supera lo cargado, se avisa que falta. */
  total?: number
}

/**
 * Vista del Anexo 03 con la estructura del formato oficial: sección A (digital,
 * SGD) y sección B (física), cada una con bloques colapsables por año. Trae
 * todas las series de la dependencia (no la página actual), por eso la página
 * la alimenta con `per_page` alto.
 */
export function AcervoPorAnio({
  series,
  loading = false,
  error,
  onReintentar,
  esModificable = true,
  onEditar,
  onEliminar,
  eliminando = false,
  accionNuevo,
  total,
}: AcervoPorAnioProps) {
  const secciones = useMemo(() => agruparAcervoPorSeccion(series ?? []), [series])
  const totalAnios = new Set(series?.map((serie) => serie.anio)).size
  const [colapsados, setColapsados] = useState<Set<string>>(new Set())

  const alternar = (clave: string) =>
    setColapsados((prev) => {
      const next = new Set(prev)
      if (next.has(clave)) next.delete(clave)
      else next.add(clave)
      return next
    })

  return (
    <AsyncBoundary
      loading={loading}
      error={error}
      data={series}
      vacio={series?.length === 0}
      onReintentar={onReintentar}
      fallbackVacio={
        <EmptyState
          icono={CalendarRange}
          titulo="Sin series documentales"
          descripcion="No se han registrado series de acervo para esta dependencia. Registre la primera."
          accion={accionNuevo}
        />
      }
    >
      {(filas) => (
        <div className="space-y-5">
          {secciones.map((seccion) => (
            <section key={seccion.tipo} className="space-y-3" aria-label={seccion.titulo}>
              <h3 className="px-1 text-sm font-semibold text-foreground">{seccion.titulo}</h3>
              {seccion.grupos.map((grupo) => {
                const clave = `${seccion.tipo}-${grupo.etiqueta}`
                const abierto = !colapsados.has(clave)
                return (
                  <Card key={clave} className="overflow-hidden">
                    <button
                      type="button"
                      onClick={() => alternar(clave)}
                      className="flex w-full items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
                      aria-expanded={abierto}
                    >
                      <span className="flex items-center gap-2 font-semibold text-foreground">
                        {abierto ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <CalendarRange className="h-4 w-4 text-primary" />
                        {grupo.etiqueta}
                      </span>
                      <span className="text-nota text-muted-foreground">
                        {grupo.series.length} serie{grupo.series.length !== 1 ? 's' : ''}
                      </span>
                    </button>

                    {abierto && (
                      <table className="w-full table-fixed border-collapse text-left text-xs">
                        <AcervoCabecera />
                        <tbody className="divide-y">
                        {grupo.series.map((registro) => (
                          <AcervoRegistro
                            key={registro.id}
                            registro={registro}
                            esModificable={esModificable}
                            eliminando={eliminando}
                            onEditar={onEditar}
                            onEliminar={onEliminar}
                          />
                        ))}
                        </tbody>
                      </table>
                    )}
                  </Card>
                )
              })}
            </section>
          ))}

          <p className="px-1 text-nota text-muted-foreground">
            {filas.length} serie{filas.length !== 1 ? 's' : ''} en {totalAnios} año
            {totalAnios !== 1 ? 's' : ''}.
            {typeof total === 'number' && total > filas.length && (
              <span className="text-warning-fg">
                {' '}
                Mostrando {filas.length} de {total}; use la vista Lista para ver el resto.
              </span>
            )}
          </p>
        </div>
      )}
    </AsyncBoundary>
  )
}
