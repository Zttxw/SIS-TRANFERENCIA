# Plan de integración Firma Perú + UX de anexos — tareas pequeñas

**Fecha:** 2026-11-12. **Base:** rama `feature/firma-peru-v2` fusionada en `main` (commit `a6908a5`), con las 2 migraciones de Firma Perú ya aplicadas. **Enfoque:** una tarea por sesión de chat de Claude, cada una autocontenida para arrancar en frío sin re-explorar el repo (optimiza tokens). **Estilo:** igual que [06-plan-de-desarrollo.md](06-plan-de-desarrollo.md) — alcance acotado, criterios de aceptación, archivos concretos, verificación con `tsc` + `php artisan test`.

## Contexto permanente (leer una vez por sesión)

- **Backend:** Laravel 11, PHP 8, PostgreSQL (`DB_DATABASE=sis_transferencia`, `APP_ENV=local`). Tests: `cd backend && php artisan test`. Hay 7 tests de `FirmaperuValidadorTest` que fallan **solo en esta máquina** por `openssl.cnf` ausente (`openssl_csr_new()` devuelve `false`); **no** es regresión — ignorarlos salvo que una tarea los aborde explícitamente. Suite útil: 193 verde.
- **Frontend:** React + TypeScript + Vite + react-router + @tanstack/react-query + tailwind + sonner (toasts) + lucide icons. Typecheck: `cd frontend && npx tsc --noEmit` (hoy en verde, exit 0). Estructura por `features/` + primitivas en `components/ui/` + marco de anexos en `components/anexos/`.
- **Primitivas UI existentes** (`frontend/src/components/ui/`): async-boundary, badge, button, card, combobox, confirm-dialog, data-table, dialog, editable-table, empty-state, form-field, input, label, pagination, **popover**, select, skeleton, spinner, textarea, tooltip. **NO existe** `dropdown-menu`.
- **Firma Perú (frontend):** vive en `features/firmaperu/`. Pieza central: [BotonFirmaPeru.tsx](../../frontend/src/features/firmaperu/BotonFirmaPeru.tsx) — encapsula TODA la lógica de firma (firmar/agregar/descargar/`PrepararEquipoFirma`/versiones/`vigente`). **Tras la reestructuración de la Fase 3, deja de montarse en el header del anexo y pasa a «Mi entrega»** (`features/entregas/`). Hoy se incrusta vía [AnexoLayout.tsx](../../frontend/src/components/anexos/AnexoLayout.tsx) (mapa `TIPOS_FIRMA`) y suelto en `acta/ActaPage.tsx`, `patrimonio/PatrimonioPage.tsx`, `organization/EstructuraOrganicaPage.tsx`, `organization/DespachoPersonalView.tsx`. **El estado de firma ya expone `version` y `vigente` por documento** (`firmaperu.types.ts`) — el versionado-al-firmar ya está soportado en el modelo.
- **«Mi entrega»:** es la pestaña `mi_entrega` («Remisión de mi Despacho») de [EntregasPage.tsx](../../frontend/src/features/entregas/EntregasPage.tsx) (líneas ~132-226). Ya muestra estado de la entrega + botón «Remitir». La Fase 3 la **amplía** con el panel de firma por documento. No se crea un módulo nuevo.
- **Firma Perú (backend):** módulo `Transferencia`. Controllers `FirmaperuController`, `FirmaperuClienteController`. Services `FirmaperuAuthService`, `FirmaperuPdfService`, `FirmaperuRegistroService`, `FirmaperuSesionService`, `FirmaperuValidadorService`. Modelos `FirmaSesion` (uuid), `DocumentoFirma`, `FirmaAnexo`.
- **Gate de firma del acta (B3b, ya implementado):** `TransferenciaService::exigirActaFirmada()` (líneas ~562-598). Ya valida sesión REAL de Firma Perú (`firma_sesion_id`, estado `firmada`, `vigente()`). Está **apagado por defecto**: columna `procesos_transferencia.exige_firma_acta` (boolean, default false). Encenderlo = política de la Tarea F3-1.
- **Procesos:** NO hay controller/endpoint para gestionar `procesos_transferencia` por UI todavía (solo el cronograma los referencia en `routes/api.php:148`). La Tarea F3-1 lo crea.
- **Permisos:** backend en seeder + enum `Rol`; espejo frontend en `frontend/src/auth/permisos.ts`. Mantener ambos sincronizados (patrón ya establecido en el proyecto).

