import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cerrarSesionSinEspera, perteneceASesionActual } from '../src/auth/sesion-runtime.ts'

test('salir limpia la sesión aunque la revocación remota todavía no responda', async () => {
  let terminar
  let limpia = false
  const pendiente = cerrarSesionSinEspera(() => new Promise((resolve) => { terminar = resolve }), () => { limpia = true })
  assert.equal(limpia, true)
  terminar()
  await pendiente
})

test('un fallo remoto no impide cerrar la sesión local', async () => {
  let limpia = false
  await cerrarSesionSinEspera(async () => { throw new Error('Sin conexión') }, () => { limpia = true })
  assert.equal(limpia, true)
})

test('un 401 antiguo no pertenece a la cuenta recién iniciada ni a una sesión cerrada', () => {
  assert.equal(perteneceASesionActual('Bearer anterior', 'nueva'), false)
  assert.equal(perteneceASesionActual('Bearer anterior', null), false)
  assert.equal(perteneceASesionActual(undefined, 'nueva'), false)
  assert.equal(perteneceASesionActual('Bearer nueva', 'nueva'), true)
})
