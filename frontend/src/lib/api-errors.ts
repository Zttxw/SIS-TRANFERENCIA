/**
 * Mapa único de errores de la API → UI (F3, plan-mejoras-frontend §4).
 *
 * El interceptor de `lib/api.ts` ya normaliza **todo** error a `ApiError` con
 * forma plana (`status`, `message`, `errors`). Antes, cada `use-*.ts` intentaba
 * leer `error?.response?.data?.message` (la forma cruda de axios), que tras la
 * normalización **ya no existe** → esa rama era código muerto y el usuario veía
 * el mensaje genérico. Aquí se centraliza la traducción, una sola vez, con copy
 * en español y acción cuando aplica.
 */

import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { toast } from 'sonner'

import { ApiError } from '@/types/api'

export interface OpcionesMensajeError {
  /** Mensaje por defecto si no se puede derivar nada más específico. */
  porDefecto?: string
  /**
   * Copy a mostrar en un 409 (conflicto de flujo, RN-13). Si se omite, se usa
   * el `message` que envía el backend (que ya suele ser accionable).
   */
  conflicto?: string
}

/**
 * Traduce cualquier error a un mensaje en español accionable, reaccionando por
 * `status`. No muestra nada: solo devuelve el texto (quien llama decide toast /
 * inline). Es el punto de verdad del copy de errores.
 */
export function mensajeDeError(error: unknown, opciones: OpcionesMensajeError = {}): string {
  const { porDefecto = 'Ocurrió un error inesperado. Intente nuevamente.', conflicto } = opciones

  if (error instanceof ApiError) {
    if (error.isNetworkError) {
      return 'No se pudo conectar con el servidor. Verifique su conexión e intente de nuevo.'
    }
    if (error.esNoAutorizado) {
      return 'Su sesión caducó. Vuelva a iniciar sesión para continuar.'
    }
    if (error.esProhibido) {
      return error.message || 'No tiene acceso a esta acción o está fuera de su ámbito.'
    }
    if (error.esConflictoFlujo) {
      // RN-13: el 409 es información accionable, nunca se oculta.
      return conflicto ?? error.message ??
        'La entrega ya fue remitida o consolidada; para editarla, el revisor debe observarla primero.'
    }
    if (error.esValidacion) {
      return error.message || 'Hay datos inválidos en el formulario. Revise los campos marcados.'
    }
    return error.message || porDefecto
  }

  if (error instanceof Error && error.message) return error.message
  return porDefecto
}

/**
 * Muestra el error como toast con el copy traducido. Reemplaza los bloques
 * `onError` repetidos de los `use-*.ts`. No toastea:
 *  - el 401 (el interceptor ya redirige por sesión caducada), ni
 *  - el 422 (validación): esos errores se pintan junto al campo vía
 *    `aplicarErroresAFormulario`, no como toast, para no duplicar el mensaje.
 */
export function notificarError(error: unknown, opciones: OpcionesMensajeError = {}): void {
  if (error instanceof ApiError && (error.esNoAutorizado || error.esValidacion)) return
  toast.error(mensajeDeError(error, opciones))
}

/**
 * Mapea los `errors` de un 422 a los campos de un formulario de react-hook-form.
 * Antes se hacía a mano y de forma inconsistente; aquí marca el campo exacto con
 * el primer mensaje del backend. Devuelve `true` si hubo errores de validación
 * aplicados (para decidir si además se toastea un mensaje general o no).
 *
 *   onError: (error) => {
 *     if (!aplicarErroresAFormulario(error, setError)) notificarError(error)
 *   }
 */
export function aplicarErroresAFormulario<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): boolean {
  if (!(error instanceof ApiError) || !error.esValidacion || !error.errors) {
    return false
  }

  let alguno = false
  for (const [campo, mensajes] of Object.entries(error.errors)) {
    const mensaje = mensajes?.[0]
    if (!mensaje) continue
    // Laravel puede devolver claves anidadas (`anexos.0.serie`); RHF las acepta
    // como `Path` de puntos. El cast es seguro porque la clave viene del backend.
    setError(campo as Path<T>, { type: 'server', message: mensaje })
    alguno = true
  }
  return alguno
}
