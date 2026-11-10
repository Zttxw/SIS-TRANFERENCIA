# Plan de continuación — Sistema generador de anexos (reenfoque)

> **Fecha:** 2026-11-10 · **Rama de respaldo:** `respaldo/flujo-completo-pre-limpieza`
> (estado anterior completo, con flujo jerárquico) · **Estado actual:** `main`,
> limpio y reenfocado.

## 1. Cambio de alcance (decisión del usuario)

El sistema **ya no orquesta el flujo jerárquico** de transferencia
(remitir → revisar → observar → consolidar → ETTS). **Ese flujo lo lleva el SGD.**

Este sistema es una **herramienta de apoyo para generar los anexos**: que cada
centro de costo complete sus datos de forma cómoda y produzca el **PDF oficial**
de cada anexo (02–06) y el **Acta (07)** para la entrega física.

### Qué se eliminó (limpieza ejecutada 2026-11-10)

**Backend** (37 tests verdes, pint limpio tras la limpieza):
- Módulos borrados: `Documentos` (documentos pendientes SGD), `Expediente`
  (paquete PDF), y del módulo `Transferencia`: `Entrega`, `Observacion`,
  `ObservacionService`, sus requests y el `ObservacionController`.
- Traits/enums borrados: `RespetaEstadoEntrega` (bloqueo 409 por remisión),
  `TieneObservaciones`, `EstadoObservacion`.
- Los 5 services de anexo (Gestión, Acervo, Patrimonio, Personal, No Patrimonial)
  dejaron de llamar `exigirEntregaModificable(...)`: **los anexos son siempre
  editables**. Los modelos dejaron de usar `TieneObservaciones`.
- `TransferenciaService` se redujo a: `obtenerEstadoEntrega` (avance de anexos de
  una dependencia), `obtenerTableroOperativo` (avance institucional: anexos
  completos + patrimonio), `obtenerActa`/`presenciaAnexos` (acta **sin** gate de
  CONSOLIDADA). `TransferenciaController` solo expone `tablero`, `estado`, `acta`,
  `acta/pdf`.
- `ReportesService`: se quitó el reporte de observaciones; la matriz ya no trae
  `estado_entrega` ni `observaciones_abiertas` (ahora `anexos_completos`).
- `IngestaDocumentalSgd`: se quitó la ingesta de documentos pendientes; conserva
  la **precarga opcional de acervo digital** (Anexo 03).
- Rutas eliminadas: `documentos-pendientes/*`, `transferencia/{remitir,revisar,
  entregas}`, `observaciones/*`, `expediente/pdf`.

> **Nota de esquema (decisión: limpieza pragmática).** Se conservó
> `ProcesoTransferencia` y la columna `proceso_transferencia_id` de cada tabla de
> anexo (ancla del proceso activo). Las migraciones/tablas de flujo
> (`entregas`, `observaciones`) **no se dropearon**: quedan inertes. El enum
> `Permiso` conserva los permisos de flujo (`entregas.*`, `observaciones.*`,
> `expediente.ver`) para no tocar el seeder ni los roles; ya no se usan.

**Frontend** (build `tsc -b` + `vite` + `oxlint` verdes):
- Features borradas: `entregas/`, `observaciones/`, `documentos/`.
- Componentes borrados: `ObservacionesAnexoPanel`, `AlertaBloqueoEntrega`,
  `EstadoAnexoChip`, `QueSigueCard`, `RemitirModal`, `RevisarModal`, modales de
  firma y evidencia del acta.
- `AnexoLayout`/`AnexoCrudPage`: sin `estadoEntrega`/`esModificable`/
  `anexoObservable`; sin panel de observaciones. Los 6 anexos siempre editables.
- `DashboardPage` reescrito: «Mis anexos» (cuadro 01–07 con estado + avance), sin
  tarjeta de remisión/trazabilidad ni documentos SGD.
- `TableroOperativoView` reescrito: avance institucional (anexos completos N/5 +
  % patrimonio), sin semáforo de estado de entrega.
- `ActaPage` reescrito: resumen + **PDF oficial** + imprimir, sin gate 409, sin
  evidencias ni firma.
