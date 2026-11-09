# Sistema de diseño — Tokens institucionales (F2)

> **Estado:** F2 ejecutada (2026-11-09). Única fuente de verdad visual del frontend.
> Todos los colores, tamaños y neutrales viven como tokens en
> [`frontend/src/index.css`](../frontend/src/index.css). **Cero hex sueltos** y
> **cero clases de color crudas de Tailwind** en el código de la app (excepciones
> documentadas abajo).

## 1. Paleta institucional (SICOP — MDSJ)

Confirmada en código (no inferida). Vive como tokens claro/oscuro en `:root` y `.dark`.

| Token | Valor claro | Uso |
|---|---|---|
| `--primary` | `#3484A5` (Pantone 6797 C) | Azul institucional. Acciones, enlaces, acentos de marca. |
| `--primary-hover` | `#2b718d` | Hover de botones/elementos primarios. |
| `--secondary` | `#2CA792` (Pantone 7473 C) | Turquesa. Acción de éxito/confirmar (contraste OK con blanco). |
| `--secondary-hover` | `#258b7a` | Hover de secundario. |
| `--warning` (acento) | `#F0C84F` (Pantone 141 C) | Amarillo institucional. Solo como acento; NO con texto blanco. |
| `--sidebar` | `#3484A5` (claro) / casi-negro (oscuro) | Fondo de la barra lateral. |

Clases Tailwind generadas: `bg-primary`, `text-primary`, `border-primary/30`,
`bg-primary/10`, `hover:bg-primary-hover`, `bg-secondary`, `hover:bg-secondary-hover`,
`bg-sidebar`, etc.

## 2. Colores semánticos de estado

Convención de 4 variantes por color, para que una alerta/chip/caja se componga igual
en toda la app y responda al tema claro/oscuro automáticamente:

| Variante | Significado | Ejemplo de clase |
|---|---|---|
| `<sem>` | Tono sólido (íconos sueltos, dots, barras de progreso, pills activos) | `text-info`, `bg-success` (dot) |
| `<sem>-soft` | Fondo tenue de alerta/chip/caja | `bg-warning-soft` |
| `<sem>-border` | Borde de alerta/chip/caja | `border-danger-border` |
| `<sem>-fg` | Texto legible **sobre** `-soft` (o acento de alto contraste) | `text-success-fg` |

Mapa semántico:

| `<sem>` | Estado de negocio | Familia Tailwind reemplazada |
|---|---|---|
| `info` | Entrega **remitida** / informativo | blue / sky |
| `warning` | Entrega **observada** / atención | amber / yellow |
| `success` | Entrega **consolidada** / completo | emerald / green |
| `danger` | Error / acción destructiva | red / rose |
| `neutral` | Borrador / vacío | slate (→ `muted`/`foreground`) |

**Patrón canónico de alerta/caja de estado:**

```tsx
<div className="border border-warning-border bg-warning-soft text-warning-fg ...">
  <Icon className="text-warning" /> {/* ícono sólido */}
</div>
```

Referencia viva: [`AlertaBloqueoEntrega.tsx`](../frontend/src/components/anexos/AlertaBloqueoEntrega.tsx)
(remitida=info, observada=warning, consolidada=success).

**Regla de contraste:** nunca `text-white` sobre `bg-warning` (amarillo). Para
acciones de éxito usar `bg-secondary` (turquesa) + `text-white`; para badges
amarillos usar `bg-warning-soft` + `text-warning-fg`.

## 3. Neutrales → tokens de tema

Los antiguos `slate-*` se mapearon así (ya no se usa `slate` en la app):

| Antes | Ahora |
|---|---|
| `text-slate-700/800/900` | `text-foreground` |
| `text-slate-300..600` | `text-muted-foreground` |
| `bg-slate-50..500` | `bg-muted` |
| `border-slate-*` | `border-border` |
| `bg-slate-700/900 text-white` (pill activo) | `bg-foreground text-background` |
| `bg-white` (inputs/cards tematizables) | `bg-background` / `bg-card` |

## 4. Escala tipográfica

Utilidades nombradas en `index.css` (`@utility`). **No usar `text-[Npx]` arbitrarios.**

| Utilidad | Tamaño | Familia | Uso |
|---|---|---|---|
| `text-cifra-lg` | 24px | mono | Cifras destacadas (KPIs grandes). |
| `text-cifra` | 14px | mono | Cifras en tabla. |
| `text-dato` | 12px | sans | Dato general. |
| `text-etiqueta` | 11px | sans **uppercase** | Etiquetas de sección/columna. |
| `text-nota` | 11px | sans | Notas/auxiliares (reemplaza `text-[11px]`). |
| `text-mini` | 10px | sans | Micro-labels (reemplaza `text-[10px]`/`text-[9px]`). |
| `text-microdato` | 9.5px | mono | Códigos/sufijos monoespaciados. |

## 5. Excepciones intencionales (no tokenizar)

- [`FranjaAndina.tsx`](../frontend/src/components/common/FranjaAndina.tsx): el SVG del
  tejido andino ceremonial (Pallay Cusqueño). Sus hex son el **motivo cultural**, no
  tokens de UI.
- [`ActaImprimible.tsx`](../frontend/src/features/acta/ActaImprimible.tsx): documento
  pensado para **impresión en papel** (`print:`); usa colores de tinta y `text-[13px]`
  serif deliberados.

## 6. Tema oscuro

Todos los tokens tienen contraparte en `.dark` (soft translúcidos, fg claros). El tema
oscuro es **coherente por construcción**. **Nota:** aún no existe un mecanismo que active
la clase `.dark` (toggle de tema) — queda para F6 (pulido/accesibilidad). Cuando se
active, la app responde sin cambios adicionales.
