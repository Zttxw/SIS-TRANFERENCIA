# Plan de integración Firma Perú + UX de anexos — tareas pequeñas

**Fecha:** 2026-11-12. **Base:** rama `feature/firma-peru-v2` fusionada en `main` (commit `a6908a5`), con las 2 migraciones de Firma Perú ya aplicadas. **Enfoque:** una tarea por sesión de chat de Claude, cada una autocontenida para arrancar en frío sin re-explorar el repo (optimiza tokens). **Estilo:** igual que [06-plan-de-desarrollo.md](06-plan-de-desarrollo.md) — alcance acotado, criterios de aceptación, archivos concretos, verificación con `tsc` + `php artisan test`.

## Contexto permanente (leer una vez por sesión)

- **Backend:** Laravel 13.40, PHP 8.4 y PostgreSQL. La suite usa SQLite en memoria. En Docker están disponibles OpenSSL y su configuración, y se verificaron las pruebas criptográficas junto con el resto de la suite. Ejecutar `docker compose exec -T backend php artisan test`.
- **Frontend:** React, TypeScript, Vite, react-router, @tanstack/react-query, Tailwind, sonner y lucide. La compilación con `npm run build` ejecuta `tsc -b` y Vite. Las pruebas Node se ejecutan con Node 24 mediante `node --experimental-vm-modules --test tests/*.test.mjs`. Estructura por `features/`, primitivas en `components/ui/` y marco de anexos en `components/anexos/`.
- **Primitivas UI existentes** (`frontend/src/components/ui/`): async-boundary, badge, button, card, combobox, confirm-dialog, data-table, dialog, dropdown-menu, editable-table, empty-state, form-field, input, label, pagination, popover, select, skeleton, spinner, textarea, tooltip.
- **Firma Perú (frontend):** vive en `features/firmaperu/`. `BotonFirmaPeru` conserva la lógica de firma, agregado de firmas, descarga y preparación del equipo. Los anexos 02–07 se firman desde las filas expandibles de `TablaAnexos` en el Dashboard. Los encabezados de esos anexos ofrecen previsualización y generación del borrador. El Anexo 01 conserva sus controles en Organización.
- **«Mi entrega»:** el panel de documentos está en `features/dashboard/DashboardPage.tsx`, con `TablaAnexos`, `DocumentoFirmaDetalle` y `MiniEstadoFirma`. La pestaña `mi_entrega` de `EntregasPage` sigue disponible para consultar y remitir la entrega. F2 reutiliza la presentación del estado de firma en su detalle de consulta.
- **Firma Perú (backend):** módulo `Transferencia`. Controllers `FirmaperuController`, `FirmaperuClienteController`. Services `FirmaperuAuthService`, `FirmaperuPdfService`, `FirmaperuRegistroService`, `FirmaperuSesionService`, `FirmaperuValidadorService`. Modelos `FirmaSesion` (uuid), `DocumentoFirma`, `FirmaAnexo`.
- **Compatibilidad del flujo anterior:** `TransferenciaService::exigirActaFirmada()` conserva la opción heredada `procesos_transferencia.exige_firma_acta`. Exige firma previa a la remisión cuando está activada y entra en conflicto con el acta posterior a consolidar de este plan. En el proceso local se verificó desactivada. F3 mantiene el flujo posterior a la consolidación aprobado por el usuario.
- **Procesos:** F3-1 implementa la generación del borrador. La administración de procesos y el toggle administrativo quedaron fuera del alcance de la F3 replanteada.
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
**Cambio:** cuando haya documentos con PDF generado pero sin firmar, añadir el paso "Firmar los documentos de la entrega" con enlace a `/#anexos-entrega` en el Dashboard. El acta participa en esa sugerencia tras consolidar. Reutilizar el estado de firma por documento ya expuesto.
**Aceptación:** con documentos generados sin firmar, el dashboard muestra el paso hacia «Mi entrega»; `tsc` verde.
**Archivos:** `components/anexos/QueSigueCard.tsx`. **Depende de:** F3-3.

---

## Fase 3 — Reestructuración: firma fuera del anexo, concentrada en «Mi entrega»

