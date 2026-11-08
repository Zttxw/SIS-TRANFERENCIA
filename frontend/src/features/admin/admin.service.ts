import { api } from '@/lib/api'
import type { ApiPaginated, ApiSuccess } from '@/types/api'
import type {
  ActivarCuentaPayload,
  FiltrosServidores,
  PropuestaActivacion,
  ResultadoActivacion,
  ServidorPadronItem,
} from '@/types/admin'

export const adminService = {
  /**
   * Obtiene el listado paginado de servidores del padrón institucional.
   * Permite filtrar por DNI, nombres/apellidos o cargo.
   */
  async listarServidores(filtros?: FiltrosServidores): Promise<ApiPaginated<ServidorPadronItem>> {
    const params: Record<string, string | number> = {}
    if (filtros?.buscar && filtros.buscar.trim() !== '') {
      params.buscar = filtros.buscar.trim()
    }
    if (filtros?.page) {
      params.page = filtros.page
    }

    const res = await api.get<ApiPaginated<ServidorPadronItem>>('/servidores', {
      params,
    })
    return res.data
  },

  /**
   * Consulta los roles que le corresponderían al servidor al activarse (preparación).
   */
  async prepararActivacion(servidorId: number): Promise<PropuestaActivacion> {
    const res = await api.post<ApiSuccess<PropuestaActivacion>>(
      `/servidores/${servidorId}/preparar-activacion`
    )
    return res.data.data
  },

  /**
   * Activa la cuenta del servidor asignándole una contraseña inicial y sus roles de ámbito.
   */
  async activarCuenta(
    servidorId: number,
    payload: ActivarCuentaPayload
  ): Promise<ResultadoActivacion> {
    const res = await api.post<ApiSuccess<ResultadoActivacion>>(
      `/servidores/${servidorId}/activar`,
      payload
    )
    return res.data.data
  },
}
