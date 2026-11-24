import type { EstadoFirma } from './firmaperu.types'

/**
 * Etapa de un documento en «PDF y firma», derivada de su estado de firma. Es
 * la única fuente para los textos y colores de estado de los documentos.
 */
export type EtapaDocumento =
  | 'sin_generar'
  | 'desactualizado'
  | 'generado'
  | 'pendiente_validacion'
  | 'firma_anterior'
  | 'firma_parcial'
  | 'completo'

export type TonoEtapa = 'neutro' | 'aviso' | 'info' | 'exito'

export const ETAPAS: Record<EtapaDocumento, { etiqueta: string; tono: TonoEtapa }> = {
  sin_generar: { etiqueta: 'PDF no generado', tono: 'neutro' },
  desactualizado: { etiqueta: 'Datos cambiados · regenere el PDF', tono: 'aviso' },
  generado: { etiqueta: 'PDF listo para firmar', tono: 'info' },
  pendiente_validacion: { etiqueta: 'Firma recibida · verificación pendiente', tono: 'aviso' },
  firma_anterior: { etiqueta: 'Firma anterior · vuelva a firmar', tono: 'aviso' },
  firma_parcial: { etiqueta: 'Falta una firma', tono: 'info' },
  completo: { etiqueta: 'Firmado por ambos lados', tono: 'exito' },
}

export function etapaDocumento(estado?: EstadoFirma): EtapaDocumento {
  if (!estado) return 'sin_generar'
  if (estado.completo) return 'completo'
  if (estado.vigente) return 'firma_parcial'
  if (estado.firmado) return 'firma_anterior'
  if (estado.pendiente_validacion) return 'pendiente_validacion'
  if (estado.borrador_generado && estado.pdf_generado_vigente === false) return 'desactualizado'
  if (estado.borrador_generado) return 'generado'
  return 'sin_generar'
}

/** Paso que sigue para completar el documento, en palabras del responsable. */
export function siguientePaso(estado?: EstadoFirma): string | null {
  if (!estado || estado.completo) return null
  if (estado.pdf_generado_vigente !== true) return 'Genere el PDF con los datos actuales y revíselo.'
  if (!estado.firma_habilitada) return 'La firma se habilita al cerrar la entrega para revisión y firma.'
  if (!estado.entidad && !estado.ette) return 'Firme como responsable o haga firmar primero al coordinador ETTE.'
  if (!estado.entidad) return 'Falta su firma como responsable.'
  return `Falta la firma de ${estado.firmante_ette?.nombre ?? 'el coordinador ETTE'}, en esta sesión y con su certificado.`
}
