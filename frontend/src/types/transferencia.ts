/**
 * Tipos de transferencia y estado de entregas (directiva 2026, plan §3.1).
 *
 * borrador → en_revision (presentada al coordinador) → verificada (aceptada) →
 * remitida. Sin devolución ni subsanación (D-07). La entrega que llega al ETTS
 * sigue la cadena recibida_etts → remitida_ette → recibida_ette (D-12).
 */

export type EstadoEntrega =
  | 'borrador'
  | 'en_revision'
  | 'verificada'
  | 'acta_suscrita'
  | 'remitida'
  | 'recibida_etts'
  | 'remitida_ette'
  | 'recibida_ette'

export const ETIQUETA_ESTADO_ENTREGA: Record<EstadoEntrega, string> = {
  borrador: 'Borrador',
  en_revision: 'Presentada al coordinador',
  verificada: 'Aceptada por el coordinador',
  acta_suscrita: 'Acta suscrita',
  remitida: 'Remitida',
  recibida_etts: 'Recibida por el ETTS',
  remitida_ette: 'Enviada al ETTE',
  recibida_ette: 'Recibida por el ETTE',
}

/** ¿La entrega ya salió del CC? Incluye los pasos de la cadena ETTS → ETTE. */
export function fueRemitida(estado?: EstadoEntrega | string | null): boolean {
  return (
    estado === 'remitida' || estado === 'recibida_etts' || estado === 'remitida_ette' || estado === 'recibida_ette'
  )
}

/** CC hijo que aún no envía (advertencia al remitir el padre, D-08). */
export interface HijoPendiente {
  id: number
  codigo: string
  nombre: string
  estado: EstadoEntrega
}

/** Aceptada por el coordinador y en firma (con o sin el acta ya suscrita por ambos lados). */
export function estaEnFirma(estado?: EstadoEntrega | string | null): boolean {
  return estado === 'verificada' || estado === 'acta_suscrita'
}

export interface EntregaDetalle {
  id: number
  estado: EstadoEntrega
  destino_id: number | null
  hacia_etts: boolean
  presentada_en: string | null
  presentada_por: string | null
  verificada_en: string | null
  verificada_por: string | null
  verificada_en_calidad_de: 'coordinador' | 'titular_suplente' | null
  resultado_verificacion: string | null
  remitida_en: string | null
  comentario: string | null
  hijos_pendientes_al_remitir: HijoPendiente[]
  recibida_etts_en: string | null
  remitida_ette_en: string | null
  recibida_ette_en: string | null
}

export interface DependenciaResumen {
  id: number
  codigo: string
  nombre: string
  nivel: number
  parent_id: number | null
  activa?: boolean
  encargado?: {
    id: number
    dni?: string
    nombres: string
    apellidos: string
    cargo: string | null
  } | null
}

export interface EstadoEntregaResponse {
  dependencia: DependenciaResumen
  anexo02_gestion: {
    existe: boolean
    estado: string
  }
  anexo03_acervo: {
    total_series: number
  }
  anexo04_patrimonio: {
    total_bienes: number
    confirmados: number
    pendientes: number
    porcentaje_avance: number
  }
  anexo05_personal: {
    total_personal: number
  }
  anexo06_nopatrimonial: {
    total_bienes: number
  }
  /** Observaciones registradas por el coordinador ETTE (constancia, D-07). */
  observaciones: number
  entrega: EntregaDetalle | null
  /** Hijos directos que aún no envían su entrega. */
  hijos_pendientes: HijoPendiente[]
}

export interface ResumenDocumentosResponse {
  dependencia_id: number
  total_pendientes: number
  por_estado: Record<string, number>
}

export interface RemitirEntregaPayload {
  dependencia_id: number
  comentario?: string
  /** El padre remite aunque falten hijos (D-08). */
  confirmar_sin_hijos?: boolean
}

export interface VerificarEntregaPayload {
  dependencia_id: number
  resultado_verificacion: string
  /** Obligatorio cuando acepta un titular ETTE en suplencia del coordinador. */
  motivo_suplencia?: string
}

