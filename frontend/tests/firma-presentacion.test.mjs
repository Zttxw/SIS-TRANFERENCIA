import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { SourceTextModule, SyntheticModule } from 'node:vm'
import * as React from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import { transformWithOxc } from 'vite'

async function cargarComponente(ruta, dependencias) {
  const archivo = new URL(ruta, import.meta.url)
  const { code } = await transformWithOxc(
    await readFile(archivo, 'utf8'),
    archivo.pathname,
  )
  const modulo = new SourceTextModule(code)
  await modulo.link((nombre) => {
    const exportaciones =
      nombre === 'react/jsx-runtime' ? jsxRuntime : dependencias[nombre]
    assert.ok(exportaciones, `Dependencia de presentación conocida: ${nombre}`)
    return new SyntheticModule(Object.keys(exportaciones), function () {
      for (const [clave, valor] of Object.entries(exportaciones))
        this.setExport(clave, valor)
    })
  })
  await modulo.evaluate()
  return modulo.namespace
}

async function renderizarBoton(estado) {
  const icono = () => null
  const { BotonFirmaPeru } = await cargarComponente(
    '../src/features/firmaperu/BotonFirmaPeru.tsx',
    {
      react: React,
      '@tanstack/react-query': {
        useQuery: () => ({ data: estado }),
        useQueryClient: () => ({}),
      },
      'lucide-react': {
        Download: icono,
        FileWarning: icono,
        Loader2: icono,
        PenLine: icono,
        Plus: icono,
        Settings2: icono,
      },
      sonner: { toast: {} },
      '@/auth/hooks': { usePermiso: () => true },
      '@/components/ui/button': {
        Button: ({ children, variant: _variant, size: _size, ...props }) =>
          React.createElement('button', props, children),
      },
      '@/components/ui/dropdown-menu': {
        DropdownMenu: () => null,
        DropdownMenuItem: () => null,
      },
      '@/components/ui/confirm-dialog': { useConfirm: () => async () => true },
      '@/components/ui/tooltip': { Tooltip: ({ children }) => children },
      './firmaperu.service': { firmaperuService: {} },
      './firmaperu-runtime': { firmarConCliente() {} },
      './equipo-firmaperu': { comprobarServicioFirma() {} },
      './PrepararEquipoFirma': { PrepararEquipoFirma: () => null },
    },
  )
  return renderToStaticMarkup(
    React.createElement(BotonFirmaPeru, {
      tipoDocumento: 'anexo03',
      dependenciaId: 12,
      compacto: true,
    }),
  )
}

test('un documento sin firma ofrece la acción directa de firmar', async () => {
  const html = await renderizarBoton({ firmado: false, vigente: false })
  assert.match(html, /aria-label="Firmar con Firma Perú"/)
})

test('una firma histórica permite firmar nuevamente el contenido actual', async () => {
  const html = await renderizarBoton({ firmado: true, vigente: false })
  assert.match(html, /aria-label="Firmar con Firma Perú"/)
})

test('una firma vigente ofrece la descarga como acción principal', async () => {
  const html = await renderizarBoton({ firmado: true, vigente: true })
  assert.match(html, /aria-label="Descargar PDF firmado"/)
  assert.doesNotMatch(html, /aria-label="Firmar con Firma Perú"/)
})

for (const consolidada of [false, true]) {
  test(`el acta ${consolidada ? 'habilita' : 'bloquea'} la firma con entrega ${consolidada ? 'consolidada' : 'en preparación'}`, async () => {
    const { TablaAnexos } = await cargarComponente(
      '../src/features/dashboard/TablaAnexos.tsx',
      {
        react: { useState: () => ['anexo07', () => {}] },
        'react-router-dom': {
          Link: ({ children }) => React.createElement('a', null, children),
        },
        'lucide-react': { ArrowRight: () => null, ChevronDown: () => null },
        '@/components/ui/button': { buttonVariants: () => '' },
        '@/features/firmaperu/DocumentoFirmaDetalle': {
          DocumentoFirmaDetalle: ({ bloqueado }) =>
            React.createElement('span', {
              'data-firma-bloqueada': String(bloqueado),
            }),
        },
        '@/features/firmaperu/MiniEstadoFirma': { MiniEstadoFirma: () => null },
        '@/features/firmaperu/ConstanciaAusenciaEtte': {
          ConstanciaAusenciaEtte: () => null,
        },
        '@/lib/utils': { cn: (...clases) => clases.filter(Boolean).join(' ') },
      },
    )
    const html = renderToStaticMarkup(
      React.createElement(TablaAnexos, {
        dependenciaId: 12,
        entregaConsolidada: consolidada,
        filas: [
          {
            id: 'anexo07',
            tipoFirma: 'anexo07',
            codigo: '07',
            nombre: 'Acta',
            estado: 'Pendiente',
            icono: () => null,
            ruta: '/acta',
          },
        ],
      }),
    )
    assert.match(html, new RegExp(`data-firma-bloqueada="${!consolidada}"`))
  })
}
