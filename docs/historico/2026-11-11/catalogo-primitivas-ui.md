# Catálogo de primitivas UI (entregable Fase 1)

> **Propósito.** Primitivas accesibles, tematizadas y navegables por teclado que
> pagan deuda transversal del frontend. Construidas sin dependencias nuevas
> (vanilla React + Tailwind v4 + lucide + `cn`/`cva`), consistentes con el estilo
> «shadcn copiado» del proyecto. Viven en `src/components/ui/`.
>
> **Fecha:** 2026-11-09 · **Estado:** build + lint verdes (solo warnings
> preexistentes de fast-refresh).

---

## Nuevas primitivas

| Componente | Archivo | Qué resuelve |
|---|---|---|
| `Select` | `ui/select.tsx` | Reemplaza `<select>` nativos; teclado (↑↓/Home/End/Enter/Esc), búsqueda opcional (`buscable`), aria-listbox, tema claro/oscuro. |
| `Combobox` | `ui/combobox.tsx` | Autocomplete con búsqueda por texto para catálogos medianos/grandes (dependencias 107–157, servidores 645). Filtra en cliente o server-side (`onBuscar`), limpiable, `descripcion` por opción. |
| `Tooltip` / `HelpTooltip` | `ui/tooltip.tsx` | Ayuda bajo demanda. `HelpTooltip` = ícono «?» junto al label que revela una frase. Base del `hint` por campo (F4). Aparece en hover **y** focus. |
| `Popover` | `ui/popover.tsx` | Contenido flotante más rico, controlado por clic; cierra con clic-fuera/Escape. |
| `ConfirmProvider` + `useConfirm` | `ui/confirm-dialog.tsx` | Confirmación imperativa `await confirmar({...})`; reemplaza `confirm()`/`alert()` nativos. Variante `destructive` con resumen de consecuencias (remitir/consolidar/eliminar). Montado en `App`. |
| `FormField` + `FieldError` | `ui/form-field.tsx` | Compone Label + control + `hint` (HelpTooltip) + `error`/`descripcion` + marca requerido, en un solo lugar. |
| `EmptyState` | `ui/empty-state.tsx` | Vacío accionable: ícono + título + descripción + acción primaria. |
| `AsyncBoundary` + `CargaBloque` | `ui/async-boundary.tsx` | Contrato único carga/error/vacío/contenido para TanStack Query. Traduce `ApiError` (401/403/red) a copy en español + reintento. |
| `DataTable` | `ui/data-table.tsx` | Tabla genérica tipada: columnas declarativas, estados integrados (AsyncBoundary + EmptyState), scroll horizontal, paginación opcional (`<Pagination>` existente). |
| `EditableTable` | `ui/editable-table.tsx` | **RowEditor**: editor de filas repetibles para captura rápida (agregar/duplicar/eliminar, edición en línea, celda texto/textarea/número/select con autocompletado, Enter agrega fila). Habilita los formularios tipo tabla de anexos (02/03/06). |

Hook auxiliar: `hooks/use-dismiss.ts` (clic-fuera + Escape), usado por Select,
Combobox y Popover.

---

## Convenciones

- **Imports directos** (`@/components/ui/select`), sin barrel — igual que el resto.
- **Tokens de tema** (`bg-popover`, `bg-accent`, `border-input`, `text-destructive`),
  nada de hex suelto. Verificados en `index.css` (claro y oscuro).
- **Accesibilidad por defecto:** `role`/`aria-*` correctos, foco visible
  (`focus-visible:ring-2`), navegación por teclado completa.
- **Tipado estricto:** genéricos en `Select`/`Combobox`/`DataTable`/`EditableTable`;
  sin `any` en la frontera.

---

## Adopción (siguientes fases)

Estas primitivas son la base de F3 (patrón de anexo + errores) y F4 (usabilidad):

- `<select>` nativos (AcervoModal, verificación patrimonio, PersonalModal) → `Select`.
- `confirm()` nativos (ObservacionesAnexoPanel ✅ ya migrado, PatrimonioPage,
  NoPatrimonialPage, etc.) → `useConfirm`.
- Vacíos «sin registros» sueltos → `EmptyState`.
- Spinners/vacíos ad hoc por página → `AsyncBoundary` / `DataTable`.
- `SeccionFilas` del Anexo 02 ✅ ya envuelve `EditableTable`; replicar en 03/06 (F4).
- Ayuda por campo → `FormField` con `hint` (F4).

> El `SeccionFilas` del feature de gestión quedó como **adaptador delgado** sobre
> `EditableTable` (cabecera de sección numerada). La lógica de filas ya es
> compartida.
