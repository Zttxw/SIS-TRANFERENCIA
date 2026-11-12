# Plan de integración Firma Perú + UX de anexos — tareas pequeñas

**Fecha:** 2026-11-12. **Base:** rama `feature/firma-peru-v2` fusionada en `main` (commit `a6908a5`), con las 2 migraciones de Firma Perú ya aplicadas. **Enfoque:** una tarea por sesión de chat de Claude, cada una autocontenida para arrancar en frío sin re-explorar el repo (optimiza tokens). **Estilo:** igual que [06-plan-de-desarrollo.md](06-plan-de-desarrollo.md) — alcance acotado, criterios de aceptación, archivos concretos, verificación con `tsc` + `php artisan test`.

## Contexto permanente (leer una vez por sesión)

- **Backend:** Laravel 11, PHP 8, PostgreSQL (`DB_DATABASE=sis_transferencia`, `APP_ENV=local`). Tests: `cd backend && php artisan test`. Hay 7 tests de `FirmaperuValidadorTest` que fallan **solo en esta máquina** por `openssl.cnf` ausente (`openssl_csr_new()` devuelve `false`); **no** es regresión — ignorarlos salvo que una tarea los aborde explícitamente. Suite útil: 193 verde.
- **Frontend:** React + TypeScript + Vite + react-router + @tanstack/react-query + tailwind + sonner (toasts) + lucide icons. Typecheck: `cd frontend && npx tsc --noEmit` (hoy en verde, exit 0). Estructura por `features/` + primitivas en `components/ui/` + marco de anexos en `components/anexos/`.
- **Primitivas UI existentes** (`frontend/src/components/ui/`): async-boundary, badge, button, card, combobox, confirm-dialog, data-table, dialog, editable-table, empty-state, form-field, input, label, pagination, **popover**, select, skeleton, spinner, textarea, tooltip. **NO existe** `dropdown-menu`.
- **Firma Perú (frontend):** vive en `features/firmaperu/`. Pieza central: [BotonFirmaPeru.tsx](../../frontend/src/features/firmaperu/BotonFirmaPeru.tsx) — renderiza TODA la nube de botones de firma. Se incrusta en el header del anexo vía [AnexoLayout.tsx](../../frontend/src/components/anexos/AnexoLayout.tsx) (líneas 101-103, mapa `TIPOS_FIRMA`). También se usa suelto en `acta/ActaPage.tsx`, `organization/EstructuraOrganicaPage.tsx`, `organization/DespachoPersonalView.tsx`, `patrimonio/PatrimonioPage.tsx`.
- **Firma Perú (backend):** módulo `Transferencia`. Controllers `FirmaperuController`, `FirmaperuClienteController`. Services `FirmaperuAuthService`, `FirmaperuPdfService`, `FirmaperuRegistroService`, `FirmaperuSesionService`, `FirmaperuValidadorService`. Modelos `FirmaSesion` (uuid), `DocumentoFirma`, `FirmaAnexo`.
- **Gate de firma del acta (B3b, ya implementado):** `TransferenciaService::exigirActaFirmada()` (líneas ~562-598). Ya valida sesión REAL de Firma Perú (`firma_sesion_id`, estado `firmada`, `vigente()`). Está **apagado por defecto**: columna `procesos_transferencia.exige_firma_acta` (boolean, default false). Encenderlo = política de la Tarea F3-1.
- **Procesos:** NO hay controller/endpoint para gestionar `procesos_transferencia` por UI todavía (solo el cronograma los referencia en `routes/api.php:148`). La Tarea F3-1 lo crea.
- **Permisos:** backend en seeder + enum `Rol`; espejo frontend en `frontend/src/auth/permisos.ts`. Mantener ambos sincronizados (patrón ya establecido en el proyecto).

## El problema de UX (motivación)

En el header de cada anexo, la zona de acciones apila **hasta 7 controles** en una fila sin jerarquía: `Previsualización`, `Firmar con Firma Perú`, `Opciones de firma`, `PDF firmado`, `Agregar firma`, `PDF recibido · sin verificar`, más las acciones propias del anexo (`Nueva serie`…) y el `EstadoAnexoChip`. El usuario no distingue cuál es la acción principal. Objetivo: **una acción primaria clara por anexo**, lo demás colapsado en un menú.

