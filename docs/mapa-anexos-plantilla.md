# Mapa anexo → plantilla oficial (entregable Fase 0)

> **Propósito.** Correspondencia 1:1 entre cada campo del modelo de datos y la
> celda del formato oficial de la directiva. Es el insumo directo del generador
> de PDF oficial (F5) y la referencia para los formularios de captura (F4).
>
> **Fecha:** 2026-11-09 · **Estado:** estructura alineada; backend con 42 tests
> en verde. Fuente de las plantillas: [propuesta-directiva.md](propuesta-directiva.md).

---

## Anexo 02 — Informe de Gestión (`informes_gestion`)

Re-modelado en Fase 0 de 4 `text` planos a **secciones de filas repetibles**
(`jsonb`, mismo patrón que `actas_transferencia`). Migración:
`2026_11_09_000002_restructure_informes_gestion_to_rows`.

### I. Identificación del centro de costo

| Celda plantilla | Campo modelo | Origen |
|---|---|---|
| Entidad | *(fijo)* "Municipalidad Distrital de San Jerónimo" | constante |
| Órgano / unidad de organización | `dependencia.nombre` (vía relación) | SGD |
| Denominación del centro de costo | `dependencia.nombre` | SGD |
| Nivel organizacional (☐ 1/2/3/equipo) | `nivel_organizacional` (`primer_nivel`\|`segundo_nivel`\|`tercer_nivel`\|`equipo_trabajo`) | manual |
| Nombre del responsable que entrega | `responsable.nombres + apellidos` (vía `servidor_responsable_id`) | SGD/manual |
| Cargo / puesto y periodo de gestión | `cargo_periodo` | manual |
| Tabla «N° · Función principal» | `funciones[]` → `{ n, descripcion }` | manual |

### II. Logros y resultados (`logros_items[]`)

| Columna plantilla | Clave fila |
|---|---|
| N° | `n` |
| Actividad / intervención | `actividad` *(requerida)* |
| Resultado o logro obtenido | `resultado` |
| Indicador / meta y nivel de cumplimiento | `indicador` |
| Documento o medio de verificación | `verificacion` |

### III. Dificultades afrontadas (`dificultades_items[]`, opcional)

| Columna plantilla | Clave fila |
|---|---|
| N° | `n` |
| Dificultad identificada y causa | `dificultad` |
| Efecto en la gestión / actividad afectada | `efecto` |
| Medida adoptada o recomendada | `medida` |

### IV. Agenda pendiente (`pendientes_items[]`, opcional)

| Columna plantilla | Clave fila |
|---|---|
| N° | `n` |
| Asunto pendiente / descripción | `asunto` |
| Estado situacional y acción requerida | `estado_accion` |
| Documento de referencia / expediente | `documento_referencia` |
| Plazo o fecha relevante | `plazo` |
| Unidad o responsable competente | `responsable` |

### V. Declaración y suscripción

Bloque de firma del PDF; datos del responsable que entrega (`responsable`,
`cargo_periodo`) + lugar/fecha. No persistido como dato: se renderiza en el PDF.

---

## Anexo 03 — Acervo Documentario (`acervo_documental`)

Ya modelado como filas. Fase 0 agregó el **año agrupador** y el **rango
desde/hasta** que separa el formato. Migración:
`2026_11_09_000003_align_anexos_to_official_format`.

| Columna plantilla | Campo modelo | Nota |
|---|---|---|
| (Agrupador) AÑO 2023–2026 | `anio` | agrupa visualmente las filas |
| N° | *(índice de fila)* | — |
| Serie Documental | `serie_documental` | — |
| Desde Año | `desde_anio` | nuevo en F0 |
| Hasta Año | `hasta_anio` | nuevo en F0 |
| Cantidad de Unidades de Conservación | `cantidad_unidades` | — |
| Tipo de Unidades de Conservación | `unidad_conservacion` | catálogo (archivador, caja, …) |
| Ubicación de Unidades de Conservación | `ubicacion` | — |

`periodo` (texto de rango) se conserva por compatibilidad; el PDF usa
`desde_anio`/`hasta_anio`. El acervo digital se ingesta del SGD (`tipo = digital`).

---

## Anexo 04 — Bienes Patrimoniales (`bienes_patrimoniales`)

