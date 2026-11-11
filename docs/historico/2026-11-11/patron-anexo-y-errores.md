# Patrón de anexo + manejo de errores (entregable Fase 3)

> **Propósito.** Que las páginas de anexo de listado dejen de ser copia-pega y
> pasen a ser **configuración**: mejorar la UX del marco de un anexo = tocar un
> solo archivo. Más un **mapa único de errores API → UI** que unifica el copy y
> cablea los 422 al campo exacto del formulario.
>
> **Fecha:** 2026-11-10 · **Estado:** F3 ejecutada. Build (prod + dev) +
> typecheck + lint verdes, sin warnings nuevos. Solo frontend.

---

## 1. Abstracciones nuevas

| Pieza | Archivo | Qué resuelve |
|---|---|---|
| `AnexoLayout` | `components/anexos/AnexoLayout.tsx` | Contenedor único: `AnexoHeader` + `EstadoAnexoChip` + `AlertaBloqueoEntrega` + contenido + `ObservacionesAnexoPanel`. Incluye el guard «seleccione un centro de costo». |
| `EstadoAnexoChip` | `components/anexos/EstadoAnexoChip.tsx` | Chip compacto del estado de la entrega (borrador/remitida/en_revisión/observada/subsanada/consolidada), tematizado con los tokens semánticos de F2. «El sistema guía el qué sigue». |
| `AnexoCrudPage<T>` | `components/anexos/AnexoCrudPage.tsx` | Patrón declarativo para anexos de listado. Recibe columnas (`ColumnaTabla<T>`), filtros, datos/paginación, el modal (render-prop) y los callbacks; aplica solo: bloqueo por estado (`esModificable`), `<Can>`, carga/vacío/error (`DataTable`), columna de acciones editar/eliminar y la **confirmación suave** de borrado (`useConfirm`). |

### Forma de uso (resumen)

```tsx
<AnexoCrudPage<BienNoPatrimonial>
  numeroAnexo="Anexo 06" titulo="…" anexoObservable="nopatrimonial"
  dependenciaId={dependenciaId} dependencia={estadoData?.dependencia}
  estadoEntrega={estadoEntrega} esModificable={esModificable}
  filas={bienes} rowKey={(b) => b.id} loading={…} error={…} onReintentar={refetch}
  meta={paginado?.meta} onPageChange={setPagina}
  columnas={columnas}                 // la columna de acciones se añade sola
  busqueda={busqueda} onBuscar={…} placeholderBusqueda="…"
  filtrosExtra={<Select … />}         // opcional
  textoNuevo="Nuevo Bien" iconoNuevo={PackagePlus}
  vacio={{ titulo: '…', descripcion: '…' }}
  confirmarEliminar={(b) => ({ title: '…', description: '…' })}
  onEliminar={(b) => eliminarMut.mutate(b.id)} eliminando={eliminarMut.isPending}
  renderModal={({ open, onClose, registro }) => <XModal … />}
/>
```

- `renderModal` recibe `{ open, onClose, registro }` (registro = fila a editar o
  `null` en alta). El estado de apertura/edición lo gobierna `AnexoCrudPage`.
- `sinAcciones` oculta la columna editar/eliminar (anexos de solo verificación).

---

## 2. Mapa de errores API → UI (`lib/api-errors.ts`)

El interceptor de `lib/api.ts` ya normaliza **todo** error a `ApiError` (plano:
`status`, `message`, `errors`). Aquí se centraliza la traducción:

| Helper | Qué hace |
|---|---|
| `mensajeDeError(error, opts?)` | Devuelve copy ES accionable según `status` (401 sesión, 403 ámbito, 409 RN-13 — nunca se oculta, 422, red). No muestra nada. |
| `notificarError(error, opts?)` | `toast.error(mensajeDeError(...))`. **Omite 401** (el interceptor ya redirige) **y 422** (se pinta junto al campo). Acepta `{ conflicto }` para el copy del 409. |
| `aplicarErroresAFormulario(error, setError)` | Mapea `errors` de un 422 → campo exacto de react-hook-form (`setError`). Devuelve `true` si aplicó algo. |

### Bug corregido

Los `use-*.ts` leían `error?.response?.data?.message` — la forma **cruda de
axios**, que tras la normalización del interceptor **ya no existe**. Era rama
muerta: el usuario veía el mensaje genérico en vez del del backend. Ahora los
hooks migrados usan `notificarError`.

### Patrón de 422 en el modal

El modal expone su `setError` al guardar: `onSave(payload, { setError })`. La
página lo pasa al `onError` de la mutación:

```tsx
onSave={(payload, { setError }) => {
  crearMut.mutate(payload, {
    onSuccess: onClose,
    onError: (err) => {
      if (aplicarErroresAFormulario(err, setError)) {
        toast.error('Revise los campos marcados en el formulario.')
      }
    },
  })
}}
```

El `onError` del hook ya toastea los demás errores (409 con copy, red, 500);
como omite el 422, no hay doble mensaje.

---

## 3. Catálogos (`lib/catalogos.ts`)

Única fuente de los enums de dominio que vivían hardcodeados en cada modal:
`REGIMENES_LABORALES`, `SITUACIONES_LABORALES`, `TIPOS_ACERVO`,
`UNIDADES_CONSERVACION`, `ESTADOS_CONSERVACION`, `UNIDADES_MEDIDA`. Forma
`OpcionCatalogo[]`; `aOpcionesSelect(catalogo)` lo adapta a `<Select>` sin casts.
Si alguno pasa a servirse del backend, se sustituye el arreglo por una query
manteniendo la forma.

---

## 4. Páginas migradas (prueba del patrón)

Acervo (03), Personal (05), No Patrimonial (06) — página + modal. Cada página
pasó de ~300 líneas de boilerplate a ~150 de configuración. Eliminado en ellas:
`confirm()` nativos, `<select>` crudos, catálogos hardcodeados, markup de tabla a
mano y el `response?.data` muerto.

## 5. Pendiente de adopción (barrido posterior, F4/F6)

Fuera del alcance confirmado de esta ronda y aún sin migrar: **documentos,
patrimonio** (verificación SIGA, lógica distinta), **acta, admin, entregas,
gestión, observaciones**. Esos `use-*.ts` todavía usan `response?.data`; migrarlos
a `notificarError` + `AnexoCrudPage` es trabajo mecánico.
