# Plan de desarrollo — tareas pequeñas

**Fecha:** 2026-11-11. **Base:** documentos 01–05 de esta carpeta. **Enfoque:** tareas pequeñas, verificables y encadenables. No se tocan decisiones marcadas como *abiertas* en [05-coherencia-y-decisiones.md](05-coherencia-y-decisiones.md); cada una de esas se registra como **bloqueada** hasta que se cierre.

## Principios

1. **Primero lo confirmado.** Se construye sobre decisiones confirmadas (C-01 a C-08, D-01/02/03/08/11/12). Lo abierto no bloquea el avance: se parquea explícitamente.
2. **Tareas pequeñas.** Cada tarea tiene alcance acotado, criterios de aceptación y pruebas. Se cierra con `php artisan test` en verde antes de pasar a la siguiente.
3. **No romper lo existente.** Se reutilizan módulos, enums, componentes UI y patrones ya probados (60 tests base). Ningún cambio silencioso de datos firmados ni de responsabilidad histórica.
4. **Backend manda.** Toda restricción se cumple en API/archivos/exportaciones, no solo en la interfaz.

## Orden de ejecución

Sigue el orden §7 del documento 05: endurecer la base → firmas/acta → cronograma → capacidades/ámbito → métricas. Las correcciones de base (H-01/H-04) van primero porque no dependen de ninguna decisión abierta y sostienen todo lo demás.

---

## Bloque A — Correcciones de base (sin decisiones abiertas)

### Tarea A1 — Transiciones estrictas de entrega (H-01)
**Problema:** `remitirEntrega()` usa `updateOrCreate` y fuerza `remitida` sin validar el estado anterior. La API puede re-remitir una entrega ya consolidada o cerrada.
**Cambio:** validar el estado previo antes de remitir. Solo se remite desde *sin entrega*, `borrador` u `observada`. Desde `remitida`/`en_revision`/`consolidada`/`cerrada` → 409 con mensaje claro.
**Aceptación:**
- Remitir una entrega `consolidada` devuelve 409.
- Remitir desde `observada` o borrador sigue funcionando.
- Prueba nueva en `FlujoRemisionTest` para el caso 409.
**Pruebas:** `FlujoRemisionTest`. **Estado:** ✅ HECHA (62 tests verde).

### Tarea A2 — Corregir estado de observación fuera de enum (H-04)
**Problema:** `PatrimonioService::verificarBien` crea una observación con `'estado' => 'pendiente'`, valor ausente de `EstadoObservacion`.
**Cambio:** usar `EstadoObservacion::ABIERTA->value`. Revisar que ningún otro punto escriba `'pendiente'` como estado de observación.
**Aceptación:** verificar un bien con observación crea una `Observacion` con estado `abierta`; se puede subsanar/desestimar por el ciclo normal.
**Pruebas:** `ObservacionesTest` (ciclo subsanación en verde). **Estado:** ✅ HECHA.

### Tarea A3 — Receptor inmediato en la revisión (H-02)
**Problema:** `revisar` valida permiso y ámbito, pero el ámbito (subárbol) puede incluir la propia dependencia; no se exige ser el receptor del destino.
**Cambio:** exigir que el revisor pertenezca a la dependencia destino de la entrega (o ETTS para destino NULL). No basta con que el subárbol la contenga.
**Aceptación:** un responsable cuyo ámbito incluye la hija pero no es el destino no puede revisar (403); el del destino sí.
**Pruebas:** `FlujoRemisionTest`. **Estado:** ✅ HECHA (63 tests verde). *Regla mínima: el revisor debe tener el destino en su ámbito (o ser global para destino NULL=ETTS). El receptor formal exacto por cuenta sigue en D-06.*

---

## Bloque B — Firma, acta y versiones (RF-004/005/009)

> **Bloqueado parcial:** orden de firmas, matriz documental ETTS y contingencia sin certificado (D-02, D-11) siguen abiertos. Se construye el andamiaje que no depende de ellos.