Cabecera **por servidor responsable** de los bienes (no por bien). Fase 0 agregó
las columnas físicas que faltaban; se completan al **verificar** el bien.

### Cabecera (por `servidor_id`)

| Celda plantilla | Campo |
|---|---|
| Centro de Costos | `dependencia.nombre` |
| Nombre y Apellidos | `servidor.nombres + apellidos` |
| DNI | `servidor.dni` |
| Cargo | `servidor.cargo` |
| Tipo de Contrato | `servidor` (régimen/condición) |

### Tabla de bienes

| Columna plantilla | Campo modelo | Origen |
|---|---|---|
| N° | *(índice)* | — |
| Código patrimonial | `codigo_patrimonial` | SIGA |
| Denominación | `denominacion` | SIGA |
| Estado | `verificacion.estado_conservacion` | verificación |
| Marca | `marca` | SIGA |
| Modelo | `modelo` | SIGA |
| Color | `color` | nuevo F0 · verificación |
| Serie | `serie` | SIGA |
| Dimensión | `dimension` | nuevo F0 · verificación |
| Características del bien | `caracteristicas` | nuevo F0 · verificación |
| Código patrimonial anterior | `codigo_patrimonial_anterior` | nuevo F0 · verificación |
| Ubicación del Bien | `ubicacion` | nuevo F0 · verificación |

> El PDF del Anexo 04 agrupa los bienes por `servidor_id` (una cabecera + su
> tabla por cada servidor responsable con bienes en la dependencia).

---

## Anexo 05 — Personal a cargo (`personal`)

Fila por servidor. Fase 0 agregó `observaciones`.

| Columna plantilla | Campo modelo | Origen |
|---|---|---|
| N° | *(índice)* | — |
| DNI | `dni` | SGD |
| Apellidos y Nombres | `apellidos + nombres` | SGD |
| Cargo | `cargo` | SGD/manual |
| Régimen Laboral | `regimen_laboral` | catálogo |
| Modalidad Contractual | `modalidad_contractual` | catálogo |
| Situación Laboral Actual | `situacion_laboral` | catálogo |
| Observaciones | `observaciones` | nuevo F0 · manual |

Cabecera: Dependencia (`dependencia.nombre`), Encargado (`responsable`).

---

## Anexo 06 — Bienes No Patrimoniales (`bienes_no_patrimoniales`)

Ya completo: ninguna columna faltante. Admite «No Aplica» a nivel de anexo.

| Columna plantilla | Campo modelo |
|---|---|
| N° | *(índice)* |
| Descripción | `denominacion` + `descripcion` |
| Unidad de Medida | `unidad_medida` |
| Cantidad | `cantidad` |
| Estado situacional (B / R / M) | `estado_conservacion` (enum → B/R/M) |
| Ubicación | `ubicacion` |
| Observaciones | `observaciones` |

---

## Anexo 07 — Acta (`actas_transferencia`)

Generada del paquete (ver `presenciaAnexos()` → `anexos_entregados`). Ya modelada
con `intervinientes` y `anexos_entregados` en `jsonb`. El PDF del acta se unifica
al generador del backend en F5.

| Sección plantilla | Fuente |
|---|---|
| Cabecera (centro de costo, clasificación, nivel, unidad superior) | `dependencia` + `nivel_organizacional` |
| I. Responsable que efectúa la entrega | `intervinientes[]` (rol = entrega) |
| II. Responsable de recepción / verificación | `intervinientes[]` (rol = recepción) |
| III. Información y documentación entregada (02–06) | `anexos_entregados[]` (☐ Entregado / No entregado) |

---

## Estado de alineación (resumen)

| Anexo | Modelo ↔ plantilla | Pendiente |
|---|---|---|
| 02 | ✅ re-modelado (jsonb) | Formulario de filas ✅ · PDF (F5) |
| 03 | ✅ columnas completas | Agrupación visual por año en form (F4) · PDF (F5) |
| 04 | ✅ columnas completas | Exponer campos físicos en verificación (F4) · agrupar por servidor en PDF (F5) |
| 05 | ✅ columnas completas | Exponer `observaciones` en form (F4) · PDF (F5) |
| 06 | ✅ sin cambios | — · PDF (F5) |
| 07 | ✅ ya jsonb | Unificar PDF al generador (F5) |