## Orden de ejecución

F1 (UX botones) → F2 (integración al flujo) → F3 (encender firma real, toggle admin) → F4 (navegación + limpieza). F1 primero porque es el dolor concreto y no depende de nada.

---

## Fase 1 — UX de anexos: colapsar la nube de botones

### Tarea F1-1 — Primitiva `dropdown-menu` (o menú sobre `popover`)
**Objetivo:** tener un menú desplegable accesible para agrupar acciones secundarias. No existe `dropdown-menu` en `components/ui/`.
**Cambio:** crear `frontend/src/components/ui/dropdown-menu.tsx`. Si el proyecto ya usa Radix (revisar `package.json`), envolver `@radix-ui/react-dropdown-menu` al estilo shadcn; si NO hay Radix, construir un menú accesible mínimo sobre la primitiva `popover.tsx` existente (botón disparador + lista de ítems con roles `menu`/`menuitem`, cierre con Esc/click afuera, foco manejado).
**Aceptación:** se puede renderizar un disparador con 3-4 ítems; navegable por teclado; cierra al elegir; `tsc` verde.
**Archivos:** nuevo `components/ui/dropdown-menu.tsx`. **Verificación:** `npx tsc --noEmit`.
**Nota para la sesión:** primero `cat frontend/package.json` para decidir Radix vs popover. No instalar dependencias sin confirmar con el usuario.

### Tarea F1-2 — Colapsar `BotonFirmaPeru` a 1 acción + menú
**Objetivo:** reducir de ~6 botones a **1 botón primario + 1 menú** de secundarios.
**Estado actual:** [BotonFirmaPeru.tsx](../../frontend/src/features/firmaperu/BotonFirmaPeru.tsx) renderiza en una fila: `PrevisualizarAnexo`, `Firmar con Firma Perú`, `Opciones de firma`, `PDF firmado`, `Agregar firma`, `PDF recibido · sin verificar`.
**Cambio:**
- **Acción primaria única** según estado: si puede firmar y no hay firma vigente → botón `Firmar con Firma Perú`; si ya firmó vigente → el primario pasa a ser discreto y el foco es "Descargar". Un solo botón sólido índigo a la vez.
- **Menú (F1-1)** agrupa: `Opciones de firma`, `Agregar firma`, `Descargar PDF firmado`, `Descargar PDF recibido · sin verificar`. Cada ítem con su ícono y deshabilitado según estado (misma lógica de permisos/estado que hoy, solo se reubica la presentación — NO cambiar la lógica de `firmar()`/`descargar()`).
- Conservar íntegros: `firmar()`, `descargar()`, aborto por `AbortController`, invalidación de queries, toasts, modal `PrepararEquipoFirma`.
- `PrevisualizarAnexo` sale de esta nube (lo mueve F1-3).
**Aceptación:** en un anexo firmable se ve 1 botón primario + 1 menú; todas las acciones previas siguen accesibles desde el menú; firmar/descargar/agregar funcionan igual; `tsc` verde.
**Archivos:** `features/firmaperu/BotonFirmaPeru.tsx` (reescritura de la vista, no de la lógica). **Verificación:** `npx tsc --noEmit`.

### Tarea F1-3 — Previsualización como acción secundaria del header
**Objetivo:** que "Previsualización" deje de competir como botón índigo primario.
**Cambio:** en [AnexoLayout.tsx](../../frontend/src/components/anexos/AnexoLayout.tsx), separar la previsualización de `BotonFirmaPeru`. Renderizar `PrevisualizarAnexo` (de `features/firmaperu/PrevisualizarAnexo.tsx`) como botón `ghost`/`outline` discreto junto al `EstadoAnexoChip`, y dejar `BotonFirmaPeru` (ya colapsado por F1-2) como la acción de firma. Revisar el mapa `TIPOS_FIRMA` (líneas 14-16) — la previsualización aplica a los mismos tipos.
**Aceptación:** la fila del header queda con jerarquía clara: chip de estado + previsualización discreta + acción de firma (1 botón+menú) + acciones propias del anexo. Nada de 6 botones índigo en fila.
**Archivos:** `components/anexos/AnexoLayout.tsx`; posible ajuste menor en `AnexoHeader.tsx`. **Verificación:** `npx tsc --noEmit` + revisar visualmente (Tarea de QA al final, F4-2).

