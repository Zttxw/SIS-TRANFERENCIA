import { test } from 'node:test'
import assert from 'node:assert/strict'
import { comprobarServicioFirma, entornoFirma, enlaceInstalador, enlaceSistemaEnEdge, urlInstalador } from '../src/features/firmaperu/equipo-firmaperu.ts'

const windowsChrome = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/145.0 Safari/537.36'
const windowsEdge = `${windowsChrome} Edg/145.0`
const mac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) Version/17 Safari/605'

test('un servicio disponible se reconoce sin abrir ni descargar instaladores', async () => {
  let peticion
  const listo = await comprobarServicioFirma(new AbortController().signal, async (url, opciones) => {
    peticion = [url, opciones]
    return new Response(JSON.stringify({ status: 'ok' }), { headers: { 'Content-Type': 'application/json' } })
  })

  assert.equal(listo, true)
  assert.equal(peticion[0], 'http://localhost:48596/firmaperu/sign')
  assert.equal(peticion[1].method, 'GET')
  assert.equal(peticion[1].credentials, 'omit')
})

test('un fallo de red se informa como servicio sin respuesta, no como programa no instalado', async () => {
  const disponible = await comprobarServicioFirma(new AbortController().signal, async () => { throw new TypeError('Failed to fetch') })
  assert.equal(disponible, false)
})

test('una respuesta de otro programa en el puerto no se confunde con Firma Perú', async () => {
  assert.equal(await comprobarServicioFirma(new AbortController().signal, async () => new Response('{"status":"otro"}')), false)
  assert.equal(await comprobarServicioFirma(new AbortController().signal, async () => new Response('html sin JSON')), false)
  assert.equal(await comprobarServicioFirma(new AbortController().signal, async () => new Response('{"status":"ok"}', { status: 500 })), false)
})

test('salir del diálogo cancela la comprobación', async () => {
  const abortar = new AbortController()
  abortar.abort(new Error('Pantalla cerrada'))
  let consultado = false

  await assert.rejects(comprobarServicioFirma(abortar.signal, async () => { consultado = true }), /Pantalla cerrada/)
  assert.equal(consultado, false)
})

test('resuelve el instalador con API relativa, absoluta y en subdirectorio', () => {
  assert.equal(urlInstalador('/api', 'http://localhost:8000'), 'http://localhost:8000/api/firmaperu/cliente/FirmaPeruWeb.application?port=48596')
  assert.equal(urlInstalador('https://api.example/api/', 'https://web.example'), 'https://api.example/api/firmaperu/cliente/FirmaPeruWeb.application?port=48596')
  assert.equal(urlInstalador('/transferencia/api', 'https://web.example'), 'https://web.example/transferencia/api/firmaperu/cliente/FirmaPeruWeb.application?port=48596')
  assert.throws(() => urlInstalador('javascript:alert(1)', 'https://web.example'))
  assert.throws(() => urlInstalador('https://usuario:clave@api.example/api', 'https://web.example'))
})

test('en Windows dirige la activación a Edge sin modificar el manifiesto', () => {
  const url = 'http://localhost:8000/api/firmaperu/cliente/FirmaPeruWeb.application?port=48596'
  assert.deepEqual(entornoFirma(windowsEdge), { windows: true, edge: true })
  assert.equal(enlaceInstalador(url, windowsEdge), url)
  assert.equal(enlaceInstalador(url, windowsChrome), `microsoft-edge:${url}`)
  assert.equal(enlaceInstalador(url, mac), null)
})

test('el respaldo abre el sistema en Edge sin trasladar parámetros ni fragmentos de sesión', () => {
  assert.equal(enlaceSistemaEnEdge('https://transferencia.example/anexos/01?token=privado&dependencia=49#sesion', windowsChrome),
    'microsoft-edge:https://transferencia.example/anexos/01')
  assert.equal(enlaceSistemaEnEdge('http://localhost:8000/transferencia/anexos/02', windowsChrome),
    'microsoft-edge:http://localhost:8000/transferencia/anexos/02')
})

test('el respaldo no se ofrece dentro de Edge ni fuera de Windows', () => {
  assert.equal(enlaceSistemaEnEdge('https://transferencia.example/anexos/01', windowsEdge), null)
  assert.equal(enlaceSistemaEnEdge('https://transferencia.example/anexos/01', mac), null)
})

test('el respaldo rechaza esquemas ejecutables y credenciales en la URL', () => {
  assert.throws(() => enlaceSistemaEnEdge('javascript:alert(1)', windowsChrome))
  assert.throws(() => enlaceSistemaEnEdge('https://usuario:clave@transferencia.example/anexos/01', windowsChrome))
  assert.throws(() => enlaceSistemaEnEdge('file:///C:/Windows/test.exe', windowsChrome))
})
