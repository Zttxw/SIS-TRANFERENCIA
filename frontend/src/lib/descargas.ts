import { api } from '@/lib/api'
import { ApiError } from '@/types/api'

/**
 * Descarga autenticada de un recurso binario (PDF/Excel) del backend.
 *
 * Usa el mismo cliente axios que el resto de la app, por lo que hereda el
 * `Authorization: Bearer <token>` del interceptor. Dispara la descarga en el
 * navegador creando un enlace temporal (patrón de `descargarEvidencia` del Acta,
 * unificado aquí para anexos, reportes y el expediente de entrega — F5).
 *
 * Si el backend responde con un error (p. ej. 409 al pedir el paquete sin
 * consolidar), el cuerpo llega como Blob JSON; se decodifica y se relanza como
 * `ApiError` para que la UI muestre el mensaje accionable en lugar de descargar
 * un archivo con el error dentro.
 */
export async function descargarArchivo(
  url: string,
  params?: Record<string, string | number | undefined>,
  nombrePorDefecto = 'descarga',
): Promise<void> {
  try {
    const res = await api.get<Blob>(url, { params, responseType: 'blob' })

    const nombre = nombreDesdeContentDisposition(res.headers['content-disposition']) ?? nombrePorDefecto
    const contentType = res.headers['content-type']
    const blob = new Blob([res.data], {
      type: typeof contentType === 'string' ? contentType : 'application/octet-stream',
    })

    const href = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = href
    link.setAttribute('download', nombre)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(href)
  } catch (error) {
    throw await normalizarErrorBlob(error)
  }
}

/** Extrae el nombre del archivo del header `Content-Disposition`, si existe. */
function nombreDesdeContentDisposition(header: unknown): string | null {
  if (typeof header !== 'string') return null
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header)
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * El interceptor de axios normaliza errores a `ApiError`, pero con
 * `responseType: 'blob'` el cuerpo del error queda como Blob sin parsear. Lo
 * decodificamos para recuperar `message`/`errors` y reconstruir el `ApiError`.
 */
async function normalizarErrorBlob(error: unknown): Promise<unknown> {
  if (!(error instanceof ApiError) || !(error.data instanceof Blob)) {
    return error
  }

  try {
    const texto = await error.data.text()
    const cuerpo = JSON.parse(texto) as { message?: string; errors?: Record<string, string[]> }
    return new ApiError({
      status: error.status,
      message: cuerpo.message ?? error.message,
      errors: cuerpo.errors,
    })
  } catch {
    return error
  }
}
