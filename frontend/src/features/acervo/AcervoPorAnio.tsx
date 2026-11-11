import { useMemo, useState } from 'react'
import {
  CalendarRange,
  ChevronDown,
  ChevronRight,
  FolderArchive,
  HardDrive,
  Pencil,
  Trash2,
} from 'lucide-react'

import { Can } from '@/auth/Can'
import { AsyncBoundary } from '@/components/ui/async-boundary'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { agruparAcervoPorAnio } from './agrupar-por-anio'
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
 * Vista del Anexo 03 agrupada por año (requisito del formato oficial, F4). Cada
 * año es una sección colapsable con sus series. Deriva el año sin tocar backend
 * (ver `agruparAcervoPorAnio`). Trae todas las series de la dependencia (no la
 * página actual), por eso la página la alimenta con `per_page` alto.
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
  const grupos = useMemo(() => agruparAcervoPorAnio(series ?? []), [series])
  const [colapsados, setColapsados] = useState<Set<string>>(new Set())

  const alternar = (etiqueta: string) =>
    setColapsados((prev) => {
      const next = new Set(prev)
      if (next.has(etiqueta)) next.delete(etiqueta)
      else next.add(etiqueta)
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
        <div className="space-y-3">
          {grupos.map((grupo) => {
            const abierto = !colapsados.has(grupo.etiqueta)
            return (
              <Card key={grupo.etiqueta} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => alternar(grupo.etiqueta)}
                  className="flex w-full items-center justify-between gap-2 bg-muted/30 px-4 py-2.5 text-left transition-colors hover:bg-muted/50"
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
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          <th className="px-4 py-2 font-medium">Formato</th>
                          <th className="px-4 py-2 font-medium">Serie / Tipología</th>
                          <th className="px-4 py-2 font-medium">Periodo</th>
                          <th className="px-4 py-2 font-medium">Cantidad</th>
                          <th className="hidden px-4 py-2 font-medium sm:table-cell">Ubicación</th>
                          <th className="px-4 py-2 text-right font-medium">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grupo.series.map((item) => (
                          <tr key={item.id} className="border-b border-border/50 last:border-0">
                            <td className="px-4 py-2.5">
                              {item.tipo === 'digital' ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-info-soft px-2 py-0.5 text-mini font-semibold text-info-fg">
                                  <HardDrive className="h-3 w-3" />
                                  Digital
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-mini font-semibold text-muted-foreground">
                                  <FolderArchive className="h-3 w-3" />
                                  Físico
                                </span>
                              )}
                            </td>
                            <td className="max-w-xs px-4 py-2.5">
                              <p className="truncate font-semibold text-foreground">
                                {item.serie_documental}
                              </p>
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground">
                              {item.periodo ?? '-'}
                            </td>
                            <td className="px-4 py-2.5 font-medium text-foreground">
                              {item.cantidad_unidades} {item.unidad_conservacion}
                            </td>
                            <td className="hidden max-w-xs px-4 py-2.5 text-muted-foreground sm:table-cell">
                              <p className="truncate">{item.ubicacion ?? '-'}</p>
                            </td>
                            <td className="px-4 py-2.5 text-right whitespace-nowrap">
                              <Can permiso="anexos.registrar">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                    disabled={!esModificable}
                                    onClick={() => onEditar(item)}
                                    aria-label="Editar serie"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                    disabled={!esModificable || eliminando}
                                    onClick={() => onEliminar(item)}
                                    aria-label="Eliminar serie"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </Can>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            )
          })}

          <p className="px-1 text-nota text-muted-foreground">
            {filas.length} serie{filas.length !== 1 ? 's' : ''} en {grupos.length} año
            {grupos.length !== 1 ? 's' : ''}.
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
