export type TipoDocumentoFirma = 'anexo01' | 'anexo02' | 'anexo03' | 'anexo04' | 'anexo05' | 'anexo06' | 'anexo07'

export interface PreparacionFirma {
  sesion_id: string
  param_token: string
  param_url: string
  document_extension: string
  expires_at: string
}

export interface SesionFirma {
  version?: number | null
  vigente?: boolean
  sesion_id: string
  estado: 'pendiente' | 'emitida' | 'validando' | 'pendiente_validacion' | 'firmada' | 'rechazada' | 'expirada'
  documento_id: string | null
  firmado_en: string | null
  mensaje: string | null
}

export type LadoFirma = 'entidad' | 'ette'
export type CalidadEtte = 'coordinador' | 'titular_suplente'

/** Firma vigente que aporta un lado a la cadena del documento (D-05). */
export interface FirmaLado {
  sesion_id: string
  firmante: string | null
  en_calidad_de: CalidadEtte | null
  motivo_suplencia: string | null
  origen: 'digital' | 'manuscrita'
  firmado_en: string | null
}

export interface EstadoFirma {
  version?: number | null
  /** Hay una cadena de firmas vigente sobre el PDF generado actual. */
  vigente?: boolean
  /** La cadena vigente reúne la firma de ambos lados. */
  completo: boolean
  entidad: FirmaLado | null
  ette: FirmaLado | null
  /** Ya hay una firma digital: el lado ETTE no puede subir firma manuscrita. */
  hay_firma_digital: boolean
  /** Lado por el que firmaría el usuario autenticado (null si no firma). */
  mi_lado: { lado: LadoFirma; en_calidad_de: CalidadEtte | null } | null
  /** La entrega fue aceptada por el coordinador y aún no se remite. */
  firma_habilitada: boolean
  firmado: boolean
  /** El usuario autenticado ya suscribió este documento (según el DNI del certificado). */
  firme_yo?: boolean
  documento_id: string | null
  firmado_en: string | null
  pendiente_validacion: boolean
  sesion_pendiente_id: string | null
  borrador_generado: boolean
  pdf_generado_vigente?: boolean
  borrador_generado_en: string | null
}

export interface RequisitosRemision {
  puede_remitir: boolean
  /** Documentos con ambas firmas vigentes. */
  firmados: number
  pendientes: TipoDocumentoFirma[]
  documentos: Record<string, { completo: boolean; entidad: FirmaLado | null; ette: FirmaLado | null }>
}

declare global {
  interface Window {
    startSignature?: (port: number, parametros: string) => void
    signatureInit?: () => void
    signatureOk?: () => void
    signatureCancel?: () => void
    jqFirmaPeru?: unknown
    jQuery?: unknown
  }
}