> **Decisión del usuario (2026-11-12) — reemplaza la F3 original (toggle admin de `exige_firma_acta`).** El problema real no era solo colapsar botones: es que **la firma no pertenece al anexo**. El anexo captura datos; la firma formaliza la entrega. Por eso:
>
> 1. **En cada anexo (02–06) y en el Acta (07) solo quedan dos acciones de documento:** `Previsualizar` y `Generar PDF`. **Se elimina `BotonFirmaPeru` del header del anexo.**
> 2. **`Generar PDF` = borrador oficial sobrescribible** (un solo archivo, se regenera cada vez). **No** cuenta como versión. El contador de versiones (v1, v2…) arranca **solo con la primera firma** — «las versiones solo existen cuando están firmadas».
> 3. **La firma se concentra en «Mi entrega» del Dashboard**, mediante `TablaAnexos` y `DocumentoFirmaDetalle`, una fila por documento 02–07 con su estado, versión firmada y acciones. Se reutiliza la lógica de `BotonFirmaPeru`.
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
**Objetivo:** concentrar la firma de los documentos 02–07 en «Mi entrega» del Dashboard, con una fila expandible por documento.
**Contexto:** el Dashboard reúne la tabla de anexos y el bloque de remisión. `BotonFirmaPeru.tsx` encapsula la lógica de firma, descarga y preparación del equipo.
**Cambio:**
- `features/dashboard/TablaAnexos.tsx` presenta una fila por documento. `DocumentoFirmaDetalle` reúne `EstadoFirma`, previsualización, generación y firma. `MiniEstadoFirma` muestra el estado en la fila cerrada. Se comparte el query `['firmaperu', tipo, dep]`.
- Acta 07: fila presente pero su acción de firma deshabilitada con nota «requiere entrega consolidada» salvo que lo esté.
- Mostrar la tabla en el Dashboard, encima del bloque «Remitir mi entrega».
**Aceptación:** desde «Mi entrega» se firma cualquier anexo 02–06 (orden libre), se ven versiones firmadas y se descarga; el Acta 07 se firma solo si la entrega está consolidada; remitir sigue funcionando; `tsc` verde.
**Archivos:** `features/dashboard/DashboardPage.tsx`, `TablaAnexos.tsx`, `features/firmaperu/DocumentoFirmaDetalle.tsx`, `MiniEstadoFirma.tsx` y `BotonFirmaPeru.tsx`.

---

## Fase 4 — Navegación y limpieza

### Tarea F4-1 — Revisión de navegación
**Objetivo:** que el menú refleje el flujo nuevo sin confundir.
**Contexto:** `frontend/src/layouts/navegacion.ts` (ITEMS_NAV) y `AppLayout.tsx`. Se conserva «Anexo 01 · Organigrama» como destino único de `/organigrama`. Las firmas de 02–07 están en el Dashboard.
**Cambio:** revisar duplicidades (organigrama), orden de agrupación y etiquetas; NO añadir un módulo "Firma" suelto (la firma es contextual al anexo). Ajustes mínimos y justificados.
**Aceptación:** menú coherente, sin destinos duplicados confusos. `tsc` verde.
**Archivos:** `layouts/navegacion.ts`, posible `layouts/AppLayout.tsx`.

### Tarea F4-2 — QA visual + limpieza de código muerto
**Objetivo:** cerrar el ciclo y quitar sobras.
**Cambio:** revisar en la aplicación los encabezados de anexos 02–07, el panel de firma del Dashboard y las pantallas de la fase 5. Comprobar el flujo completo con el cliente institucional, conservando la firma del acta tras consolidar. Limpiar imports sobrantes y ejecutar la compilación y las suites backend y frontend.
**Aceptación:** encabezados con previsualización y generación de PDF, firma desde el Dashboard, acta habilitada tras consolidar, pruebas y compilación correctas y revisión visual completada.
**Archivos:** varios (limpieza). **Verificación:** `npx tsc --noEmit` + `php artisan test` + revisión en navegador.

---

## Fase 5 — UI faltante del plan 06 (backend listo, sin frontend)

> **Hallazgo (2026-11-12):** el plan 06 completó el backend (111 tests verde) pero **5 bloques nunca recibieron frontend**. El endpoint existe; nadie lo consume. Esta fase cierra esos huecos. **Recuerda la Regla de diseño UX de arriba: en cada tarea, consulta el diseño con el usuario antes de implementar.** El "Diseño UX propuesto" es el borrador de partida.
>
> **Deudas de UX detectadas (auditoría)** — se resuelven embebidas donde tocan: U3 `<select>` crudos → primitiva `Select` (dentro de F5-1); U5 duplicidad organigrama en menú (dentro de F4-1); U6 adopción de `notificarError` en features no migrados (donde cada tarea toque ese `use-*.ts`).