### Tarea B1 — Modelo de firmas por documento y versión ✅ HECHA
Tabla `firmas_anexo` **polimórfica** (apunta a cualquier anexo, como `evidencias`): proceso, dependencia, versión, firmante (cuenta/nombre/cargo), carácter (obligatoria/opcional), estado (pendiente/firmada/cancelada/ausente), hash del PDF firmado, resultado de verificación (jsonb), nota de constancia. Enums tipados `CaracterFirma` y `EstadoFirma`. Sin integrar proveedor.
**Entregado:** migración `2026_11_11_000001_create_firmas_anexo_table`, enums, modelo `FirmaAnexo` (scopes `obligatorias`/`validas`), factory con estados (`para`/`firmada`/`ausente`), `FirmaAnexoTest` (4 tests, 67 suite verde).
**Aceptación cumplida:** registra múltiples firmas sobre un mismo documento/versión sin perder las previas; distingue obligatoria/opcional y firmada/cancelada/ausente; cancelada y ausente no cuentan como válidas.
**Nota — lo que sigue BLOQUEADO (D-02):** *qué* persona firma *cada* anexo (matriz documental ETTS), el *orden* de firmas y el proveedor real Firma Perú/RENIEC. El andamiaje de datos no los presupone.

### Tarea B2 — Constancia de ausencia de firma ETTE + copia digital (C-08, D-12)
Registrar cuándo ETTE no firma (persona, dependencia, versión) y marcar entrega de copia digital trazable, sin presumir acuse.
**Aceptación:** la ausencia no bloquea remisión; queda constancia consultable.
**Estado:** BLOQUEADO hasta definir responsable del registro y canal (D-12).

### Tarea B3 — Mover emisión del acta antes de remitir (doc 05 §4)
Hoy el acta solo se emite tras consolidar. El nuevo flujo exige firmar el Anexo 07 antes de remitir.
D-05/D-06 cerrados (2026-11-11): VB por paquete y registrado; el acta declara **solo suscripción de
la hija**; corregir una observada genera **nueva versión** y **re-firma** de obligatorias.

- **B3a** ✅ HECHA: el acta se emite desde `borrador`/`observada` (antes exigía `consolidada`); su
  campo `declara` fija el momento (`suscripcion_hija` pre-remisión; `recepcion_consolidacion` tras
  consolidar). Lleva `version` y arranca en `generada`. La ruta post-consolidación sigue válida. El
  PDF del acta pre-remisión sale con marca **BORRADOR** automáticamente (ya lo decide
  `ContextoTransferencia::es_borrador`, compartido por todos los anexos; sin código nuevo).
- **B3c** ✅ HECHA: re-remitir una entrega `observada` sube la `version` del acta e **invalida** las
  firmas obligatorias previas (pasan a `cancelada`), para que una firma vieja no ampare una versión
  corregida. La re-remisión automática tras cerrar observaciones no reutiliza firma/plazo sin re-chequear.
- **B3b (gate duro)** — BLOQUEADO por **D-02**: exigir el acta *suscrita* como precondición de remitir
  presupone la **matriz de firmantes obligatorios** (quién debe firmar el acta), aún abierta. No se
  inventa: el andamiaje (`declara`, `version`, invalidación) admite activar el gate sin rehacerlo.

---

## Bloque C — Cronograma con bloqueo (RF-007, C-03) — ✅ COMPLETO

### Tarea C1 — Modelo de cronograma ✅ HECHA
Tabla `cronograma_actividades` por proceso (etapa, nombre, fecha_inicio/vencimiento, estado, `operacion`, `dependencia_id` nullable=general). Enum `EstadoActividadCronograma` (pendiente/en_curso/completada). Modelo `CronogramaActividad` con `estaVencida()` derivada (completar ≠ vencer; vence al fin del día) y scopes `paraOperacion`/`aplicablesA`. Auditado (Auditable). `CronogramaActividadTest`: 6 tests.

