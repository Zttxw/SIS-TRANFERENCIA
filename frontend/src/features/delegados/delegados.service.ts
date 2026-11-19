import { api } from '@/lib/api'
import { descargarArchivo } from '@/lib/descargas'
import type { ApiSuccess } from '@/types/api'

export interface CuentaDelegado {
  id: number
  dni: string
  name: string
  email?: string | null
  celular?: string | null
}

/** Designación de un coordinador ETTE (rol interno `delegado_ette`) a un CC. */
export interface DesignacionDelegado {
  id: number
  usuario: CuentaDelegado
  dependencia: { id: number; codigo: string; nombre: string; nivel?: number | null }
  acreditada_en: string | null
  acreditada_por: { id: number; name: string } | null
  observacion: string | null
  reemplaza_a_id: number | null
  motivo_reemplazo: string | null
  reemplaza_a: { id: number; usuario: CuentaDelegado | null } | null
  revocada_en: string | null
  revocada_por: { id: number; name: string } | null
}

export type AccionImportacion = 'crear_usuario' | 'asignar' | 'ya_asignado' | 'error'

export interface ResultadoFilaImportacion {
  fila: number
  dni: string
  nombre: string
  codigo_cc: string
  centro_costo: string | null
  accion: AccionImportacion
  motivo: string | null
  avisos: string[]
}

export interface ResultadoImportacion {
  resultados: ResultadoFilaImportacion[]
  resumen: Record<AccionImportacion, number>
  /** Solo al confirmar: contraseñas temporales de las cuentas creadas (se muestran una vez). */
  credenciales?: { dni: string; nombre: string; password: string }[]
}

export interface CuentaExternaNueva {
  dni: string
  name: string
  email?: string
  celular?: string
  password: string
}

export interface CoordinadoresDeMiCentro {
  dependencia: { id: number; codigo: string; nombre: string }
  coordinadores: { nombre: string; dni: string; correo: string | null; celular: string | null; acreditado_en: string | null }[]
  reemplazos: { anterior: string | null; nuevo: string | null; motivo: string | null; fecha: string | null }[]
}

export const delegadosService = {
  async listar() {
    const { data } = await api.get<ApiSuccess<DesignacionDelegado[]>>('/delegados')
    return data.data
  },
  async historial() {
    const { data } = await api.get<ApiSuccess<DesignacionDelegado[]>>('/delegados/historial')
    return data.data
  },
  async candidatos(buscar: string) {
    const { data } = await api.get<ApiSuccess<CuentaDelegado[]>>('/delegados/candidatos', { params: { buscar } })
    return data.data
  },
  async designar(payload: { user_id: number; dependencia_id: number; observacion?: string }) {
    await api.post('/delegados', payload)
  },
  async crearExterno(payload: CuentaExternaNueva & { dependencia_id: number; observacion?: string }) {
    await api.post('/delegados/externos', payload)
  },
  async revocar(id: number) {
    await api.delete(`/delegados/${id}`)
  },
  async reemplazar(id: number, payload: { motivo: string; user_id?: number; nuevo?: CuentaExternaNueva }) {
    const { data } = await api.post<ApiSuccess<DesignacionDelegado>>(`/delegados/${id}/reemplazar`, payload)
    return data.data
  },
  async importar(archivo: File, modo: 'previsualizar' | 'confirmar') {
    const cuerpo = new FormData()
    cuerpo.append('archivo', archivo)
    cuerpo.append('modo', modo)
    const { data } = await api.post<ApiSuccess<ResultadoImportacion>>('/delegados/importar', cuerpo, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data.data
  },
  descargarPlantilla() {
    return descargarArchivo('/delegados/plantilla', undefined, 'plantilla-coordinadores-ette.xlsx')
  },
  descargarRelacion() {
    return descargarArchivo('/delegados/relacion/pdf', undefined, 'relacion-coordinadores-ette.pdf')
  },
  descargarConstancia(id: number) {
    return descargarArchivo(`/delegados/${id}/constancia-reemplazo/pdf`, undefined, `constancia-reemplazo-${id}.pdf`)
  },
  async misCoordinadores() {
    const { data } = await api.get<ApiSuccess<CoordinadoresDeMiCentro[]>>('/coordinadores-ette/mis-centros')
    return data.data
  },
}
