/**
 * Persistencia del token Bearer de Sanctum en localStorage (plan §3).
 * Un único punto de acceso para que el interceptor de axios y el contexto de
 * auth no dupliquen la clave.
 */

const STORAGE_KEY = 'sistransfer.token'

export function obtenerToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function guardarToken(token: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, token)
  } catch {
    /* almacenamiento no disponible: la sesión vivirá solo en memoria */
  }
}

export function limpiarToken(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* no-op */
  }
}
