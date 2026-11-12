import type { ApiPaginated } from '@/types/api'

/** La vista por año necesita todas las páginas, aunque el backend limite cada una a 100 filas. */
export async function reunirPaginasAcervo<T>(solicitar: (pagina: number) => Promise<ApiPaginated<T>>, signal?: AbortSignal): Promise<ApiPaginated<T>> {
  signal?.throwIfAborted()
  const primera = await solicitar(1)
  const filas = [...primera.data]
  for (let pagina = 2; pagina <= primera.meta.last_page; pagina++) {
    signal?.throwIfAborted()
    filas.push(...(await solicitar(pagina)).data)
  }
  return { ...primera, data: filas, meta: { ...primera.meta, current_page: 1, last_page: 1, per_page: filas.length } }
}
