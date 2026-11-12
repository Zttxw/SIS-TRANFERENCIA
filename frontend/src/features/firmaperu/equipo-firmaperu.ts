export const PUERTO_FIRMA = 48596
export const GUIA_FIRMA = 'https://resources.firmaperu.gob.pe/documentos/firmador-componente-web.pdf'

export function entornoFirma(userAgent: string) {
  return { windows: /Windows NT/i.test(userAgent), edge: /Edg\//.test(userAgent) }
}

/** El navegador solo puede comprobar si responde el servicio, no inventariar programas instalados. */
export async function comprobarServicioFirma(signal: AbortSignal, solicitar: typeof fetch = fetch): Promise<boolean> {
  signal.throwIfAborted()
  try {
    const respuesta = await solicitar(`http://localhost:${PUERTO_FIRMA}/firmaperu/sign`, {
      method: 'GET', credentials: 'omit', cache: 'no-store',
      signal: AbortSignal.any([signal, AbortSignal.timeout(1500)]),
    })
    signal.throwIfAborted()
    if (!respuesta.ok) return false
    const datos: unknown = await respuesta.json()
    return typeof datos === 'object' && datos !== null && 'status' in datos && datos.status === 'ok'
  } catch (error) {
    if (signal.aborted) throw signal.reason ?? error
    return false
  }
}

export function urlInstalador(apiBase: string, origen: string): string {
  const api = new URL(apiBase.replace(/\/+$/, '') + '/', origen)
  if (!['http:', 'https:'].includes(api.protocol) || api.username || api.password || api.search || api.hash) {
    throw new Error('La dirección del servicio de instalación no es válida.')
  }
  const url = new URL('firmaperu/cliente/FirmaPeruWeb.application', api)
  url.searchParams.set('port', String(PUERTO_FIRMA))
  return url.toString()
}

export function enlaceInstalador(url: string, userAgent: string): string | null {
  const entorno = entornoFirma(userAgent)
  if (!entorno.windows) return null
  return entorno.edge ? url : `microsoft-edge:${url}`
}

/** Abre la página en Edge sin trasladar parámetros, credenciales ni sesión entre navegadores. */
export function enlaceSistemaEnEdge(pagina: string, userAgent: string): string | null {
  const entorno = entornoFirma(userAgent)
  if (!entorno.windows || entorno.edge) return null
  const url = new URL(pagina)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('La dirección del sistema no es válida.')
  }
  return `microsoft-edge:${url.origin}${url.pathname}`
}