export interface EntregaItem {
  id: number
  proceso_transferencia_id: number
  dependencia_id: number
  dependencia_destino_id: number | null
  emisor_id: number | null
  estado: EstadoEntrega
  presentada_en: string | null
  verificada_en: string | null
  remitida_en: string | null
  comentario: string | null
  created_at: string
  updated_at: string
  dependencia: DependenciaResumen
  dependencia_destino?: DependenciaResumen | null
  emisor?: {
    id: number
    name: string
    dni: string
  } | null
}

export interface FiltrosEntregas {
  dependencia_id?: number
  estado?: EstadoEntrega
  per_page?: number
  page?: number
}

export interface DependenciaSemaforoItem {
  id: number
  codigo: string
  nombre: string
  nivel: number
  parent_id: number | null
  encargado: {
    id: number
    nombres: string
    apellidos: string
    cargo: string | null
  } | null
  estado_entrega: EstadoEntrega
  observaciones: number
  patrimonio_total: number
  patrimonio_confirmados: number
  patrimonio_porcentaje: number
  presentada_en: string | null
  verificada_en: string | null
  remitida_en: string | null
  /** El CC remitió después de que su padre ya había remitido (D-08). */
  enviado_tarde: boolean
  /** Plazo de la siguiente acción del CC según el cronograma (F-16). */
  plazo: PlazoCentroCosto | null
}

/** Situación del plazo de la siguiente acción de un CC (días hábiles). */
export interface PlazoCentroCosto {
  accion: 'presentar' | 'verificar' | 'firmar' | 'remitir'
  accion_etiqueta: string
  actividad: string
  fecha_vencimiento: string
  hora_vencimiento: string | null
  dias_habiles: number
  vencido: boolean
}

export interface MetricasTablero {
  total_dependencias: number
  borrador: number
  en_revision: number
  verificadas: number
  /** Subtotal de `verificadas` con el acta suscrita por ambos lados. */
  acta_suscrita: number
  /** Remitidas, incluidas las que siguen la cadena ETTS → ETTE. */
  remitidas: number
  recibidas_etts: number
  remitidas_ette: number
  recibidas_ette: number
  porcentaje_avance: number
  /** CC cuya siguiente acción tiene el plazo vencido. */
  plazos_vencidos: number
  patrimonio: {
    total_bienes: number
    verificados: number
    pendientes: number
    porcentaje: number
    valor_total: number
  }
}

export interface TableroOperativoData {
  metricas: MetricasTablero
  dependencias: DependenciaSemaforoItem[]
}

/** Fila del consolidado del CC padre: su subárbol con autoría (RF-43). */
export interface CentroConsolidado {
  id: number
  codigo: string
  nombre: string
  nivel: number
  es_propio: boolean
  padre: { id: number; codigo: string; nombre: string } | null
  estado: EstadoEntrega
  estado_etiqueta: string
  presentada_por: string | null
  presentada_en: string | null
  verificada_por: string | null
  verificada_en_calidad_de: 'coordinador' | 'titular_suplente' | null
  remitida_por: string | null
  remitida_en: string | null
  enviado_tarde: boolean
  anexos: { anexo02: boolean; anexo03: number; anexo04: number; anexo05: number; anexo06: number }
  observaciones: number
}

export interface ConsolidadoResponse {
  centro: { id: number; codigo: string; nombre: string }
  centros: CentroConsolidado[]
  resumen: { total: number; remitidos: number; pendientes: number; enviados_tarde: number }
}

/** CC que envía al ETTS, en la bandeja de la cadena ETTS → ETTE. */
export interface EntregaCadenaEtts {
  id: number
  codigo: string
  nombre: string
  nivel: number
  estado: EstadoEntrega
  estado_etiqueta: string
  remitida_por: string | null
  remitida_en: string | null
  recibida_etts_por: string | null
  recibida_etts_en: string | null
  envio_ette: { id: number; codigo: string } | null
  remitida_ette_en: string | null
  recibida_ette_por: string | null
  recibida_ette_en: string | null
  subarbol: { total: number; remitidos: number; enviados_tarde: number }
}

/** Lote enviado del ETTS al ETTE, con su constancia (RF-75). */
export interface EnvioEtte {
  id: number
  codigo: string
  enviado_en: string
  enviado_por: string | null
  comentario: string | null
  centros: { id: number; codigo: string; nombre: string; estado: EstadoEntrega }[]
}