### Tarea F5-1 — E1: sumilla + justificación en documentos (RF-001)
**Backend listo:** la migración `2026_11_11_000006` añade `sumilla` y `justificacion_pendiente` a `documentos_pendientes`. La justificación es obligatoria para registros complementarios manuales. El formulario y sus tipos ya envían ambos campos y muestran los errores de validación junto al campo correspondiente.
**Diseño aprobado e implementado:** `sumilla` y `justificacion_pendiente` debajo del asunto. La justificación es requerida en los registros manuales que edita este formulario, conforme al backend. El estado usa la primitiva `Select`. Los errores 422 aparecen junto al campo correspondiente.
**Aceptación:** se puede guardar sumilla y justificación; el 422 marca el campo exacto; `<select>` reemplazado por `Select`; `tsc` verde.
**Archivos:** `features/documentos/DocumentoModal.tsx`, `features/documentos/documentos.service.ts`, `types/` de documentos.

### Tarea F5-2 — E2: drill-down de indicadores a listado documental (RF-002)
**Backend listo:** `GET /api/documentos-pendientes/drilldown` (`DocumentoPendienteController::drilldown`, permiso `anexos.ver,reportes.ver`). `DocumentosIndicadorModal` consume el listado con los filtros del indicador de dependencia y estado.
**Diseño aprobado e implementado:** modal paginado con documento, asunto/sumilla, estado y referencia del original SGD. Los indicadores documentales del Dashboard pasan su dependencia y estado al listado. El tablero institucional permite consultar documentos por dependencia desde su fila. Se conserva el conjunto local importado que sustenta el indicador.
**Aceptación:** click en un indicador lleva al listado filtrado coherente con ese indicador; filtros compartidos; `tsc` verde.
**Archivos:** `features/dashboard/TableroOperativoView.tsx`, nuevo servicio/consulta de drilldown, posible nueva vista de listado.

### Tarea F5-3 — B2: constancia de ausencia de firma ETTE
**Backend listo:** `POST /firmas/ausencia-ette` con `firmas.constancia_ausencia` y `GET` de consulta en `ConstanciaAusenciaController`.
**Diseño aprobado e implementado:** acción secundaria en el detalle del acta consolidada, visible con permiso. El modal admite nombre del integrante y nota, y requiere confirmar la entrega de la copia digital. Se muestran las constancias registradas con su versión y fecha de copia.
**Aceptación:** el responsable del CC puede registrar la ausencia; queda reflejada; un no-autorizado no ve la acción; `tsc` verde.
**Archivos:** `features/firmaperu/ConstanciaAusenciaEtte.tsx` y `features/dashboard/TablaAnexos.tsx`.

### Tarea F5-4 — C: cronograma (gestión + aviso de bloqueo) (RF-007)
**Backend listo:** `/cronograma`, consulta con `anexos.ver` o `cronograma.gestionar` y escritura con `cronograma.gestionar`. La respuesta incluye el vencimiento calculado por el servidor. El bloqueo de remisión devuelve 409 con `errors.cronograma`.
**Diseño UX propuesto (borrador — CONSULTAR antes de implementar):** dos piezas.
- **F5-4a Gestión:** pantalla nueva `features/cronograma/` para Admin/ETTS (permiso `cronograma.gestionar`): lista de actividades por proceso (etapa, nombre, fechas, estado) estilo `AnexoCrudPage`, modal de alta/edición, acción "prorrogar". Nueva entrada en `layouts/navegacion.ts` condicionada al permiso. Estados con tokens: `en_curso`=info, `vencida`=danger, `completada`=success.
- **F5-4b Aviso de bloqueo:** traducir el 409 `errors.cronograma` en `RemitirModal` con copy claro (plazo vencido), reutilizando el patrón de `AlertaBloqueoEntrega`/`notificarError`. (Converge con U2/F2.)
**Diseño aprobado e implementado:** pantalla propia con entrada condicionada por permiso, tabla por actividad con etapa y ámbito, formularios de alta/edición y prórroga, y confirmación de eliminación. El diálogo de remisión conserva y muestra la causa de bloqueo.
**Aceptación:** Admin/ETTS gestionan actividades y prórrogas (auditado); un plazo vencido bloquea remisión con mensaje claro; permiso respetado; `tsc` verde.
**Archivos:** nuevo `features/cronograma/` (page + modal + service + hook), `layouts/navegacion.ts`, `features/dashboard/RemitirModal.tsx`.

