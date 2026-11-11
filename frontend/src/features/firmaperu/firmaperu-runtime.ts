import type { PreparacionFirma, SesionFirma } from './firmaperu.types'

let cargaCliente: Promise<void> | null = null
let firmaActiva = false

function cargarScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    const terminar = (error?: Error) => {
      clearTimeout(timer)
      script.onload = null
      script.onerror = null
      if (error) { script.remove(); reject(error) } else { resolve() }
    }
    const timer = setTimeout(() => terminar(new Error('El componente de Firma Perú no respondió. Intente nuevamente.')), 20000)
    script.src = url
    script.async = true
    script.onload = () => terminar()
    script.onerror = () => terminar(new Error('No se pudo cargar el componente de Firma Perú. Verifique su conexión.'))
    document.head.appendChild(script)
  })
}

async function cargarCliente(): Promise<void> {
  if (typeof window.startSignature === 'function') return
  cargaCliente ??= (async () => {
    if (!window.jQuery) await cargarScript('https://code.jquery.com/jquery-3.6.0.min.js')
    window.jqFirmaPeru = window.jQuery
    if (!document.getElementById('addComponent')) {
      const contenedor = document.createElement('div')
      contenedor.id = 'addComponent'
      contenedor.style.display = 'none'
      document.body.appendChild(contenedor)
    }
    await cargarScript('https://apps.firmaperu.gob.pe/web/clienteweb/firmaperu.min.js')
    if (typeof window.startSignature !== 'function') throw new Error('El firmador no está disponible en este navegador.')
  })().catch((error: unknown) => { cargaCliente = null; throw error })
  return cargaCliente
}

function esperar(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted()
    const abortar = () => { clearTimeout(timer); reject(signal.reason) }
    const timer = setTimeout(() => { signal.removeEventListener('abort', abortar); resolve() }, ms)
    signal.addEventListener('abort', abortar, { once: true })
  })
}

interface OpcionesFirma {
  preparar: () => Promise<PreparacionFirma>
  consultar: (id: string, signal: AbortSignal) => Promise<SesionFirma>
  signal: AbortSignal
  onMensaje: (mensaje: string) => void
  intervaloMs?: number
}

/** Una operación por pestaña; el callback del cliente nunca sustituye al backend. */
export async function firmarConCliente({ preparar, consultar, signal, onMensaje, intervaloMs = 2000 }: OpcionesFirma): Promise<SesionFirma> {
  if (firmaActiva) throw new Error('Ya hay una firma en curso en esta pestaña.')
  firmaActiva = true
  const anteriores = { init: window.signatureInit, ok: window.signatureOk, cancel: window.signatureCancel }
  const cancelacion = new AbortController()
  const operacion = AbortSignal.any([signal, cancelacion.signal])
  const init = () => onMensaje('Complete la firma en la aplicación Firma Perú.')
  const ok = () => onMensaje('Comprobando el PDF recibido…')
  const cancel = () => cancelacion.abort(new Error('La firma fue cancelada.'))
  try {
    onMensaje('Cargando Firma Perú…')
    await cargarCliente()
    operacion.throwIfAborted()
    onMensaje('Preparando el PDF guardado…')
    const sesion = await preparar()
    operacion.throwIfAborted()
    window.signatureInit = init
    window.signatureOk = ok
    window.signatureCancel = cancel
    const parametros = JSON.stringify({ param_url: sesion.param_url, param_token: sesion.param_token, document_extension: sesion.document_extension })
    const base64 = btoa(Array.from(new TextEncoder().encode(parametros), (byte) => String.fromCharCode(byte)).join(''))
    const limite = Date.parse(sesion.expires_at)
    if (!Number.isFinite(limite) || limite <= Date.now()) throw new Error('El servidor devolvió una sesión vencida o una vigencia inválida.')
    window.startSignature!(48596, base64)
    while (Date.now() < limite) {
      operacion.throwIfAborted()
      const resultado = await consultar(sesion.sesion_id, operacion)
      if (resultado.estado === 'firmada' && resultado.documento_id) return resultado
      if (resultado.estado === 'pendiente_validacion') return resultado
      if (resultado.estado === 'rechazada' || resultado.estado === 'expirada') {
        throw new Error(resultado.mensaje ?? 'La sesión fue rechazada o expiró. Inicie una nueva firma.')
      }
      await esperar(intervaloMs, operacion)
    }
    throw new Error('Se agotó el tiempo para firmar. Puede consultar el PDF firmado o iniciar una nueva sesión.')
  } catch (error) {
    if (operacion.aborted) throw operacion.reason
    throw error
  } finally {
    if (window.signatureInit === init) window.signatureInit = anteriores.init
    if (window.signatureOk === ok) window.signatureOk = anteriores.ok
    if (window.signatureCancel === cancel) window.signatureCancel = anteriores.cancel
    firmaActiva = false
  }
}
