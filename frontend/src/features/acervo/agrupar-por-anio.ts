import type { AcervoDocumental } from '@/types/acervo'

export interface GrupoAnio {
  /** Año de agrupación, o null para «sin año declarado». */
  anio: number | null
  /** Etiqueta legible del grupo (p. ej. «2024» o «Sin año»). */
  etiqueta: string
  series: AcervoDocumental[]
  /** Total de unidades sumadas en el grupo (si la unidad es homogénea sirve). */
  totalUnidades: number
}

/**
 * Deriva el «año de agrupación» de una serie documental (Anexo 03), sin tocar el
 * backend. Prioridad: `anio` explícito → inicio de rango `desde_anio` → primer
 * año de 4 dígitos hallado en el texto `periodo` → null (sin año).
 */
export function anioDeAgrupacion(serie: AcervoDocumental): number | null {
  if (typeof serie.anio === 'number') return serie.anio
  if (typeof serie.desde_anio === 'number') return serie.desde_anio
  if (serie.periodo) {
    const m = serie.periodo.match(/\b(19|20)\d{2}\b/)
    if (m) return Number(m[0])
  }
  return null
}

/**
 * Agrupa las series por año de agrupación, ordenadas de más reciente a más
 * antiguo; el grupo «sin año» va al final. El formato oficial del Anexo 03 lista
 * el acervo por año (2023–2026), pero no se hardcodea el rango: se usan los años
 * realmente presentes.
 */
export function agruparAcervoPorAnio(series: AcervoDocumental[]): GrupoAnio[] {
  const mapa = new Map<number | null, AcervoDocumental[]>()

  for (const serie of series) {
    const anio = anioDeAgrupacion(serie)
    const grupo = mapa.get(anio)
    if (grupo) grupo.push(serie)
    else mapa.set(anio, [serie])
  }

  const grupos: GrupoAnio[] = Array.from(mapa.entries()).map(([anio, items]) => ({
    anio,
    etiqueta: anio === null ? 'Sin año declarado' : String(anio),
    series: items,
    totalUnidades: items.reduce((acc, s) => acc + (s.cantidad_unidades ?? 0), 0),
  }))

  grupos.sort((a, b) => {
    if (a.anio === null) return 1
    if (b.anio === null) return -1
    return b.anio - a.anio
  })

  return grupos
}
