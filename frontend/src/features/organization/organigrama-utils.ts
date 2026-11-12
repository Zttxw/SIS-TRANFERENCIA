interface Unidad {
  id: number
  parent_id?: number | null
  codigo: string
}

/** Abre la ruta institucional hasta las unidades asignadas, sin depender de IDs del entorno. */
export function ancestrosVisibles(unidades: Unidad[], objetivos: number[]): Set<number> {
  const porId = new Map(unidades.map((unidad) => [unidad.id, unidad]))
  const porCodigo = new Map(unidades.map((unidad) => [unidad.codigo, unidad]))
  const resultado = new Set(unidades.filter((unidad) => !unidad.parent_id).map((unidad) => unidad.id))
  for (const objetivo of objetivos) {
    let unidad = porId.get(objetivo)
    const visitados = new Set<number>()
    while (unidad && !visitados.has(unidad.id)) {
      visitados.add(unidad.id)
      resultado.add(unidad.id)
      const codigoPadre = unidad.codigo.split('.').slice(0, -1).join('.')
      unidad = (unidad.parent_id ? porId.get(unidad.parent_id) : undefined) ?? porCodigo.get(codigoPadre)
    }
  }
  return resultado
}