### Tarea C2 — Bloqueo por vencimiento en API ✅ HECHA
`CronogramaService::exigirPlazoVigente` → 409 con causa y plazo (`errors.cronograma`) cuando una actividad de `remision` venció. Cableado en `TransferenciaService::remitirEntrega` (se cumple en API, no solo UI). `CronogramaBloqueoTest`: 4 tests (vencida bloquea, vigente/completada/sin-cronograma no bloquean).

### Tarea C3 — Administración compartida administrador + ETTS ✅ HECHA
Permiso `cronograma.gestionar` otorgado a ADMINISTRADOR y ETTS (C-03); CRUD en `CronogramaController` (`/api/cronograma`), consulta con `anexos.ver`. Prórroga auditada (valores anteriores/nuevos). Mirror `frontend/src/auth/permisos.ts` actualizado (tsc verde). `CronogramaAdminTest`: 5 tests.

**Nota — lo que sigue en D-03 (abierto):** qué *otras* operaciones bloquea el vencimiento (firma, visto bueno, consolidación), fechas por dependencia vs generales, zona horaria/hora exacta de corte, y cómo se *retoma* un trámite vencido. El andamiaje admite ampliarlo (columna `operacion`, `dependencia_id`) sin rehacerlo; no se inventó la política.

---

## Bloque D — Capacidades y ámbito ETTE (RF-006/008) — ✅ COMPLETO

### Tarea D1 — Delegado ETTE por dependencia ✅ HECHA
Rol `delegado_ette` (UN rol, no uno por oficina) acotado por asignación: **ámbito de dependencia exacta** (no global, no subárbol — cae en la rama por defecto de `User::dependenciasEnAmbito`). Capacidades: consulta (`anexos.ver`/`expediente.ver`) + **firma opcional** (`firmas.firmar`); sin registrar/remitir/consolidar. El comité `ette` sigue siendo global (seguimiento) y NO firma por pertenecer al comité. Mirror `permisos.ts` + seeder actualizados. `DelegadoEtteAmbitoTest`: 5 tests.

### Tarea D2 — Gestión de delegados por el comité ETTE ✅ HECHA
Permiso `delegados.gestionar` (solo `ette`); `DelegadoController` (`/api/delegados`): listar/designar/revocar. `DelegadoService` solo toca asignaciones `delegado_ette` — **nunca** otros roles ni cuentas institucionales (revocar un rol que no es delegado → 404; el administrador general NO hereda esta gestión). Designación idempotente. `DelegadoGestionTest`: 6 tests.

**Nota — lo que sigue en D-08 (abierto):** dependencia exacta vs subárbol (se eligió exacta, ampliable), alta de cuentas *fuera del padrón* (aquí se designa a cuentas existentes), facultades individuales de cada miembro del comité y registro operativo de visita/no conformidad.

---

## Bloque E — Documentos, indicadores y métricas (RF-001/002/006)

### Tarea E1 — Sumilla y justificación de pendiente (RF-001)
Separar asunto de sumilla; exigir justificación. **Bloqueado** por D-04 (significado del corte).
### Tarea E2 — Drill-down de indicadores a listado documental (RF-002)
Indicador y listado comparten filtros/ámbito/periodo. **Bloqueado** por D-10 (acceso a originales SGD).

---

## Tablero de estado

| Tarea | Bloque | Estado | Depende de |
|---|---|---|---|
| A1 | Base | ✅ Hecha | — |
| A2 | Base | ✅ Hecha | — |
| A3 | Base | ✅ Hecha | D-06 (parcial) |
| B1 | Firma | ✅ Hecha (andamiaje) | matriz/proveedor → D-02 |
| B3a,B3c | Firma | ✅ Hecha | D-05/D-06 cerrados |
| B3b (gate) | Firma | Bloqueado | D-02 (matriz firmantes) |
| B2 | Firma | Bloqueado | D-12 |
| C1–C3 | Cronograma | ✅ Hecha | ampliación → D-03 |
| D1–D2 | ETTE | ✅ Hecha | ampliación → D-08 |
| E1–E2 | Documentos | Bloqueado | D-04/D-10 |

Las tareas "listas para iniciar" se construyen en su parte confirmada; la parte abierta se deja marcada y no se inventa.