## ⚠️ Regla de diseño UX (obligatoria en toda tarea con pantalla/flujo nuevo)

**Antes de escribir código de UI, Claude DEBE consultar al usuario sobre el diseño y esperar su aprobación.** El "Diseño UX propuesto" que acompaña a cada tarea de la Fase 5 es un **punto de partida, no una decisión cerrada**. El procedimiento por tarea es:

1. Leer el "Diseño UX propuesto" de la tarea y explorar los componentes que reutilizará.
2. **Presentar al usuario** el diseño concreto (layout, ubicación, estados, componentes a reutilizar) — preferiblemente con un mockup ASCII o 2-3 variantes vía `AskUserQuestion` cuando haya una decisión real que tomar (p. ej. pantalla propia vs. sub-sección, menú contextual vs. botón fijo).
3. **Esperar la aprobación o los ajustes del usuario.** No implementar hasta que el usuario confirme el diseño.
4. Recién entonces escribir el código, respetando el sistema de diseño (tokens semánticos, primitivas, `notificarError`, permiso-primero).

Esto aplica a todas las tareas que crean o modifican UI visible (Fase 1, 2, 3-2 y toda la Fase 5). Para tareas puramente de backend (F3-1) o de limpieza mecánica no hace falta, pero si hay duda, preguntar.

## El problema de UX (motivación)

En el header de cada anexo, la zona de acciones apila **hasta 7 controles** en una fila sin jerarquía: `Previsualización`, `Firmar con Firma Perú`, `Opciones de firma`, `PDF firmado`, `Agregar firma`, `PDF recibido · sin verificar`, más las acciones propias del anexo (`Nueva serie`…) y el `EstadoAnexoChip`. El usuario no distingue cuál es la acción principal. Objetivo: **una acción primaria clara por anexo**, lo demás colapsado en un menú.

## Orden de ejecución

F1 (UX botones) **✅ hecha** → **F3 (reestructuración: firma fuera del anexo, concentrada en «Mi entrega»)** → F2 (integración al flujo) → F4 (navegación + limpieza).

> **Replanteo (2026-11-12):** la Fase 1 colapsó la nube de botones *dentro* del anexo. Pero la decisión posterior fue más de fondo: **sacar la firma del anexo por completo** y llevarla al módulo «Mi entrega». Por eso F3 cambió de alcance (ver su cabecera) y **F1-2/F1-3 quedan subsumidas** por F3-2/F3-3 (el colapso de botones ya no aplica si los botones dejan de estar en el anexo). F2 pasa a ejecutarse **después** de F3, porque reutiliza el panel de firma de «Mi entrega».

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
**Aceptación:** al abrir el detalle de una entrega, se ve el estado de firma de sus documentos. `tsc` verde.
**Archivos:** `features/entregas/DetalleEntregaModal.tsx` (+ posible sub-componente). **Depende de:** F3-3 (reutiliza el panel/presentación de firma de «Mi entrega»).

### Tarea F2-2 — "Qué sigue" incluye firmar y remitir
**Objetivo:** guiar al usuario hacia la firma ahora que vive en «Mi entrega».
**Contexto:** `components/anexos/QueSigueCard.tsx` ya orquesta el "qué sigue" en el dashboard.
**Cambio:** cuando haya documentos con PDF generado pero sin firmar, añadir el paso "Firmar los documentos de la entrega" con enlace a `/entregas` (pestaña «Mi entrega»). Reutilizar el estado de firma por documento ya expuesto. No depende del toggle `exige_firma_acta` (descartado en el replanteo de F3).
**Aceptación:** con documentos generados sin firmar, el dashboard muestra el paso hacia «Mi entrega»; `tsc` verde.
**Archivos:** `components/anexos/QueSigueCard.tsx`. **Depende de:** F3-3.

---

## Fase 3 — Reestructuración: firma fuera del anexo, concentrada en «Mi entrega»

