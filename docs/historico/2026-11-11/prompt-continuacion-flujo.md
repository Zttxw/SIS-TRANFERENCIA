# Prompt de continuación — Completar el flujo de transferencia (backend)

> Copia todo lo que sigue como primer mensaje en el nuevo chat. Está redactado para
> que el agente pueda continuar sin haber visto la conversación previa.

---

## Contexto del proyecto

**SIS-TRANSFERENCIA** — Sistema de Transferencia de Gestión 2026, Municipalidad
Distrital de San Jerónimo. Backend en `backend/` (Laravel 13 · PHP 8.4 ·
PostgreSQL 16 · monolito modular en `app/Modules/*`). La app Laravel está en
`backend/`, NO en la raíz del repo.

Documentos de referencia (leerlos antes de empezar):
- `docs/plan-trabajo-backend.md` — plan de fases y bitácora (lee la bitácora
  v1.4 y v1.5 al final: describen exactamente lo ya hecho).
- `docs/propuesta-directiva.md` — la directiva oficial; §7.2–7.4 (flujo por
  niveles), §7.9 (observaciones), §7.10 (acta). El formato de cada Anexo está
  al final del archivo.
- `docs/plan-inicial.md` — reglas de negocio RN-01..RN-14.

**Entorno / comandos:**
- Tests y Pint corren en el host: `cd backend && php artisan test` y
  `cd backend && vendor/bin/pint --dirty`. Los tests usan SQLite en memoria
  (no necesitan Docker ni las BD externas SGD/SIGA).
- La BD de dominio (Postgres) corre en Docker; las migraciones tocan el
  contenedor. Para esta tarea NO hace falta: todo se valida con tests SQLite.
- `php artisan route:list --path=api` para inspeccionar rutas.

## Modelo de autorización ya implementado (F8 — NO rehacer)

Dos capas, ya funcionando y testeadas:

1. **Por rol (qué acción):** middleware `permiso:<codigo>`
   (`app/Http/Middleware/VerificarPermiso.php`, alias en `bootstrap/app.php`).
   Se resuelve con `User::tienePermiso()` contra la tabla `rol_permiso`.
   Aplicado por endpoint en `routes/api.php`. Los permisos están en el enum
   `App\Support\Enums\Permiso` y el mapeo rol→permiso en
   `Permiso::inicialesPorRol()` (sembrado por `RolesPermisosSeeder`).

2. **Por ámbito (sobre qué dependencia):**
   - `User::dependenciasEnAmbito()` → lista de IDs accesibles, o `null` = global.
   - `User::puedeAccederDependencia(int $id)` → bool (punto de verdad).
   - Reglas: admin/ETTS/ETTE = global; responsable_centro_costo/equipo y
     coordinador = dependencia asignada **+ subárbol** (`Dependencia::idsSubarbol()`);
     servidor/delegado = dependencia asignada exacta.
   - Enforcement en controllers: trait `App\Support\Concerns\AutorizaAmbito`
     (`autorizarDependencia()` lanza 403; `acotarFiltrosAlAmbito()` inyecta
     `dependencia_ids` en listados).
   - Enforcement en escrituras de anexos: extender
     `App\Support\Http\AnexoFormRequest` (valida ámbito en `authorize()`).

**Concepto "delegado":** NO es un rol nuevo. Es un `servidor` (rol SERVIDOR) con
una `AsignacionRol` sobre la dependencia que debe completar. El encargado
(`responsable_centro_costo`) es quien **remite** (`entregas.remitir`) y **revisa**
(`entregas.revisar`).

**Factories disponibles:** `UserFactory` (con `->inactivo()`),
`ProcesoTransferenciaFactory`, `AsignacionRolFactory` (`->rol()`,
`->enDependencia()`), `DependenciaFactory` (`->hijaDe()`). Patrón en los tests
`backend/tests/Feature/AutorizacionAmbitoTest.php` y `FlujoRemisionTest.php`.

## Flujo de remisión ya implementado (NO rehacer)

- `POST /api/transferencia/remitir` (permiso `entregas.remitir`) →
  `TransferenciaService::remitirEntrega()`: crea/actualiza la `Entrega` con
  destino `parent_id`, estado REMITIDA.
- `POST /api/transferencia/revisar` (permiso `entregas.revisar`) →
  `TransferenciaService::revisarEntrega()`: el responsable del padre **observar**
  (→ OBSERVADA) o **consolidar** (→ CONSOLIDADA).
- Estados en `App\Support\Enums\EstadoEntrega`:
  BORRADOR, REMITIDA, EN_REVISION, OBSERVADA, CONSOLIDADA, CERRADA.

## TU TAREA: completar el flujo. Huecos detectados (en orden de prioridad)

