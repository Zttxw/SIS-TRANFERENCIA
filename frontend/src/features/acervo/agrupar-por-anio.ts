import { SECCIONES_ACERVO } from '@/lib/catalogos'
import type { AcervoDocumental, TipoAcervo } from '@/types/acervo'

export interface GrupoAnio {
  /** Año de agrupación, o null para «sin año declarado». */
  anio: number | null
  /** Etiqueta legible del grupo (p. ej. «2024» o «Sin año»). */
  etiqueta: string
  series: AcervoDocumental[]
}

export interface SeccionAcervo {
  tipo: TipoAcervo
  titulo: string
  grupos: GrupoAnio[]
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

/**
 * Estructura del formato oficial del Anexo 03: sección A (digital, SGD) y
 * sección B (física), cada una con sus bloques por año. Omite las secciones
 * sin series.
 */
export function agruparAcervoPorSeccion(series: AcervoDocumental[]): SeccionAcervo[] {
  return SECCIONES_ACERVO
    .map(({ value, label }) => ({
      tipo: value,
      titulo: label,
      grupos: agruparAcervoPorAnio(series.filter((serie) => serie.tipo === value)),
    }))
    .filter((seccion) => seccion.grupos.length > 0)
}