> **Decisión del usuario (2026-11-12) — reemplaza la F3 original (toggle admin de `exige_firma_acta`).** El problema real no era solo colapsar botones: es que **la firma no pertenece al anexo**. El anexo captura datos; la firma formaliza la entrega. Por eso:
>
> 1. **En cada anexo (02–06) y en el Acta (07) solo quedan dos acciones de documento:** `Previsualizar` y `Generar PDF`. **Se elimina `BotonFirmaPeru` del header del anexo.**
> 2. **`Generar PDF` = borrador oficial sobrescribible** (un solo archivo, se regenera cada vez). **No** cuenta como versión. El contador de versiones (v1, v2…) arranca **solo con la primera firma** — «las versiones solo existen cuando están firmadas».
> 3. **La firma se concentra en el módulo «Mi entrega»** (pestaña `mi_entrega` de `features/entregas/EntregasPage.tsx`, que **ya existe**): una fila por documento (02–07) con su estado de firma, versiones firmadas y la acción de firmar. Toda la lógica de `BotonFirmaPeru` se **reubica** aquí, no se reescribe.
> 4. **La inmutabilidad la sigue mandando el Acta 07 / `EstadoEntrega`.** Firmar **no** congela el anexo. `esModificable` (deriva de `estado` de la entrega: borrador/observada = editable) **no se toca** en ninguna página. Cero riesgo de regresión.
> 5. **Orden de firma:** libre para 02–06; el **Acta 07 al final** (se habilita solo con la entrega `consolidada`, como hoy — gate del 409 ya existente).
>
> **Backend de firma: no se reescribe.** `EstadoFirma`/`SesionFirma` ya exponen `version` y `vigente` (ver `firmaperu.types.ts`); `firmaperuService.estado/preparar/sesion/descargar` ya existen. La reestructuración es **de presentación y ubicación**, más un endpoint nuevo de «generar PDF borrador».
>
> **Diseño objetivo** (aprobado por el usuario, 2026-11-12):
> ```
> Header del anexo (02–06) / acta (07):
>   Anexo 03 · Acervo       [Chip estado]  [Previsualizar] [Generar PDF]  [Nueva serie…]
>
> Mi entrega (pestaña de EntregasPage), una fila por documento:
>   Anexo 02 · Informe de Gestión   PDF generado ✓ · Sin firmar      [Firmar ▾]
>   Anexo 03 · Acervo               Firmado v1 · 12/11   [Descargar] [Agregar firma ▾]
>   Anexo 04 · Patrimonio           ⚠ PDF no generado               [Generar]
>   Anexo 07 · Acta                 (requiere entrega consolidada)
>   Destino: ETTS Institucional                              [Remitir al Superior]
> ```

### Tarea F3-1 — Endpoint «Generar PDF borrador» del anexo
**Objetivo:** materializar/sobrescribir el PDF borrador oficial de un documento (02–07) sin firmarlo. Es el insumo que luego se firma en «Mi entrega».
**Contexto:** `FirmaperuPdfService` ya genera el PDF del anexo (lo usa `previsualizar` y `preparar`). Hoy el PDF solo se persiste al firmar. Falta un endpoint que persista el **borrador** (sobrescribible) y exponga si existe.
**Cambio:**
- Endpoint `POST /api/firmaperu/generar-borrador` (body `{ tipo_documento, dependencia_id }`), permiso `anexos.registrar` (y `actas.generar` para `anexo07`), que genera y **sobrescribe** el PDF borrador del documento. Reutilizar `FirmaperuPdfService`. **No** crea `DocumentoFirma` (eso es solo para firmados) — persistir como borrador (nueva columna/tabla mínima o reutilizar almacenamiento existente; decidir en la sesión mirando cómo guarda `preparar`).
- Extender el payload de `GET /firmaperu/estado/{tipo}/{dep}` con `borrador_generado: bool` y `borrador_generado_en: string|null`.
- Registrar ruta en `backend/routes/api.php`. Test en `tests/Feature`.
**Aceptación:** generar sobrescribe el borrador; el estado reporta `borrador_generado`; re-generar no crea versión; permiso respetado (403 si no); suite verde (salvo 7 OpenSSL).
**Archivos:** controller de firma en `backend/app/Modules/Transferencia/Controllers/`, `FirmaperuPdfService`, `routes/api.php`, test. Espejo en `firmaperu.types.ts` (`EstadoFirma`).