### 1. Bloqueo de edición tras remitir (integridad — RN-13) — ALTA
`Entrega::esModificable()` existe (`backend/app/Modules/Transferencia/Models/Entrega.php`,
devuelve true solo en BORRADOR/OBSERVADA) pero **nadie lo invoca**. Hoy un
delegado puede seguir editando anexos de una dependencia cuya entrega ya está
REMITIDA o CONSOLIDADA.
- Al registrar/editar/eliminar cualquier anexo (Gestión, Acervo, Patrimonio,
  Personal, NoPatrimonial, Documentos), rechazar (409 o 403) si la `Entrega` de
  esa dependencia NO es modificable. Cuando está OBSERVADA debe permitirse editar
  (es el camino de subsanación). BORRADOR o sin entrega aún = editable.
- Punto natural: un chequeo reutilizable (¿otro método en el trait
  `AutorizaAmbito` o un nuevo trait `RespetaEstadoEntrega`?). Decide la ubicación
  y justifícala. Debe cubrir tanto escrituras por payload (`dependencia_id`) como
  por id de registro (Patrimonio verificar → dependencia del bien).

### 2. Módulo de Observaciones y subsanaciones (§7.9) — ALTA
El modelo `App\Modules\Transferencia\Models\Observacion` (polimórfico,
`observable_type/id`) y el enum `App\Support\Enums\EstadoObservacion` existen,
pero **no hay controller, service ni rutas**. Sin esto, el coordinador ETTE no
puede ejercer su `observaciones.registrar` ni el responsable su
`observaciones.subsanar`.
- Crear `Modules/Transferencia` (o un módulo `Observaciones`) con service +
  controller + rutas:
  - Registrar observación sobre un anexo/elemento (coordinador; permiso
    `observaciones.registrar`). Debe quedar asociada polimórficamente al registro
    observado y a su dependencia (para el ámbito).
  - Listar observaciones por dependencia/anexo (con ámbito).
  - Subsanar: el responsable responde y adjunta sustento; cambia estado
    (ABIERTA → EN_SUBSANACION → SUBSANADA/CERRADA, según el enum real — verifícalo).
  - Al subsanar la última observación abierta de una entrega OBSERVADA, permitir
    re-remitir (vuelve a REMITIDA).
- Integración con `revisarEntrega`: cuando el revisor "observa", debería poder
  crear observaciones concretas (no solo marcar la entrega OBSERVADA con un
  comentario suelto). Define la relación entre "entrega observada" y las
  "observaciones" individuales.

### 3. Cierre de la cadena hacia el ETTS (Etapa 6) — MEDIA
`revisarEntrega` consolida la entrega de una hija en su padre, pero no hay paso
que lleve la información consolidada del **primer nivel al ETTS**. Revisa §7.5–7.6
de la directiva: el responsable de 1er/2do nivel remite al ETTS; el ETTS recibe,
revisa y consolida institucionalmente. Modela ese último salto (puede ser una
`Entrega` con destino "ETTS" o un estado/flag de consolidación institucional —
decide y documenta).

### 4. Acta real en lugar de hardcode (§7.10) — MEDIA
`TransferenciaService::obtenerActa()` marca `anexo_01..07 => true` hardcodeado.
Debe reflejar el estado real: qué anexos existen/están completos para esa
dependencia (apóyate en `obtenerEstadoEntrega()`, que ya calcula presencia por
anexo). El acta solo debería poder emitirse cuando la entrega está CONSOLIDADA.

### 5. (NO en esta tarea) Firma digital
Pendiente, requiere decidir proveedor (PKI/RENIEC, firmado de PDF) e infra. Déjalo
documentado como seam, no lo implementes salvo que el usuario lo pida.

## Reglas de trabajo
- Controllers delgados; lógica en Services; validación/autorización en Form
  Requests. Respuestas con `App\Support\Http\ApiResponse`.
- Auditoría: los modelos de dominio usan el trait `Auditable` (RN-14) — no
  reinventar.
- No mutar datos de origen SGD/SIGA (RN-06).
- Cada cambio relevante: **tests de feature** (patrón en los tests existentes) y
  `vendor/bin/pint --dirty`. La suite debe quedar verde (`php artisan test`).
- Al terminar, **actualiza la bitácora** de `docs/plan-trabajo-backend.md` con una
  entrada nueva (v1.6) y marca en la tabla de fases lo que corresponda.
- Antes de implementar algo con decisiones abiertas (p. ej. cómo modelar el salto
  al ETTS, o dónde vive el chequeo de estado de entrega), confirma el enfoque con
  el usuario en lugar de asumir.

## Primer paso sugerido
Leer `docs/plan-trabajo-backend.md` (bitácora v1.4/v1.5), el enum
`EstadoObservacion`, el modelo `Observacion`, y los tests existentes; luego
proponer al usuario el orden de ataque (sugerido: 1 → 2 → 4 → 3) y empezar por el
bloqueo de edición (#1), que es pequeño y de alto impacto.