---

## Fase 2 — Integración de la firma al flujo institucional

### Tarea F2-1 — Estado de firma visible en el paso de Entrega
**Objetivo:** que al remitir se vea si el acta/anexos están firmados, no solo en el header del anexo.
**Contexto:** `features/entregas/` (`EntregasPage.tsx`, `DetalleEntregaModal.tsx`, `BandejaRevisorView.tsx`). El backend expone estado de firma vía `firmaperuService.estado(tipoDocumento, dependenciaId)`.
**Cambio:** en el detalle de entrega / acta, mostrar un indicador de estado de firma (firmado vigente / pendiente / sin verificar / histórico no vigente) reutilizando el query `['firmaperu', tipo, dependenciaId]`. Solo lectura; no duplicar la lógica de firmar.
**Aceptación:** al abrir el detalle de una entrega cuyo proceso exige firma, se ve el estado de firma del acta. `tsc` verde.
**Archivos:** `features/entregas/DetalleEntregaModal.tsx` (+ posible sub-componente). **Depende de:** F1-2 (para reutilizar presentación coherente).

### Tarea F2-2 — "Qué sigue" incluye firmar el acta
**Objetivo:** guiar al usuario cuando el proceso exige firma.
**Contexto:** `components/anexos/QueSigueCard.tsx` ya orquesta el "qué sigue" en el dashboard.
**Cambio:** cuando el proceso tenga `exige_firma_acta` encendido y el acta no esté firmada vigente, añadir el paso "Firmar el Acta (Anexo 07)" con enlace a `/acta`. Requiere que el backend exponga `exige_firma_acta` en el payload de estado del proceso (verificar; si no, añadirlo en F3-1).
**Aceptación:** con el gate encendido y acta sin firmar, el dashboard muestra el paso de firma; con gate apagado no aparece. `tsc` verde.
**Archivos:** `components/anexos/QueSigueCard.tsx`. **Depende de:** F3-1 (expone el flag al frontend).

---

## Fase 3 — Encender firma real: toggle admin por proceso

> **Decisión del usuario (2026-11-12):** `exige_firma_acta` queda **apagado por defecto**; el administrador lo enciende **por proceso** desde la UI. Reversible. No se fuerza global.

### Tarea F3-1 — Endpoint toggle `exige_firma_acta` por proceso
**Objetivo:** permitir encender/apagar el gate de firma por proceso vía API, con permiso.
**Contexto:** no hay controller de procesos. Columna `procesos_transferencia.exige_firma_acta` ya existe (migración `2026_11_11_000004`). El gate ya la respeta en `TransferenciaService::exigirActaFirmada()`.
**Cambio:**
- Nuevo `ProcesoTransferenciaController` (o método en uno existente de `Transferencia`) con `PATCH /api/procesos/{proceso}/exige-firma-acta` (body `{ exige: bool }`), protegido por permiso de administración (reutilizar el permiso de gestión más cercano; revisar `auth/permisos` y seeder). Auditar el cambio (patrón `Auditable`/`MovimientoAuditoria` ya usado).
- Exponer `exige_firma_acta` en el payload de estado del proceso que ya consume el frontend (para F2-2 y F3-2).
- Registrar la ruta en `backend/routes/api.php`.
**Aceptación:** un admin puede encender/apagar el flag por proceso; queda auditado; un no-admin recibe 403; el estado del proceso devuelve el flag. Test nuevo en `tests/Feature` (p. ej. `ToggleFirmaActaTest`). Suite verde (salvo los 7 de OpenSSL).
**Archivos:** nuevo controller en `backend/app/Modules/Transferencia/Controllers/`, `routes/api.php`, posible Request de validación, test nuevo, espejo permiso en `frontend/src/auth/permisos.ts` si se crea permiso nuevo.

