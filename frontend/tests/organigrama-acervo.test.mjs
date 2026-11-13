import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ancestrosVisibles } from '../src/features/organization/organigrama-utils.ts'
import { reunirPaginasAcervo } from '../src/features/acervo/paginacion-acervo.ts'
import { anioDeAgrupacion, rangoAniosAcervo } from '../src/features/acervo/agrupar-por-anio.ts'

test('el formulario recupera desde y hasta año de periodos guardados anteriormente', () => {
  const serie = { periodo: '2023 - 2024' }
  assert.deepEqual(rangoAniosAcervo(serie), { desde: 2023, hasta: 2024 })
  assert.equal(anioDeAgrupacion(serie), 2023)
  assert.deepEqual(rangoAniosAcervo({ anio: 2026, periodo: '2026' }), { desde: 2026, hasta: 2026 })
})

test('los años explícitos prevalecen sobre el periodo antiguo y los vacíos no inventan años', () => {
  assert.deepEqual(rangoAniosAcervo({ desde_anio: 2021, hasta_anio: 2022, periodo: '2023 - 2024' }), { desde: 2021, hasta: 2022 })
  assert.deepEqual(rangoAniosAcervo({ periodo: 'Sin fecha' }), { desde: null, hasta: null })
})

test('el organigrama abre la ruta hasta la oficina asignada con IDs propios de cada instalación', () => {
  const unidades = [
    { id: 801, codigo: '01', parent_id: null },
    { id: 902, codigo: '01.03', parent_id: 801 },
    { id: 1205, codigo: '01.03.07', parent_id: 902 },
    { id: 1500, codigo: '01.04', parent_id: 801 },
  ]
  assert.deepEqual([...ancestrosVisibles(unidades, [1205])].sort(), [1205, 801, 902].sort())
  assert.equal(ancestrosVisibles(unidades, [1205]).has(1500), false)
})

test('el organigrama también resuelve padres por código y tolera ciclos de datos', () => {
  assert.deepEqual([...ancestrosVisibles([{ id: 8, codigo: '01' }, { id: 19, codigo: '01.03' }], [19])].sort(), [19, 8].sort())
  assert.equal(ancestrosVisibles([{ id: 1, codigo: 'A', parent_id: 2 }, { id: 2, codigo: 'B', parent_id: 1 }], [1]).size, 2)
})

test('la vista por año reúne más de 100 series sin perder las páginas restantes', async () => {
  const llamadas = []
  const respuesta = await reunirPaginasAcervo(async (page) => {
    llamadas.push(page)
    return { success: true, data: Array.from({ length: page < 3 ? 100 : 25 }, (_, i) => (page - 1) * 100 + i),
      meta: { current_page: page, last_page: 3, total: 225, per_page: 100 } }
  })
  assert.deepEqual(llamadas, [1, 2, 3])
  assert.equal(respuesta.data.length, 225)
  assert.equal(respuesta.data.at(-1), 224)
  assert.equal(respuesta.meta.total, 225)
})

test('salir del módulo detiene la descarga de las páginas restantes', async () => {
  const controller = new AbortController()
  let llamadas = 0
  await assert.rejects(reunirPaginasAcervo(async () => {
    llamadas++
    controller.abort(new Error('Cambio de módulo'))
    return { success: true, data: [1], meta: { current_page: 1, last_page: 3, total: 3, per_page: 1 } }
  }, controller.signal), /Cambio de módulo/)
  assert.equal(llamadas, 1)
})
