import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
import { SourceTextModule, SyntheticModule } from 'node:vm'
import { QueryClient } from '@tanstack/react-query'

async function cargarHooks(ruta, cliente) {
  const codigo = await readFile(new URL(ruta, import.meta.url), 'utf8')
  const modulo = new SourceTextModule(stripTypeScriptTypes(codigo))
  await modulo.link((nombre) => {
    const exportaciones = nombre === '@tanstack/react-query'
      ? { useQuery: (opciones) => opciones, useMutation: (opciones) => opciones, useQueryClient: () => cliente }
      : nombre === 'sonner'
        ? { toast: { success() {} } }
        : nombre === './gestion.service'
          ? { gestionService: {} }
          : nombre === './patrimonio.service'
            ? { patrimonioService: {} }
            : nombre === '@/lib/api-errors'
              ? { notificarError() {} }
          : { obtenerEstadoEntrega() {}, obtenerResumenDocumentos() {}, obtenerTableroOperativo() {}, remitirEntrega() {}, revisarEntrega() {} }
    return new SyntheticModule(Object.keys(exportaciones), function () {
      for (const [clave, valor] of Object.entries(exportaciones)) this.setExport(clave, valor)
    })
  })
  await modulo.evaluate()
  return modulo.namespace
}

test('verificar patrimonio actualiza la fila guardada sin esperar la recarga de la lista', async () => {
  const cliente = new QueryClient()
  try {
    const patrimonio = await cargarHooks('../src/features/patrimonio/use-patrimonio.ts', cliente)
    const consulta = patrimonio.useBienesPatrimoniales({ dependencia_id: 12 }).queryKey
    const bien = { id: 24, dependencia_id: 12, verificacion: { estado: 'pendiente' } }
    const otroBien = { id: 25, dependencia_id: 12, verificacion: { estado: 'pendiente' } }
    const guardado = { ...bien, ubicacion: 'Oficina', verificacion: { estado: 'confirmado' } }
    const meta = { total: 2, current_page: 1, last_page: 1, per_page: 15 }
    cliente.setQueryData(consulta, { success: true, data: [bien, otroBien], meta })
    cliente.setQueryData(['patrimonio-resumen', 12], { confirmados: 0 })
    cliente.setQueryData(['patrimonio-resumen', 13], { confirmados: 0 })
    cliente.setQueryData(['transferencia-estado', 12], { entrega: null })

    await patrimonio.useVerificarBien().onSuccess(guardado)

    assert.deepEqual(cliente.getQueryData(consulta).data, [guardado, otroBien])
    assert.deepEqual(cliente.getQueryData(consulta).meta, meta)
    assert.equal(cliente.getQueryState(['patrimonio-resumen', 12]).isInvalidated, true)
    assert.equal(cliente.getQueryState(['patrimonio-resumen', 13]).isInvalidated, false)
    assert.equal(cliente.getQueryState(['transferencia-estado', 12]).isInvalidated, true)
  } finally {
    cliente.clear()
  }
})

test('guardar el Anexo 02 invalida el estado del dashboard de su dependencia', async () => {
  const cliente = new QueryClient()
  try {
    const dashboard = await cargarHooks('../src/features/dashboard/use-dashboard.ts', cliente)
    const gestion = await cargarHooks('../src/features/gestion/use-gestion.ts', cliente)
    const actual = dashboard.useEstadoEntrega(12).queryKey
    const otraDependencia = dashboard.useEstadoEntrega(13).queryKey
    cliente.setQueryData(actual, { anexo02_gestion: { existe: true, estado: 'borrador' } })
    cliente.setQueryData(otraDependencia, { anexo02_gestion: { existe: false, estado: 'pendiente' } })

    gestion.useGuardarInformeGestion().onSuccess({ dependencia_id: 12, estado: 'completado' })

    assert.equal(cliente.getQueryState(actual).isInvalidated, true)
    assert.equal(cliente.getQueryState(otraDependencia).isInvalidated, false)
  } finally {
    cliente.clear()
  }
})

for (const hook of ['useRemitirEntrega', 'useRevisarEntrega']) {
  test(`${hook} actualiza la misma consulta que muestra el dashboard`, async () => {
    const cliente = new QueryClient()
    try {
      const dashboard = await cargarHooks('../src/features/dashboard/use-dashboard.ts', cliente)
      const consulta = dashboard.useEstadoEntrega(12).queryKey
      cliente.setQueryData(consulta, { entrega: { estado: 'borrador' } })

      dashboard[hook]().onSuccess(undefined, { dependencia_id: 12, accion: 'consolidar' })

      assert.equal(cliente.getQueryState(consulta).isInvalidated, true)
    } finally {
      cliente.clear()
    }
  })
}