### Tarea F5-5 — D: delegados ETTE (RF-008)
**Backend listo:** `/delegados` permite listar, designar y revocar con `delegados.gestionar`. `GET /delegados/candidatos` busca cuentas activas y devuelve su identificador, nombre y DNI. `DelegadoService` gestiona las asignaciones `delegado_ette`.
**Diseño UX propuesto (borrador — CONSULTAR antes de implementar):** pantalla para el comité `ette` (permiso `delegados.gestionar`): `DataTable` de delegados actuales; "Designar" → modal con `Combobox` para buscar una cuenta existente del padrón + selector de **dependencia exacta**; "Revocar" con confirmación suave. Entrada de menú condicionada al permiso.
**Diseño aprobado e implementado:** pantalla propia, búsqueda de cuenta con `Combobox`, selección de una dependencia exacta por designación y confirmación para revocar.
**Aceptación:** el comité designa/revoca delegados sobre cuentas existentes; no toca otros roles (404 si el rol no es delegado); permiso respetado; `tsc` verde.
**Archivos:** nuevo `features/delegados/` (o sub-sección de admin), `layouts/navegacion.ts` si lleva entrada propia.

---

## Tablero de estado

Actualizado el 2026-11-12 tras contrastar el plan con la implementación. El usuario aprobó mantener la firma en el Dashboard, el detalle documental en un modal, las constancias en el detalle del acta y las pantallas de Cronograma y Delegados mediante tablas y formularios modales. Confirmó conservar la firma del acta tras consolidar y el orden libre de los anexos 02–06.

Las correcciones incluyen el botón de primera firma y re-firma, el uso del PDF borrador guardado como entrada de la firma, la comprobación de cambios de contenido y el tratamiento de registros antiguos sin estado en los indicadores. Los borradores antiguos requieren regenerarse antes de firmar para registrar su huella de contenido. Se aplicaron localmente las migraciones de sumilla/justificación, borradores y huella de contenido.

Las pantallas implementadas requieren revisión visual dentro de F4-2. La herramienta de navegador detuvo la inspección al no poder identificar la URL actual con seguridad. La firma con certificado institucional y cliente de escritorio sigue pendiente de comprobación manual.

La validación automatizada comprende 211 pruebas backend con 743 aserciones y 32 pruebas frontend. Incluye la presentación del botón de primera firma, la re-firma de contenido corregido, la descarga de una firma vigente y el bloqueo del acta antes de consolidar. La compilación de producción se verificó con TypeScript y Vite.

| Tarea | Fase | Estado | Depende de |
|---|---|---|---|
| F1-1 | UX | ✅ Hecho | — |
| F1-2 | UX | ⤵️ Subsumida por F3-2/F3-3 | F1-1 |
| F1-3 | UX | ⤵️ Subsumida por F3-2 | F1-2 |
| F3-1 | Reestructuración · endpoint generar borrador | ✅ Hecho | — |
| F3-2 | Reestructuración · firma fuera del anexo | ✅ Hecho | F3-1 |
| F3-3 | Reestructuración · panel firma en «Mi entrega» | ✅ Hecho | F3-2 |
| F2-1 | Integración | ✅ Implementado · detalle de entrega en consulta | F3-3 |
| F2-2 | Integración | ✅ Implementado · sugerencia hacia el Dashboard | F3-3 |
| F4-1 | Navegación | ✅ Implementado · destino único del organigrama | — |
| F4-2 | QA/limpieza | 🟨 Limpieza y pruebas completadas · pendientes QA visual y certificado real | todas |
| F5-1 | UI plan 06 · E1 sumilla | ✅ Implementado | — |
| F5-2 | UI plan 06 · E2 drill-down | ✅ Implementado · modal paginado | — |
| F5-3 | UI plan 06 · B2 constancia | ✅ Implementado · detalle del acta consolidada | F3-3 |
| F5-4 | UI plan 06 · C cronograma | ✅ Implementado · gestión, prórroga y aviso de bloqueo | — |
| F5-5 | UI plan 06 · D delegados | ✅ Implementado · cuentas existentes y dependencia exacta | — |

**Prioridad de la Fase 5 (indicada por el usuario):** E1 + E2 primero, luego B2, luego C, luego D. Todas requieren consultar el diseño con el usuario antes de implementar (ver Regla de diseño UX).

## Cómo usar este plan (una tarea por sesión)

1. Abre una sesión nueva de Claude Code y di: *"Ejecuta la Tarea F1-1 de `docs/nuevos-requerimientos/07-plan-integracion-firma-ux.md`"*.
2. La tarea es autocontenida: su sección nombra archivos, criterios y verificación. El "Contexto permanente" de arriba da lo necesario para arrancar en frío.
3. Al cerrar, marca la tarea ✅ en el tablero y haz commit. Pasa a la siguiente respetando "Depende de".
4. No mezcles tareas en una sesión salvo que sean triviales y dependientes.
