import type { DependenciaResumen } from '@/types/transferencia'

export interface NodoArbol {
  id: number
  codigo: string
  codigo_anexo1?: string | null
  es_centro_costo_oficial?: boolean
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
  // Ordenar priorizando el código oficial del Anexo 01 (01, 02, 03... 17.03)
  const ordenadas = [...dependencias].sort((a, b) => {
    if (a.codigo_anexo1 && b.codigo_anexo1) {
      return a.codigo_anexo1.localeCompare(b.codigo_anexo1, undefined, { numeric: true })
    }
    if (a.codigo_anexo1 && !b.codigo_anexo1) return -1
    if (!a.codigo_anexo1 && b.codigo_anexo1) return 1
    return a.codigo.localeCompare(b.codigo, undefined, { numeric: true })
  })

  const mapa = new Map<string, NodoArbol>()
  const mapaPorId = new Map<number, NodoArbol>()

  for (const dep of ordenadas) {
    const nodo: NodoArbol = {
      id: dep.id,
      codigo: dep.codigo,
      codigo_anexo1: dep.codigo_anexo1,
      es_centro_costo_oficial: dep.es_centro_costo_oficial,
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
    const nodo = mapaPorId.get(dep.id)!

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

  // Ordenar las raíces y los hijos de cada nodo por la jerarquía oficial
  const comparador = (a: NodoArbol, b: NodoArbol) => {
    if (a.codigo_anexo1 && b.codigo_anexo1) {
      return a.codigo_anexo1.localeCompare(b.codigo_anexo1, undefined, { numeric: true })
    }
    if (a.codigo_anexo1 && !b.codigo_anexo1) return -1
    if (!a.codigo_anexo1 && b.codigo_anexo1) return 1
    return a.codigo.localeCompare(b.codigo, undefined, { numeric: true })
  }

  raices.sort(comparador)
  for (const nodo of mapaPorId.values()) {
    nodo.hijos.sort(comparador)
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
      (nodo.codigo_anexo1 && nodo.codigo_anexo1.toLowerCase().includes(q)) ||
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

/**
 * Obtiene la lista de IDs de todos los ancestros de una dependencia hasta la raíz.
 */
export function obtenerAncestrosIds(dependencias: DependenciaResumen[], targetId: number): number[] {
  const mapaPorId = new Map<number, DependenciaResumen>()
  for (const dep of dependencias) {
    mapaPorId.set(dep.id, dep)
  }
  const ancestros: number[] = []
  let actual = mapaPorId.get(targetId)
  while (actual && actual.parent_id) {
    ancestros.push(actual.parent_id)
    actual = mapaPorId.get(actual.parent_id)
  }
  return ancestros
}


