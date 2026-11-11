import { test } from 'node:test'
import assert from 'node:assert/strict'
import { firmarConCliente } from '../src/features/firmaperu/firmaperu-runtime.ts'

const preparacion = () => ({ sesion_id: 'sesion-prueba', param_token: 'token-prueba',
  param_url: 'https://backend.example/api/firmaperu/param', document_extension: 'pdf',
  expires_at: new Date(Date.now() + 60000).toISOString() })
const resultado = (estado, documento_id = null) => ({ sesion_id: 'sesion-prueba', estado,
  documento_id, firmado_en: null, mensaje: null })
const opciones = (extra = {}) => ({ preparar: async () => preparacion(),
  consultar: async () => resultado('firmada', 'pdf-confirmado'),
  signal: new AbortController().signal, onMensaje: () => {}, intervaloMs: 0, ...extra })

test('signatureOk no confirma la firma antes que el backend y restaura callbacks', async () => {
  const previo = () => {}
  let consultas = 0
  let invocacion
  globalThis.window = { signatureOk: previo, startSignature: (puerto, base64) => {
    invocacion = [puerto, JSON.parse(Buffer.from(base64, 'base64').toString('utf8'))]
    window.signatureOk()
  } }

  const firmado = await firmarConCliente(opciones({ consultar: async () => {
    consultas++
    return consultas === 1 ? resultado('emitida') : resultado('firmada', 'pdf-confirmado')
  } }))

  assert.equal(consultas, 2)
  assert.equal(firmado.documento_id, 'pdf-confirmado')
  assert.deepEqual(invocacion, [48596, { param_url: 'https://backend.example/api/firmaperu/param', param_token: 'token-prueba', document_extension: 'pdf' }])
  assert.equal(window.signatureOk, previo)
})

test('rechazo del backend se propaga aunque el cliente informe éxito', async () => {
  globalThis.window = { startSignature: () => window.signatureOk() }

  await assert.rejects(firmarConCliente(opciones({ consultar: async () => ({ ...resultado('rechazada'), mensaje: 'Certificado incorrecto.' }) })), /Certificado incorrecto/)
  assert.equal(window.signatureOk, undefined)
})

test('cancelar desde el firmador libera la operación para un reintento', async () => {
  globalThis.window = { startSignature: () => window.signatureCancel() }
  await assert.rejects(firmarConCliente(opciones()), /cancelada/)

  window.startSignature = () => {}
  assert.equal((await firmarConCliente(opciones())).estado, 'firmada')
})

test('impide dos firmas simultáneas en una pestaña', async () => {
  globalThis.window = { startSignature: () => {} }
  let desbloquear
  const preparada = new Promise((resolve) => { desbloquear = resolve })
  const primera = firmarConCliente(opciones({ preparar: () => preparada }))

  await assert.rejects(firmarConCliente(opciones()), /Ya hay una firma/)
  desbloquear(preparacion())
  assert.equal((await primera).estado, 'firmada')
})

test('sesión vencida no invoca el firmador', async () => {
  let invocaciones = 0
  globalThis.window = { startSignature: () => { invocaciones++ } }

  await assert.rejects(firmarConCliente(opciones({ preparar: async () => ({ ...preparacion(), expires_at: '2000-01-01T00:00:00Z' }) })), /vencida/)
  assert.equal(invocaciones, 0)
})

test('abortar al salir de la página interrumpe la espera y limpia callbacks', async () => {
  const controlador = new AbortController()
  globalThis.window = { startSignature: () => {} }

  await assert.rejects(firmarConCliente(opciones({ signal: controlador.signal, consultar: async () => {
    controlador.abort(new Error('Página cerrada'))
    return resultado('emitida')
  } })), /Página cerrada/)
  assert.equal(window.signatureCancel, undefined)
})
