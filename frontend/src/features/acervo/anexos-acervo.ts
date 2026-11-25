import type { TipoDocumentoFirma } from '@/features/firmaperu/firmaperu.types'
import type { TipoAcervo } from '@/types/acervo'
import type { ClaveAnexoObservable } from '@/types/observaciones'

export interface AnexoAcervo {
  tipo: TipoAcervo
  /** Etiqueta normativa, p. ej. «Anexo 03-A». */
  numero: string
  titulo: string
  ruta: string
  tipoFirma: TipoDocumentoFirma
  claveObservacion: ClaveAnexoObservable
  /** Encabezado de la columna de volumen. */
  etiquetaCantidad: string
  /** Unidad de volumen en minúsculas, p. ej. «folios». */
  unidadCantidad: string
}

/**
 * El acervo documentario se entrega en dos documentos independientes: el
 * Anexo 03-A (físico, registrado a mano y medido en folios) y el Anexo 03-B
 * (digital, precargado del SGD y medido en número de documentos).
 */
export const ANEXOS_ACERVO: Record<TipoAcervo, AnexoAcervo> = {
  fisico: {
    tipo: 'fisico',
    numero: 'Anexo 03-A',
    titulo: 'Acervo Documentario Físico',
    ruta: '/acervo-fisico',
    tipoFirma: 'anexo03a',
    claveObservacion: 'acervo_fisico',
    etiquetaCantidad: 'Folios',
    unidadCantidad: 'folios',
  },
  digital: {
    tipo: 'digital',
    numero: 'Anexo 03-B',
    titulo: 'Acervo Documentario Digital (SGD)',
    ruta: '/acervo-digital',
    tipoFirma: 'anexo03b',
    claveObservacion: 'acervo_digital',
    etiquetaCantidad: 'N° documentos',
    unidadCantidad: 'documentos',
  },
}
