/**
 * Gestión del token Bearer de Sanctum y ciclo de vida de sesión (plan §3).
 *
 * 1. Persistencia y cierre al salir del navegador:
 *    - Token guardado en localStorage.
 *    - Cookie de sesión 'sistransfer_activa': no tiene fecha de expiración (Session Cookie).
 *      Cuando el usuario cierra por completo el navegador, el navegador destruye la cookie.
 *      Al reabrir el navegador, se detecta la ausencia de la cookie y se invalida la sesión.
 *
 * 2. Control de inactividad (1 hora = 3600 segundos):
 *    - 'sistransfer.ultima_actividad': marca de tiempo compartida entre pestañas.
 *    - Si transcurren más de 60 minutos sin interacción, la sesión caduca automáticamente.
 */

const STORAGE_KEY = 'sistransfer.token'
const SESSION_COOKIE_KEY = 'sistransfer_activa'
const ACTIVIDAD_KEY = 'sistransfer.ultima_actividad'
const MOTIVO_CIERRE_KEY = 'sistransfer.motivo_cierre'

export const TIEMPO_MAXIMO_INACTIVIDAD_MS = 60 * 60 * 1000 // 1 hora en ms

function hayCookieDeSesion(): boolean {
  try {
    if (typeof document === 'undefined') return true
    return document.cookie
      .split(';')
      .some((c) => c.trim().startsWith(`${SESSION_COOKIE_KEY}=`))
  } catch {
    return true
  }
}

function establecerCookieSesion(): void {
  try {
    if (typeof document !== 'undefined') {
      document.cookie = `${SESSION_COOKIE_KEY}=1; path=/; SameSite=Lax`
    }
  } catch {
    /* no-op */
  }
}

function eliminarCookieSesion(): void {
  try {
    if (typeof document !== 'undefined') {
      document.cookie = `${SESSION_COOKIE_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
    }
  } catch {
    /* no-op */
  }
}

export function registrarActividad(): void {
  try {
    localStorage.setItem(ACTIVIDAD_KEY, Date.now().toString())
  } catch {
    /* no-op */
  }
}

export function obtenerUltimaActividad(): number | null {
  try {
    const valor = localStorage.getItem(ACTIVIDAD_KEY)
    return valor ? parseInt(valor, 10) : null
  } catch {
    return null
  }
}

export function haCaducadoPorInactividad(): boolean {
  const ultima = obtenerUltimaActividad()
  if (!ultima) return false
  return Date.now() - ultima > TIEMPO_MAXIMO_INACTIVIDAD_MS
}

export function marcarCierrePorInactividad(): void {
  try {
    localStorage.setItem(MOTIVO_CIERRE_KEY, 'inactividad')
  } catch {
    /* no-op */
  }
}

export function obtenerYLimpiarMotivoCierre(): string | null {
  try {
    const motivo = localStorage.getItem(MOTIVO_CIERRE_KEY)
    if (motivo) {
      localStorage.removeItem(MOTIVO_CIERRE_KEY)
    }
    return motivo
  } catch {
    return null
  }
}

export function obtenerToken(): string | null {
  try {
    const token = localStorage.getItem(STORAGE_KEY)
    if (!token) return null

    // 1. Si el navegador fue cerrado por completo, la cookie de sesión ya no existe.
    if (!hayCookieDeSesion()) {
      limpiarToken()
      return null
    }

    // 2. Si transcurrió más de 1 hora de inactividad desde la última interacción.
    if (haCaducadoPorInactividad()) {
      marcarCierrePorInactividad()
      limpiarToken()
      return null
    }

    return token
  } catch {
    return null
  }
}

export function guardarToken(token: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, token)
    establecerCookieSesion()
    registrarActividad()
  } catch {
    /* almacenamiento no disponible: la sesión vivirá solo en memoria */
  }
}

export function limpiarToken(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(ACTIVIDAD_KEY)
    eliminarCookieSesion()
  } catch {
    /* no-op */
  }
}