### Tarea F3-2 — Sacar la firma del anexo; dejar `Previsualizar` + `Generar PDF`
**Objetivo:** el header del anexo deja de montar `BotonFirmaPeru`.
**Contexto:** la firma se monta vía `AnexoLayout` (mapa `TIPOS_FIRMA`, líneas 15-17, 105-110) para 02–06, y **suelta** en `ActaPage.tsx` (07) y `PatrimonioPage.tsx` (04, que no usa `AnexoLayout`).
**Cambio:**
- En `AnexoLayout.tsx`: quitar `<BotonFirmaPeru>`; conservar `<PrevisualizarAnexo>`; añadir un botón **`Generar PDF`** (llama a F3-1, con toast y `invalidateQueries` del estado de firma). Mantener el divisor/jerarquía.
- Igual en `ActaPage.tsx` y `PatrimonioPage.tsx`: quitar `BotonFirmaPeru`, dejar `PrevisualizarAnexo` + `Generar PDF`.
- `BotonFirmaPeru.tsx` **no se borra** todavía (lo consume «Mi entrega» en F3-3). Sí se retiran sus importaciones de los anexos.
**Aceptación:** ningún header de anexo/acta muestra el control de firma; `Previsualizar` + `Generar PDF` presentes; `tsc` verde. (Las tareas F1-2/F1-3 de colapso de botones quedan **subsumidas** por esto — ver tablero.)
**Archivos:** `AnexoLayout.tsx`, `ActaPage.tsx`, `PatrimonioPage.tsx`, nuevo `use-generar-borrador.ts` o método en `firmaperu.service.ts`.

### Tarea F3-3 — «Mi entrega»: panel de firma por documento
**Objetivo:** concentrar toda la firma en la pestaña `mi_entrega` de `EntregasPage.tsx`, una fila por documento (02–07).
**Contexto:** la pestaña ya existe y muestra estado de entrega + «Remitir». `BotonFirmaPeru.tsx` ya encapsula toda la lógica (firmar/agregar/descargar/`PrepararEquipoFirma`/versiones/`vigente`).
**Cambio:**
- Nuevo sub-componente `features/entregas/DocumentosFirmaPanel.tsx`: por cada documento 02–07, una fila con nombre, `EstadoFirma` (reutilizar el query `['firmaperu', tipo, dep]`), indicador `borrador_generado`/`version`/`vigente`, y las acciones de firma **reubicando** `BotonFirmaPeru` (o extrayendo su cuerpo a un control por-fila). Mostrar `Generar PDF` en la fila si falta el borrador.
- Acta 07: fila presente pero su acción de firma deshabilitada con nota «requiere entrega consolidada» salvo que lo esté.
- Insertar el panel en la pestaña `mi_entrega`, encima del bloque de «Remitir».
**Aceptación:** desde «Mi entrega» se firma cualquier anexo 02–06 (orden libre), se ven versiones firmadas y se descarga; el Acta 07 se firma solo si la entrega está consolidada; remitir sigue funcionando; `tsc` verde.
**Archivos:** nuevo `features/entregas/DocumentosFirmaPanel.tsx`, `EntregasPage.tsx`, posible refactor menor de `BotonFirmaPeru.tsx` para reutilizar su control por fila.

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

## Fase 5 — UI faltante del plan 06 (backend listo, sin frontend)

> **Hallazgo (2026-11-12):** el plan 06 completó el backend (111 tests verde) pero **5 bloques nunca recibieron frontend**. El endpoint existe; nadie lo consume. Esta fase cierra esos huecos. **Recuerda la Regla de diseño UX de arriba: en cada tarea, consulta el diseño con el usuario antes de implementar.** El "Diseño UX propuesto" es el borrador de partida.
>
> **Deudas de UX detectadas (auditoría)** — se resuelven embebidas donde tocan: U3 `<select>` crudos → primitiva `Select` (dentro de F5-1); U5 duplicidad organigrama en menú (dentro de F4-1); U6 adopción de `notificarError` en features no migrados (donde cada tarea toque ese `use-*.ts`).

