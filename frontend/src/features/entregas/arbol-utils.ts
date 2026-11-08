import type { DependenciaResumen } from '@/types/transferencia'

export interface NodoArbol {
  id: number
  codigo: string
  nombre: string
  nivel: number
  parent_id: number | null
  encargado?: {
    id: number
    dni: string
    nombres: string
    apellidos: string
    cargo: string | null
  } | null
  hijos: NodoArbol[]
}

/**
 * Construye el árbol jerárquico organizacional a partir de la lista plana de dependencias,
 * infiriendo la relación padre-hijo tanto por `parent_id` como por la estructura de código decimal (ej. 01.03 -> 01.03.07).
 */
export function construirArbol(dependencias: DependenciaResumen[]): NodoArbol[] {
  // Ordenar por código para garantizar que los padres se procesen antes
  const ordenadas = [...dependencias].sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }))

  const mapa = new Map<string, NodoArbol>()
  const mapaPorId = new Map<number, NodoArbol>()

  for (const dep of ordenadas) {
    const nodo: NodoArbol = {
      id: dep.id,
      codigo: dep.codigo,
      nombre: dep.nombre,
      nivel: dep.nivel,
      parent_id: dep.parent_id,
      encargado: dep.encargado,
      hijos: [],
    }
    mapa.set(dep.codigo, nodo)
    mapaPorId.set(dep.id, nodo)
  }

  const raices: NodoArbol[] = []

  for (const dep of ordenadas) {
    const nodo = mapa.get(dep.codigo)!

    // Si tiene parent_id explícito y existe en el mapa
    if (dep.parent_id && mapaPorId.has(dep.parent_id)) {
      mapaPorId.get(dep.parent_id)!.hijos.push(nodo)
      continue
    }

    // Intentar deducir por código segmentado (ej. "01.03.07" -> padre "01.03")
    const partes = dep.codigo.split('.')
    if (partes.length > 1) {
      const codigoPadre = partes.slice(0, -1).join('.')
      const nodoPadre = mapa.get(codigoPadre)
      if (nodoPadre) {
        nodoPadre.hijos.push(nodo)
        continue
      }
    }

    // Si no tiene padre en el mapa, es una raíz institucional
    raices.push(nodo)
  }

  return raices
}

/**
 * Filtra el árbol recursivamente si el nodo o alguno de sus descendientes coincide con la búsqueda.
 */
export function filtrarArbol(nodos: NodoArbol[], query: string): NodoArbol[] {
  if (!query.trim()) return nodos
  const q = query.toLowerCase().trim()

  const resultado: NodoArbol[] = []

  for (const nodo of nodos) {
    const coincide =
      nodo.codigo.toLowerCase().includes(q) ||
      nodo.nombre.toLowerCase().includes(q) ||
      (nodo.encargado &&
        `${nodo.encargado.nombres} ${nodo.encargado.apellidos}`.toLowerCase().includes(q))

    const hijosFiltrados = filtrarArbol(nodo.hijos, query)

    if (coincide || hijosFiltrados.length > 0) {
      resultado.push({
        ...nodo,
        hijos: hijosFiltrados,
      })
    }
  }

  return resultado
}