- `ReportesPage`: 2 reportes (matriz de anexos, conciliación patrimonial).
- Utilidades de árbol (`arbol-utils`, `useCatalogoDependencias`) reubicadas a
  `features/organization/`.

### Qué se mantuvo
- **Roles** (admin, servidor, responsable equipo/centro de costo, coordinador,
  ETTS, ETTE) y la autorización por rol + ámbito.
- **Acta (07)** como generador de PDF.
- **Reportes** (matriz de anexos + conciliación patrimonial), con export Excel/PDF.
- **Evidencias** como mecanismo genérico de adjuntos (infra intacta; sin UI en el
  acta por ahora).
- Ingesta SGD/SIGA de **solo lectura** como precarga **opcional**.

## 2. Estado por anexo (línea base para continuar)

| Anexo | Página | Estado | Deuda / mejora pendiente |
|---|---|---|---|
| 01 Organigrama | `/organigrama` | 🟡 | Árbol OK; pulir navegación y alineación al formato oficial del Anexo 01 |
| 02 Gestión | `/gestion` | 🟢 | Editor por secciones (tablas de filas) OK; revisar microcopy/ayuda |
| 03 Acervo | `/acervo` | 🟢 | Lista + por año OK; formato oficial usa **Desde/Hasta año** (hoy `periodo` texto) — alinear |
| 04 Patrimonio | `/patrimonio` | 🟢 | Verificación inline + por servidor OK; no usa `AnexoCrudPage` (hand-rolled) |
| 05 Personal | `/personal` | 🟢 | CRUD OK; revisar columnas vs. formato (régimen/modalidad/situación/obs.) |
| 06 No Patrimonial | `/nopatrimonial` | 🟢 | CRUD OK; estado B/R/M como control compacto |
| 07 Acta | `/acta` | 🟢 | PDF + imprimir OK |

## 3. Hoja de ruta sugerida (anexo por anexo, iterativo)

La estrategia que pidió el usuario: **mejoras pequeñas, un anexo a la vez**, sobre
esta base limpia. Para cada anexo, el mismo ciclo:

1. **Alinear campos al formato oficial** (ver `mapa-anexos-plantilla.md` y
   `propuesta-directiva.md`): comparar columna por columna el formulario/modelo
   contra la plantilla; completar faltantes.
2. **Pulir el formulario de captura**: ayuda por campo bajo demanda (`FormField
   hint`), placeholders con lenguaje de servidor público, validación espejo del
   backend, captura rápida de muchas filas donde aplique.
3. **Verificar el PDF oficial**: que la maqueta calce con la directiva (cabeceras,
   numeración, bloque de firma).
4. **Indicadores de completitud**: «faltan: X, Y» discreto para que el anexo salga
   completo.

**Orden sugerido:** 03 (desajuste Desde/Hasta año) → 04 (auditar columnas SIGA y
cabecera por servidor) → 05 → 06 → 02 (ya avanzado) → 01 (organigrama/formato).

### Decisiones abiertas para la siguiente sesión
- **Anexo 03:** ¿migrar `periodo` (texto) a `desde_anio`/`hasta_anio` (ya existen
  columnas) y agrupar por año con series predefinidas del formato? (requiere tocar
  formulario + PDF; backend ya tiene las columnas).
- **Patrimonio:** ¿migrar `PatrimonioPage` a `AnexoCrudPage` o mantener su tabla a
  medida (verificación inline)?
- **Permisos inertes:** ¿purgar del enum `Permiso` y del seeder los permisos de
  flujo ahora que no se usan, o conservarlos?
- **Evidencias:** ¿reintroducir adjuntos de sustento por anexo (documentos
  sustentatorios de la directiva), ahora desacoplados del acta?

## 4. Cómo verificar
- **Backend:** `cd backend && php artisan test` (37 verdes) · `vendor/bin/pint --test`.
- **Frontend:** `cd frontend && npm run build` (tsc -b + vite) · `npm run lint`.
- **Volver al estado con flujo:** `git checkout respaldo/flujo-completo-pre-limpieza`.
