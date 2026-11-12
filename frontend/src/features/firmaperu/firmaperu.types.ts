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

export interface EstadoFirma {
  version?: number | null
  vigente?: boolean
  firmado: boolean
  documento_id: string | null
  firmado_en: string | null
  pendiente_validacion: boolean
  sesion_pendiente_id: string | null
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