### Tarea F3-2 — Control de admin en la UI
**Objetivo:** interruptor visible para el admin.
**Contexto:** `features/admin/AdminPage.tsx` + `admin.service.ts` + `use-admin.ts`.
**Cambio:** añadir un toggle "Exigir firma del acta para remitir" por proceso, que llame al endpoint de F3-1, con confirmación (`confirm-dialog`) porque cambia el flujo de remisión para todos en ese proceso. Mostrar estado actual. Solo visible con el permiso correspondiente.
**Aceptación:** el admin ve y cambia el flag; la confirmación advierte el efecto; refleja el estado real tras guardar. `tsc` verde.
**Archivos:** `features/admin/AdminPage.tsx`, `features/admin/admin.service.ts`, `features/admin/use-admin.ts`. **Depende de:** F3-1.

---

## Fase 4 — Navegación y limpieza

### Tarea F4-1 — Revisión de navegación
**Objetivo:** que el menú refleje el flujo nuevo sin confundir.
**Contexto:** `frontend/src/layouts/navegacion.ts` (ITEMS_NAV) + `AppLayout.tsx`. Hoy "Anexo 01 · Organigrama" apunta a `/organigrama`, mismo destino que "Estructura Orgánica" (posible duplicidad). No hay entrada específica de firma (correcto: la firma vive dentro de cada anexo).
**Cambio:** revisar duplicidades (organigrama), orden de agrupación y etiquetas; NO añadir un módulo "Firma" suelto (la firma es contextual al anexo). Ajustes mínimos y justificados.
**Aceptación:** menú coherente, sin destinos duplicados confusos. `tsc` verde.
**Archivos:** `layouts/navegacion.ts`, posible `layouts/AppLayout.tsx`.

### Tarea F4-2 — QA visual + limpieza de código muerto
**Objetivo:** cerrar el ciclo y quitar sobras.
**Cambio:** correr la app (`/run` o `npm run dev` en `frontend`), revisar los headers de anexos (02-07) con el nuevo patrón de botones, el flujo de firma de punta a punta, y el toggle admin. Quitar imports/código muerto que dejaron F1-F3. Ejecutar `php artisan test` y `npx tsc --noEmit` finales.
**Aceptación:** anexos con 1 acción primaria + menú; firma funciona end-to-end; sin warnings de tsc; suite backend verde (salvo 7 OpenSSL). Actualizar el tablero de abajo.
**Archivos:** varios (limpieza). **Verificación:** `npx tsc --noEmit` + `php artisan test` + revisión en navegador.

---

## Tablero de estado

| Tarea | Fase | Estado | Depende de |
|---|---|---|---|
| F1-1 | UX | ⬜ Pendiente | — |
| F1-2 | UX | ⬜ Pendiente | F1-1 |
| F1-3 | UX | ⬜ Pendiente | F1-2 |
| F2-1 | Integración | ⬜ Pendiente | F1-2 |
| F2-2 | Integración | ⬜ Pendiente | F3-1 |
| F3-1 | Firma real | ⬜ Pendiente | — |
| F3-2 | Firma real | ⬜ Pendiente | F3-1 |
| F4-1 | Navegación | ⬜ Pendiente | — |
| F4-2 | QA/limpieza | ⬜ Pendiente | todas |

## Cómo usar este plan (una tarea por sesión)

1. Abre una sesión nueva de Claude Code y di: *"Ejecuta la Tarea F1-1 de `docs/nuevos-requerimientos/07-plan-integracion-firma-ux.md`"*.
2. La tarea es autocontenida: su sección nombra archivos, criterios y verificación. El "Contexto permanente" de arriba da lo necesario para arrancar en frío.
3. Al cerrar, marca la tarea ✅ en el tablero y haz commit. Pasa a la siguiente respetando "Depende de".
4. No mezcles tareas en una sesión salvo que sean triviales y dependientes.