### Tarea F5-1 — E1: sumilla + justificación en documentos (RF-001)
**Backend listo:** migración `2026_11_11_000006` añadió `sumilla` y `justificacion` a `documentos_pendientes`; `GuardarDocumentoPendienteRequest` ya valida. El frontend `DocumentoModal` solo tiene `asunto`.
**Diseño UX propuesto (borrador — CONSULTAR antes de implementar):** sin pantalla nueva. En `features/documentos/DocumentoModal.tsx` añadir `sumilla` (Textarea, separada del `asunto`) y `justificacion` (Textarea, requerida cuando el estado implica pendiente). Aprovechar para migrar el `<select>` crudo de estado (líneas ~149-159) a la primitiva `Select` (mata U3). Mensajes de error vía el patrón 422 ya existente.
**Consultar al usuario:** orden/etiquetas de los campos nuevos, y si `justificacion` es siempre requerida o solo en ciertos estados.
**Aceptación:** se puede guardar sumilla y justificación; el 422 marca el campo exacto; `<select>` reemplazado por `Select`; `tsc` verde.
**Archivos:** `features/documentos/DocumentoModal.tsx`, `features/documentos/documentos.service.ts`, `types/` de documentos.

### Tarea F5-2 — E2: drill-down de indicadores a listado documental (RF-002)
**Backend listo:** `GET /documentos/drilldown` (`DocumentoPendienteController::drilldown`, permiso `anexos.ver,reportes.ver`). Ningún archivo frontend lo llama.
**Diseño UX propuesto (borrador — CONSULTAR antes de implementar):** integración, no pantalla. Los indicadores del dashboard (`features/dashboard/TableroOperativoView.tsx`) se vuelven clickeables; al pulsar uno, navega a un listado documental filtrado por el **mismo ámbito/periodo** del indicador (regla del plan: indicador y listado comparten filtros). El listado reutiliza `DataTable`.
**Consultar al usuario:** si el drill-down abre un modal sobre el dashboard o navega a una ruta nueva; qué columnas muestra el listado.
**Aceptación:** click en un indicador lleva al listado filtrado coherente con ese indicador; filtros compartidos; `tsc` verde.
**Archivos:** `features/dashboard/TableroOperativoView.tsx`, nuevo servicio/consulta de drilldown, posible nueva vista de listado.

### Tarea F5-3 — B2: constancia de ausencia de firma ETTE
**Backend listo:** `POST /firmas/ausencia-ette` (store, permiso `firmas.constancia_ausencia`) y `GET` de consulta (`ConstanciaAusenciaController`). Sin UI.
**Diseño UX propuesto (borrador — CONSULTAR antes de implementar):** acción contextual en `features/acta/ActaPage.tsx`, visible solo con `firmas.constancia_ausencia` (responsable del CC). Botón **secundario** "Registrar ausencia de firma" → `Dialog` con nota de constancia + marca de copia entregada (`copia_entregada_en`). Claramente subordinado a la firma normal; se integra con el colapso de botones de la Fase 1.
**Consultar al usuario:** ubicación exacta del botón (en ActaPage vs. en el menú de firma de F1-2) y qué campos pide el modal.
**Aceptación:** el responsable del CC puede registrar la ausencia; queda reflejada; un no-autorizado no ve la acción; `tsc` verde.
**Archivos:** `features/acta/ActaPage.tsx` + nuevo modal, `features/acta/acta.service.ts` (o servicio nuevo de firmas).

