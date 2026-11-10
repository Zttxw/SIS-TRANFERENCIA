import type { BienPatrimonial } from '@/types/patrimonio'

export interface GrupoServidor {
  /** Id del servidor custodio, o null para «sin custodio». */
  servidorId: number | null
  /** Etiqueta legible del custodio. */
  etiqueta: string
  bienes: BienPatrimonial[]
}

/** Nombre legible del custodio de un bien (o «Sin custodio asignado»). */
export function nombreCustodio(bien: BienPatrimonial): string {
  if (bien.servidor) return `${bien.servidor.apellidos}, ${bien.servidor.nombres}`
  return 'Sin custodio asignado'
}

/**
 * Agrupa los bienes patrimoniales por servidor custodio (Anexo 04: la cabecera
 * del formato oficial es el servidor responsable de los bienes). Orden
 * alfabético por custodio; «Sin custodio» al final. Agrupa lo que recibe —la
 * página puede paginar—, por eso la vista avisa si hay más en otras páginas.
 */
export function agruparPatrimonioPorServidor(bienes: BienPatrimonial[]): GrupoServidor[] {
  const mapa = new Map<number | null, BienPatrimonial[]>()

  for (const bien of bienes) {
    const id = bien.servidor?.id ?? null
    const grupo = mapa.get(id)
    if (grupo) grupo.push(bien)
    else mapa.set(id, [bien])
  }

  const grupos: GrupoServidor[] = Array.from(mapa.entries()).map(([servidorId, items]) => ({
    servidorId,
    etiqueta: nombreCustodio(items[0]),
    bienes: items,
  }))

  grupos.sort((a, b) => {
    if (a.servidorId === null) return 1
    if (b.servidorId === null) return -1
    return a.etiqueta.localeCompare(b.etiqueta, 'es')
  })

  return grupos
}
