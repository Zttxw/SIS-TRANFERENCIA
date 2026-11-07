export type EstadoObservacion = 'abierta' | 'en_subsanacion' | 'subsanada' | 'desestimada'

export type ClaveAnexoObservable =
  | 'gestion'
  | 'acervo'
  | 'patrimonio'
  | 'personal'
  | 'nopatrimonial'
  | 'documento'

export interface Observacion {
  id: number
  proceso_transferencia_id: number
  observable_type: string
  observable_id: number
  autor_id: number
  responsable_id: number | null
  descripcion: string
  estado: EstadoObservacion
  respuesta_subsanacion: string | null
  subsanada_en: string | null
  created_at: string
  updated_at: string
  autor?: {
    id: number
    name: string
    dni: string
  }
  responsable?: {
    id: number
    name: string
    dni: string
  }
  observable?: Record<string, any>
}

export interface RegistrarObservacionPayload {
  anexo: ClaveAnexoObservable
  observable_id: number
  descripcion: string
}

export interface SubsanarObservacionPayload {
  id: number
  respuesta: string
}

export interface DesestimarObservacionPayload {
  id: number
  sustento?: string
}

export interface FiltrosObservaciones {
  dependencia_id?: number
  anexo?: ClaveAnexoObservable
  estado?: EstadoObservacion
  per_page?: number
  page?: number
}

export interface InfoAnexoObservable {
  clave: ClaveAnexoObservable
  nombre: string
  nombreCorto: string
  ruta: string
  numero: string
}

export const ANEXOS_OBSERVABLES_CONFIG: Record<ClaveAnexoObservable, InfoAnexoObservable> = {
  documento: {
    clave: 'documento',
    nombre: 'Anexo 01 · Asuntos y Documentos Pendientes',
    nombreCorto: 'Anexo 01 (Documentos)',
    ruta: '/documentos',
    numero: '01',
  },
  gestion: {
    clave: 'gestion',
    nombre: 'Anexo 02 · Informe de Gestión',
    nombreCorto: 'Anexo 02 (Gestión)',
    ruta: '/gestion',
    numero: '02',
  },
  acervo: {
    clave: 'acervo',
    nombre: 'Anexo 03 · Acervo Documental',
    nombreCorto: 'Anexo 03 (Acervo)',
    ruta: '/acervo',
    numero: '03',
  },
  patrimonio: {
    clave: 'patrimonio',
    nombre: 'Anexo 04 · Inventario Patrimonial',
    nombreCorto: 'Anexo 04 (Patrimonio)',
    ruta: '/patrimonio',
    numero: '04',
  },
  personal: {
    clave: 'personal',
    nombre: 'Anexo 05 · Personal a Cargo',
    nombreCorto: 'Anexo 05 (Personal)',
    ruta: '/personal',
    numero: '05',
  },
  nopatrimonial: {
    clave: 'nopatrimonial',
    nombre: 'Anexo 06 · Bienes No Patrimoniales',
    nombreCorto: 'Anexo 06 (No Patrimonial)',
    ruta: '/nopatrimonial',
    numero: '06',
  },
}

export function resolverAnexoDesdeTipo(observableType: string): InfoAnexoObservable {
  if (observableType.includes('InformeGestion') || observableType === 'gestion') {
    return ANEXOS_OBSERVABLES_CONFIG.gestion
  }
  if (observableType.includes('AcervoDocumental') || observableType === 'acervo') {
    return ANEXOS_OBSERVABLES_CONFIG.acervo
  }
  if (observableType.includes('BienPatrimonial') || observableType === 'patrimonio') {
    return ANEXOS_OBSERVABLES_CONFIG.patrimonio
  }
  if (observableType.includes('Personal') || observableType === 'personal') {
    return ANEXOS_OBSERVABLES_CONFIG.personal
  }
  if (observableType.includes('BienNoPatrimonial') || observableType === 'nopatrimonial') {
    return ANEXOS_OBSERVABLES_CONFIG.nopatrimonial
  }
  return ANEXOS_OBSERVABLES_CONFIG.documento
}

export function formatearDetalleObservable(obs: Observacion): string {
  const item = obs.observable
  if (!item) return `Elemento #${obs.observable_id}`
  if ('asunto' in item) {
    const num = item.numero_documento ? `${item.numero_documento} - ` : ''
    return `${num}${item.asunto || 'Sin asunto'}`
  }
  if ('codigo_patrimonial' in item) {
    return `Cód. ${item.codigo_patrimonial} · ${item.descripcion || 'Bien patrimonial'}`
  }
  if ('serie_documental' in item) {
    return `Serie: ${item.serie_documental}`
  }
  if ('dni' in item && 'nombres' in item) {
    return `${item.nombres} ${item.apellidos} (DNI ${item.dni})`
  }
  if ('descripcion' in item) {
    return `${item.descripcion}`
  }
  if ('principales_funciones' in item) {
    return `Informe de Gestión (ID #${obs.observable_id})`
  }
  return `Registro #${obs.observable_id}`
}
