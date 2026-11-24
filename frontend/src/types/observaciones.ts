/** Observación del coordinador ETTE: constancia, sin subsanación (D-07). */
export type EstadoObservacion = 'registrada' | 'retirada'

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
  dependencia_id: number
  anexo: ClaveAnexoObservable
  /** null = observación sobre el anexo completo. */
  observable_type: string | null
  observable_id: number | null
  /** Coordinador (o titular suplente) presente en la revisión. */
  autor_id: number
  /** Responsable del CC que la registró en su sesión. */
  registrada_por_id: number | null
  en_calidad_de: 'coordinador' | 'titular_suplente' | null
  motivo_suplencia: string | null
  descripcion: string
  estado: EstadoObservacion
  created_at: string
  updated_at: string
  autor?: {
    id: number
    name: string
    dni: string
  }
  registrada_por?: {
    id: number
    name: string
  } | null
  dependencia?: {
    id: number
    codigo: string
    nombre: string
  }
  observable?: Record<string, any> | null
}

/** Se observa una fila (`observable_id`) o el anexo completo de un CC (`dependencia_id`). */
export interface RegistrarObservacionPayload {
  anexo: ClaveAnexoObservable
  observable_id?: number
  dependencia_id?: number
  descripcion: string
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
    nombre: 'Asuntos y Documentos Pendientes (SGD)',
    nombreCorto: 'Documentos SGD',
    ruta: '/documentos',
    numero: 'SGD',
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


export function formatearDetalleObservable(obs: Observacion): string {
  if (obs.observable_id === null) return 'Anexo completo'
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
