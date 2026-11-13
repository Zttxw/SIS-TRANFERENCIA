import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { SourceTextModule, SyntheticModule } from 'node:vm'
import * as React from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import { transformWithOxc } from 'vite'
import { PERMISOS, derivarPermisos } from '../src/auth/permisos.ts'
import { puedeConsultarActa } from '../src/auth/sesion-runtime.ts'

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

async function renderizarBoton(estado, compacto = true) {
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
      compacto,
    }),
  )
}

test('un documento sin firma ofrece la acción directa de firmar', async () => {
  const html = await renderizarBoton({ firmado: false, vigente: false, pdf_generado_vigente: true })
  assert.match(html, /aria-label="Firmar con Firma Perú"/)
  assert.doesNotMatch(html, /disabled/)
})

test('no permite iniciar firma sin un PDF generado vigente', async () => {
  const html = await renderizarBoton({ firmado: false, pdf_generado_vigente: false })
  assert.match(html, /disabled=""/)
})

test('el detalle del documento muestra Firmar con Firma Perú como texto visible', async () => {
  const html = await renderizarBoton({ firmado: false, vigente: false }, false)
  assert.match(html, />Firmar con Firma Perú<\/button>/)
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

test('la vista del acta muestra nombre, DNI y cargo de los intervinientes estructurados', async () => {
  const { ActaImprimible } = await cargarComponente('../src/features/acta/ActaImprimible.tsx', {})
  const html = renderToStaticMarkup(React.createElement(ActaImprimible, {
    acta: {
      fecha_acta: '2026-11-12', numero_acta: 'ACTA-PRUEBA',
      intervinientes: { titular_saliente: { nombre: 'Adriana Quispe', dni: '12345678', cargo: 'Directora de OTI' } },
      dependencia: { padre: { nombre: 'Planeamiento' } },
    },
    dependencia: { nombre: 'OTI', codigo: '00025', nivel: 3, parent_id: 1 },
  }))
  assert.match(html, /Adriana Quispe · DNI 12345678 · Directora de OTI/)
  assert.match(html, /Planeamiento/)
})

test('la vista del acta conserva compatibilidad con nombres guardados como texto', async () => {
  const { ActaImprimible } = await cargarComponente('../src/features/acta/ActaImprimible.tsx', {})
  const html = renderToStaticMarkup(React.createElement(ActaImprimible, {
    acta: { fecha_acta: '2026-11-12', intervinientes: { titular_saliente: 'Nombre anterior' } },
    dependencia: { nombre: 'OTI', codigo: '00025', nivel: 3, parent_id: 1 },
  }))
  assert.match(html, /Nombre anterior/)
})

  test('Mi entrega muestra el estado del acta sin controles de generación o firma', async () => {
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
              'data-firma-bloqueada': String(Boolean(bloqueado)),
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
    assert.match(html, /Acta/)
    assert.doesNotMatch(html, /data-firma-bloqueada|aria-expanded|Firmar con Firma|Generar PDF/)
  })

test('el menú del jefe respeta el orden Mi entrega, anexos, SGD, PDF, entrega, observaciones y reportes', async () => {
  const { ITEMS_NAV } = await cargarComponente('../src/layouts/navegacion.ts', {
    'lucide-react': await import('lucide-react'),
    '@/auth/permisos': { PERMISOS },
  })
  const permisos = derivarPermisos([{ rol: 'responsable_centro_costo' }])
  assert.deepEqual(ITEMS_NAV.filter((item) => permisos.has(item.permiso)).map((item) => item.etiqueta), [
    'Mi entrega', 'Anexos de Transferencia', 'Documentos SGD', 'PDF y firma', 'Entrega', 'Observaciones', 'Reportes',
  ])
})

for (const rol of ['responsable_centro_costo', 'servidor']) {
  test(`PDF y firma centraliza los documentos permitidos para ${rol}`, async () => {
    const permisos = derivarPermisos([{ rol }])
    const { PdfFirmaPage } = await cargarComponente('../src/features/firmaperu/PdfFirmaPage.tsx', {
      'react-router-dom': { Link: ({ children }) => React.createElement('a', null, children) },
      'lucide-react': { ArrowRight: () => null, PenLine: () => null },
      '@/auth/hooks': {
        useAuth: () => ({ permisos, tiene: (p) => permisos.has(p) }),
        useDependenciaActiva: () => ({ dependenciaId: 12 }),
      },
      '@/auth/sesion-runtime': { puedeConsultarActa },
      '@/components/ui/button': { buttonVariants: () => '' },
      '@/components/ui/spinner': { Spinner: () => null },
      '@/features/dashboard/use-dashboard': { useEstadoEntrega: () => ({ data: { dependencia: { codigo: '00025', nombre: 'OTI' } } }) },
      './ConstanciaAusenciaEtte': { ConstanciaAusenciaEtte: () => null },
      './DocumentoFirmaDetalle': { DocumentoFirmaDetalle: ({ tipoDocumento }) => React.createElement('span', { 'data-documento': tipoDocumento }) },
      './use-requisitos-remision': { useRequisitosRemision: () => ({ data: { firmados: 0, puede_remitir: false } }) },
    })
    const html = renderToStaticMarkup(React.createElement(PdfFirmaPage))
    assert.match(html, /data-documento="anexo02"/)
    assert.match(html, /data-documento="anexo06"/)
    if (rol === 'servidor') assert.doesNotMatch(html, /data-documento="anexo07"/)
    else assert.match(html, /data-documento="anexo07"/)
  })
}
