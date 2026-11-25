import type { AcervoDocumental } from '@/types/acervo'

export interface GrupoAnio {
  /** Año de agrupación, o null para «sin año declarado». */
  anio: number | null
  /** Etiqueta legible del grupo (p. ej. «2024» o «Sin año»). */
  etiqueta: string
  series: AcervoDocumental[]
}

/**
 * Agrupa las series por año, de más reciente a más antiguo; el grupo «sin año»
 * va al final. No se fija un rango de años: se usan los realmente presentes.
 */
export function agruparAcervoPorAnio(series: AcervoDocumental[]): GrupoAnio[] {
  const mapa = new Map<number | null, AcervoDocumental[]>()

  for (const serie of series) {
    const grupo = mapa.get(serie.anio)
    if (grupo) grupo.push(serie)
    else mapa.set(serie.anio, [serie])
  }

  return Array.from(mapa.entries())
    .map(([anio, items]) => ({
      anio,
      etiqueta: anio === null ? 'Sin año declarado' : String(anio),
      series: items,
    }))
    .sort((a, b) => {
      if (a.anio === null) return 1
      if (b.anio === null) return -1
      return b.anio - a.anio
    })
}