### Tarea F5-4 — C: cronograma (gestión + aviso de bloqueo) (RF-007)
**Backend listo:** `/cronograma` (index con `anexos.ver`; store/update/destroy con `cronograma.gestionar`). El gate de vencimiento ya devuelve 409 `errors.cronograma` al remitir. Sin UI.
**Diseño UX propuesto (borrador — CONSULTAR antes de implementar):** dos piezas.
- **F5-4a Gestión:** pantalla nueva `features/cronograma/` para Admin/ETTS (permiso `cronograma.gestionar`): lista de actividades por proceso (etapa, nombre, fechas, estado) estilo `AnexoCrudPage`, modal de alta/edición, acción "prorrogar". Nueva entrada en `layouts/navegacion.ts` condicionada al permiso. Estados con tokens: `en_curso`=info, `vencida`=danger, `completada`=success.
- **F5-4b Aviso de bloqueo:** traducir el 409 `errors.cronograma` en `RemitirModal` con copy claro (plazo vencido), reutilizando el patrón de `AlertaBloqueoEntrega`/`notificarError`. (Converge con U2/F2.)
**Consultar al usuario:** si el cronograma es pantalla propia con entrada de menú o sub-sección de otra; vista de lista vs. calendario/timeline; agrupación por etapa.
**Aceptación:** Admin/ETTS gestionan actividades y prórrogas (auditado); un plazo vencido bloquea remisión con mensaje claro; permiso respetado; `tsc` verde.
**Archivos:** nuevo `features/cronograma/` (page + modal + service + hook), `layouts/navegacion.ts`, `features/dashboard/RemitirModal.tsx`.

### Tarea F5-5 — D: delegados ETTE (RF-008)
**Backend listo:** `/delegados` (listar/designar/revocar, permiso `delegados.gestionar`, solo comité `ette`). `DelegadoService` solo toca asignaciones `delegado_ette`. Sin UI.
**Diseño UX propuesto (borrador — CONSULTAR antes de implementar):** pantalla para el comité `ette` (permiso `delegados.gestionar`): `DataTable` de delegados actuales; "Designar" → modal con `Combobox` para buscar una cuenta existente del padrón + selector de **dependencia exacta**; "Revocar" con confirmación suave. Entrada de menú condicionada al permiso.
**Consultar al usuario:** pantalla propia vs. sub-sección de `features/admin/`; si designar permite multi-dependencia o una a la vez.
**Aceptación:** el comité designa/revoca delegados sobre cuentas existentes; no toca otros roles (404 si el rol no es delegado); permiso respetado; `tsc` verde.
**Archivos:** nuevo `features/delegados/` (o sub-sección de admin), `layouts/navegacion.ts` si lleva entrada propia.

---

## Tablero de estado

| Tarea | Fase | Estado | Depende de |
|---|---|---|---|
| F1-1 | UX | ✅ Hecho | — |
| F1-2 | UX | ⤵️ Subsumida por F3-2/F3-3 | F1-1 |
| F1-3 | UX | ⤵️ Subsumida por F3-2 | F1-2 |
| F3-1 | Reestructuración · endpoint generar borrador | ✅ Hecho | — |
| F3-2 | Reestructuración · firma fuera del anexo | ⬜ Pendiente | F3-1 |
| F3-3 | Reestructuración · panel firma en «Mi entrega» | ⬜ Pendiente | F3-2 |
| F2-1 | Integración | ⬜ Pendiente | F3-3 |
| F2-2 | Integración | ⬜ Pendiente | F3-3 |
| F4-1 | Navegación | ⬜ Pendiente | — |
| F4-2 | QA/limpieza | ⬜ Pendiente | todas |
| F5-1 | UI plan 06 · E1 sumilla | ⬜ Pendiente | — |
| F5-2 | UI plan 06 · E2 drill-down | ⬜ Pendiente | — |
| F5-3 | UI plan 06 · B2 constancia | ⬜ Pendiente | F1-2 (preferible) |
| F5-4 | UI plan 06 · C cronograma | ⬜ Pendiente | — |
| F5-5 | UI plan 06 · D delegados | ⬜ Pendiente | — |

**Prioridad de la Fase 5 (indicada por el usuario):** E1 + E2 primero, luego B2, luego C, luego D. Todas requieren consultar el diseño con el usuario antes de implementar (ver Regla de diseño UX).

## Cómo usar este plan (una tarea por sesión)

1. Abre una sesión nueva de Claude Code y di: *"Ejecuta la Tarea F1-1 de `docs/nuevos-requerimientos/07-plan-integracion-firma-ux.md`"*.
2. La tarea es autocontenida: su sección nombra archivos, criterios y verificación. El "Contexto permanente" de arriba da lo necesario para arrancar en frío.
3. Al cerrar, marca la tarea ✅ en el tablero y haz commit. Pasa a la siguiente respetando "Depende de".
4. No mezcles tareas en una sesión salvo que sean triviales y dependientes.
