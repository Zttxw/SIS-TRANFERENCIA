import { api } from '@/lib/api'
import { descargarArchivo } from '@/lib/descargas'
import type { ApiPaginated, ApiSuccess } from '@/types/api'
import { reunirPaginasAcervo } from './paginacion-acervo'
import type {
  AcervoDocumental,
  DocumentosSgdResultado,
  FiltrosAcervo,
  FiltrosDocumentosSgd,
  GuardarAcervoPayload,
} from '@/types/acervo'

export const acervoService = {
  async listar(filtros: FiltrosAcervo = {}, signal?: AbortSignal): Promise<ApiPaginated<AcervoDocumental>> {
    if ((filtros.per_page ?? 0) > 100) {
      return reunirPaginasAcervo((page) => acervoService.listar({ ...filtros, page, per_page: 100 }, signal), signal)
    }
    const params = new URLSearchParams()
    if (filtros.dependencia_id) params.set('dependencia_id', String(filtros.dependencia_id))
    if (filtros.tipo) params.set('tipo', filtros.tipo)
    if (filtros.search) params.set('search', filtros.search)
    if (filtros.per_page) params.set('per_page', String(filtros.per_page))
    if (filtros.page) params.set('page', String(filtros.page))

    const res = await api.get<ApiPaginated<AcervoDocumental>>(`/acervo?${params.toString()}`, { signal })
    return res.data
  },

  async crear(payload: GuardarAcervoPayload): Promise<AcervoDocumental> {
    const res = await api.post<ApiSuccess<AcervoDocumental>>('/acervo', payload)
    return res.data.data
  },

  async actualizar(id: number, payload: GuardarAcervoPayload): Promise<AcervoDocumental> {
    const res = await api.put<ApiSuccess<AcervoDocumental>>(`/acervo/${id}`, payload)
    return res.data.data
  },

  async eliminar(id: number): Promise<void> {
    await api.delete(`/acervo/${id}`)
  },

  /** Descarga el PDF oficial del Anexo 03 (acervo agrupado por año). */
  async descargarPdf(dependenciaId: number): Promise<void> {
    await descargarArchivo(
      '/acervo/pdf',
      { dependencia_id: dependenciaId },
      'Anexo03-Acervo.pdf',
    )
  },

  /**
   * Lista en vivo los documentos del SGD que respaldan una fila-resumen de
   * acervo digital (consulta de solo lectura al SGD, paginada + búsqueda).
   */
  async documentosSgd(
    acervoId: number,
    filtros: FiltrosDocumentosSgd = {},
    signal?: AbortSignal,
  ): Promise<DocumentosSgdResultado> {
    const params = new URLSearchParams()
    if (filtros.search) params.set('search', filtros.search)
    if (filtros.page) params.set('page', String(filtros.page))
    if (filtros.per_page) params.set('per_page', String(filtros.per_page))

    const res = await api.get<ApiSuccess<DocumentosSgdResultado>>(
      `/acervo/${acervoId}/documentos?${params.toString()}`,
      { signal },
    )
    return res.data.data
  },

  /**
   * Trae el PDF principal de un documento del SGD como Blob (hereda el Bearer
   * del interceptor) y devuelve un object URL para mostrarlo en un visor
   * embebido. Quien lo consuma debe revocar el URL al cerrar.
   */
  async pdfDocumentoSgd(acervoId: number, emi: string, signal?: AbortSignal): Promise<string> {
    const res = await api.get<Blob>(`/acervo/${acervoId}/documentos/${emi}/pdf`, {
      responseType: 'blob',
      signal,
    })
    const blob = new Blob([res.data], { type: 'application/pdf' })
    return window.URL.createObjectURL(blob)
  },
}

