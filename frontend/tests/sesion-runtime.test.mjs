import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cerrarSesionSinEspera, perteneceASesionActual, destinoPermitidoSesion, puedeConsultarActa } from '../src/auth/sesion-runtime.ts'
import { derivarPermisos } from '../src/auth/permisos.ts'

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

test('un servidor entra al inicio si el administrador dejó abierta la gestión de usuarios', () => {
  const permisosServidor = new Set(['anexos.ver', 'anexos.registrar'])
  assert.equal(destinoPermitidoSesion('/usuarios', permisosServidor), '/')
  assert.equal(destinoPermitidoSesion('/admin', permisosServidor), '/')
  assert.equal(destinoPermitidoSesion('/usuarios/?page=2', permisosServidor), '/')
})

test('el servidor y las cuentas sin acceso al acta vuelven al inicio al abrir su enlace', () => {
  for (const rol of ['servidor', 'responsable_equipo', 'coordinador', 'ette', 'administrador']) {
    const permisos = derivarPermisos([{ rol }])
    assert.equal(puedeConsultarActa(permisos), false, rol)
    assert.equal(destinoPermitidoSesion('/acta', permisos), '/', rol)
    assert.equal(destinoPermitidoSesion('/acta/?consulta=1', permisos), '/', rol)
  }
})

test('el responsable, ETTS y delegado ETTE conservan acceso al acta según sus permisos', () => {
  for (const rol of ['responsable_centro_costo', 'etts', 'delegado_ette']) {
    const permisos = derivarPermisos([{ rol }])
    assert.equal(puedeConsultarActa(permisos), true, rol)
    assert.equal(destinoPermitidoSesion('/acta', permisos), '/acta', rol)
  }
})

test('el destino se conserva cuando la nueva cuenta tiene permiso', () => {
  assert.equal(destinoPermitidoSesion('/usuarios', new Set(['usuarios.gestionar'])), '/usuarios')
  assert.equal(destinoPermitidoSesion('/cronograma', new Set(['cronograma.gestionar'])), '/cronograma')
  assert.equal(destinoPermitidoSesion('/delegados', new Set(['delegados.gestionar'])), '/delegados')
  assert.equal(destinoPermitidoSesion('/gestion', new Set(['anexos.ver'])), '/gestion')
})

test('solo los roles responsables disponen del permiso para remitir la entrega', () => {
  for (const rol of ['servidor', 'coordinador', 'administrador', 'etts', 'ette', 'delegado_ette']) {
    assert.equal(derivarPermisos([{ rol }]).has('entregas.remitir'), false, rol)
  }
  for (const rol of ['responsable_centro_costo', 'responsable_equipo']) {
    assert.equal(derivarPermisos([{ rol }]).has('entregas.remitir'), true, rol)
  }
})

test('una cuenta sin permiso no recupera rutas de cronograma ni delegados', () => {
  assert.equal(destinoPermitidoSesion('/cronograma', new Set()), '/')
  assert.equal(destinoPermitidoSesion('/delegados', new Set()), '/')
})

test('reportes abre el inicio para servidores y admite los roles con permiso de consulta', () => {
  for (const rol of ['servidor', 'delegado_ette']) {
    const permisos = derivarPermisos([{ rol }])
    assert.equal(destinoPermitidoSesion('/reportes', permisos), '/', rol)
    assert.equal(destinoPermitidoSesion('/reportes/?vista=matriz', permisos), '/', rol)
  }
  for (const rol of ['responsable_centro_costo', 'responsable_equipo', 'coordinador', 'administrador', 'etts', 'ette']) {
    assert.equal(destinoPermitidoSesion('/reportes', derivarPermisos([{ rol }])), '/reportes', rol)
  }
})

test('un destino ausente, externo o que regresa al login abre el inicio', () => {
  for (const destino of [undefined, null, 123, 'https://example.com', '//example.com', '/\\example.com', '/login', '/login?from=usuarios']) {
    assert.equal(destinoPermitidoSesion(destino, new Set()), '/')
  }
})
