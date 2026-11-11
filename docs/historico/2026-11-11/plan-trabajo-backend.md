# PLAN DE TRABAJO — BACKEND

**Sistema de Transferencia de Gestión 2026 — Municipalidad Distrital de San Jerónimo**

**Versión:** 1.0
**Fecha:** 2026-11-03
**Stack:** Laravel 13 · PHP 8.4 · PostgreSQL 16 · Monolito modular (`app/Modules/*`)
**Documento base:** [plan-inicial.md](plan-inicial.md)

---

## 1. Objetivo del plan

Guiar la construcción incremental del backend del sistema, con énfasis en:

- **Separación de responsabilidades** — arquitectura de monolito modular (un módulo por área funcional del plan). Controllers delgados, lógica en Services, validación en Form Requests, persistencia en Models/Repositories.
- **Componentes reutilizables** — clases base (`BaseModel`, trait de auditoría, enums compartidos, respuestas API estandarizadas).
- **Trazabilidad** — todo registro conserva fuente (SGD/SIGA/MANUAL), fecha de corte, responsable y auditoría (RN-03, RN-09, RN-12, RN-14).
- **No destructividad** — las declaraciones de usuarios nunca mutan datos de origen (RN-06).

## 2. Convenciones de arquitectura

```
backend/app/
├── Models/                      # User + modelos transversales
├── Modules/
│   └── <Modulo>/
│       ├── Controllers/         # HTTP, delgados — delegan a Services
│       ├── Models/              # Eloquent del dominio del módulo
│       ├── Requests/            # Form Requests (validación + autorización)
│       ├── Services/            # Lógica de negocio
│       └── (Resources/, Policies/, Enums/ según se necesite)
└── Support/                     # Código transversal reutilizable
    ├── Models/BaseModel.php
    ├── Concerns/                # Traits: Auditable, HasFuenteDato
    ├── Enums/                   # FuenteDato, EstadoEntrega, EstadoObservacion, Rol...
    └── Http/ApiResponse.php
```

**Reglas:**
- Namespace PSR-4: `App\Modules\<Modulo>\...` (ya cubierto por `App\ => app/`).
- Migraciones: nombres descriptivos, FKs explícitas, `->comment()` en columnas de dominio, timestamps + `softDeletes` donde aplique cierre/auditoría.
- Nomenclatura de tablas en español, snake_case plural (`dependencias`, `bienes_patrimoniales`).
- Enums PHP 8.4 respaldados (`backed enum`) para estados y catálogos cerrados.
- Cada operación relevante → auditoría (trait `Auditable`).

## 3. Modelo de datos (entidades esenciales)

### Núcleo organizacional (Organization)
- `dependencias` — centro de costo, jerárquico (`parent_id` self-ref), nivel, código SGD, tipo.
- `servidores` — persona/servidor público; DNI, nombres, cargo; pertenece a dependencia.
- `asignaciones_rol` — usuario ↔ rol ↔ dependencia (permisos por ámbito).

### Proceso (Transferencia)
- `procesos_transferencia` — periodo, fecha de corte, estado global.
- `entregas` — unidad de remisión jerárquica (emisor, receptor, estado, timestamps) (Etapa 2–4).
- `observaciones` — polimórfica sobre cualquier anexo/elemento; estado, subsanación (7.9).
- `movimientos_auditoria` — bitácora transversal (RN-14).

### Anexos (un módulo por anexo)
- **Gestion** (Anexo 02) — `informes_gestion`: funciones, logros, dificultades, pendientes.
- **Acervo** (Anexo 03) — `acervo_documental`: distingue físico/digital, series, unidades de conservación.
- **Patrimonio** (Anexo 04) — `bienes_patrimoniales` (origen SIGA) + `verificaciones_bien` (confirmación física, estado, observación).
- **Personal** (Anexo 05) — `personal`: DNI, cargo, régimen, modalidad, situación laboral.
- **NoPatrimonial** (Anexo 06) — `bienes_no_patrimoniales`: cantidad, unidad, estado, ubicación.
- **Documentos** (7.7) — `documentos_pendientes`: origen SGD + complemento, estado, antigüedad.
- **Transferencia** (Anexo 07) — `actas_transferencia`.
- **Expediente** (7.12) — `expedientes`: agrupa anexos/evidencias por centro de costo.

### Soporte transversal
- `evidencias` — archivos adjuntos polimórficos (storage seguro).
- Enums: `FuenteDato` (SGD/SIGA/MANUAL), `EstadoEntrega`, `EstadoObservacion`, `EstadoBien`, `Rol`.

## 4. Fases de implementación (versionadas)

| Fase | Entregable | Estado |
|------|-----------|--------|
| **F0** | Infra base: `composer install`, `.env`, APP_KEY, Sanctum (`install:api`), soporte transversal (BaseModel, enums, traits, ApiResponse) | ✅ |
| **F1** | Migraciones + modelos del núcleo organizacional (dependencias, servidores, roles) | ✅ |
| **F2** | Proceso de transferencia + auditoría (procesos, entregas, observaciones, movimientos) | ✅ |
| **F3** | Migraciones + modelos de anexos patrimoniales (Patrimonio, NoPatrimonial) + evidencias | ✅ |
| **F4** | Migraciones + modelos de anexos documentales/gestión (Gestion, Acervo, Personal, Documentos) | ✅ |
| **F5** | Expediente, Actas | ✅ |
| **F6** | Seeders (roles, catálogos, datos de prueba) + factories | 🟡 Parcial |
| **F7** | Services + Form Requests + Controllers + rutas API (por módulo) | ✅ |
| **F8** | Autorización por **rol** (middleware `permiso`) ✅ · por **ámbito** (dependencia + subárbol) ✅ | ✅ |
| **F9** | Importadores (Excel SGD/SIGA) + Reportes (PDF/Excel) | ⬜ |
| **Auth+Ingesta SGD** | Login por DNI (Sanctum), ingesta directa SGD→dominio, preparar activación, catálogo roles/permisos | ✅ |
| **Ingesta SGD ampliada** | Enriquecimiento (email, encargatura), catálogos SGD, acervo digital (Anexo 03) y documentos pendientes (§7.7) | ✅ |
| **Flujo de transferencia** | Integridad de edición (RN-13), observaciones/subsanaciones (§7.9), acta real (§7.10) y cierre hacia el ETTS (§7.6). Firma digital pendiente | ✅ (firma ⬜) |

**Alcance de esta sesión:** F0 → F5 completadas (migraciones y modelos esenciales + soporte reutilizable). Services/Controllers/rutas (F7+) en sesiones siguientes.

### Verificación realizada (2026-11-03)

- Las 17 migraciones de dominio + Sanctum migran sin errores (validadas con SQLite; PostgreSQL pendiente de levantar Docker).
- Los 17 modelos instancian correctamente; relaciones (jerarquía autorreferenciada, polimórficas, 1:1, 1:N) verificadas end-to-end.
- Reglas de negocio comprobadas: auditoría automática (RN-14), `requiereObservacion()` en verificación de bienes (RN-05), defaults de fuente por modelo SGD/SIGA/MANUAL (RN-03).
- `vendor/bin/pint` pasa sin observaciones.

### Migración en PostgreSQL ejecutada (2026-11-04)

- `docker compose up -d db backend` + `php artisan migrate` dentro del contenedor `backend`: las 17 tablas de dominio + Sanctum creadas correctamente (27 tablas en total).
- Columnas `jsonb` nativas confirmadas: `actas_transferencia.intervinientes`, `actas_transferencia.anexos_entregados`, `movimientos_auditoria.valores_anteriores/nuevos`.

> **Entorno unificado en PHP 8.4** (2026-11-04): imagen Docker actualizada a `php:8.4-fpm-alpine`, `composer.json` fijado a `^8.4` y `composer.lock` re-resuelto en 8.4 (coincide con el host). El contenedor corre PHP 8.4.27.
>
> ⚠️ **Nota de puerto:** el host tiene un PostgreSQL 18 local ocupando el puerto 5432, por lo que las migraciones y comandos artisan que tocan la BD deben ejecutarse **dentro del contenedor** (`docker exec sis_transferencia_backend ...`, con `DB_HOST=db`), no desde el host contra `127.0.0.1`.

## 5. Decisiones abiertas (a validar)

- Autenticación: Sanctum (API SPA React) asumido por defecto — confirmar vs SSO institucional.
- `parent_id` de dependencias: profundidad variable (1er/2do/3er nivel) — se modela recursivo.
- Multi-proceso: se incluye `proceso_transferencia_id` en registros para soportar ediciones futuras, aunque 2026 sea único.

## 6. Bitácora de avance

- **2026-11-03 v1.0** — Plan creado. Inicio de F0 (dependencias composer, soporte transversal) y F1 (núcleo organizacional).
- **2026-11-03 v1.1** — Completadas F0–F5: 17 migraciones, 17 modelos, 6 enums, 4 traits reutilizables, Sanctum instalado. Decisiones confirmadas: auth Sanctum, Servidor separado de User. Verificado con SQLite + Pint.
- **2026-11-04 v1.2** — Autenticación e ingesta SGD.
  - **Auth por DNI:** `users` gana `dni` (login único), `activo`, `servidor_id`; email nullable. `Modules/Auth`: `AutenticacionService` (login/logout Sanctum), `AuthController` (`POST /api/auth/login`, `logout`, `GET /api/auth/me`), `LoginRequest`.
  - **Ingesta SGD (solo lectura):** conexión `sgd` (sqlsrv) en `config/database.php` + `config/sgd.php` + bloque `SGD_DB_*` en `.env`. `Modules/Organization/Services/IngestaSgd` + comando `sgd:ingestar` pueblan `dependencias` (jerarquía, encargado) y `servidores` (DNI, nombres, apellidos, **cargo real** vía `RHTM_CARGOS`) del proceso activo con `updateOrCreate` idempotente. Fuentes: `RHTM_DEPENDENCIA`, `RHTM_PER_EMPLEADOS` (+ `RHTM_CARGOS`).
  - **Preparar activación:** `PrepararActivacion` + `ActivacionController` (`GET /api/servidores`, `preparar-activacion`, `activar`). El encargado de dependencia (según SGD) recibe rol `responsable_centro_costo` por cada dependencia encargada.
  - **Autorización:** enum `Permiso` + catálogo `permisos`/`rol_permiso` (migración) sembrado por `RolesPermisosSeeder`; `AdminSeeder` crea proceso 2026 + admin inicial.
  - **Entorno (importante):** `pdo_sqlsrv` solo existe en el host → `sgd:ingestar` se corre **desde el host**. El Postgres del contenedor se publicó en **host:55432** (el 5432 lo ocupa un Postgres local); el `.env` del host apunta a `127.0.0.1:55432`, mientras el contenedor usa `db:5432` por variables de compose (tienen prioridad sobre `.env`).
  - **Verificado (2026-11-04):** SGD lee 157 dependencias / 645 empleados; ingesta puebla 157 deps (156 con padre, 157 con encargado resuelto) y 645 servidores (cargo real + dependencia). Flujo e2e: propuesta de roles → activación → login por DNI → permisos derivados → rechazo de password inválida. Pint y `php artisan test` en verde.
- **2026-11-04 v1.3** — Ingesta SGD ampliada (catálogos + documental). Base de REPORTE_SGD (ingeniería inversa del SGD ya verificada en vivo).
  - **Enriquecimiento organizacional:** `servidores.email` ← `CEMP_EMAIL` (validado con `FILTER_VALIDATE_EMAIL`); `dependencias.tipo_encargatura` ← `CO_TIPO_ENCARGATURA` y `codigo_titular_sgd` ← `CO_EMP_TITULAR`. Migración `...000004_enrich_organization_from_sgd`.
  - **Catálogos SGD (solo lectura):** tablas `tipos_documentales_sgd` (`SI_MAE_TIPO_DOC`, 82) y `estados_sgd` (`TDTR_ESTADOS` dominios `TDTV_REMITOS`/`TDTV_DESTINOS`, 18). Modelos `TipoDocumentalSgd`, `EstadoSgd`; servicio `IngestaCatalogosSgd`. Migración `...000005_create_sgd_catalogos_tables`.
  - **Acervo digital (Anexo 03, §7.3):** `IngestaDocumentalSgd::ingestarAcervoDigital` — resumen por dependencia emisora + tipo documental + año vía `GROUP BY` en SQL Server (no trae documentos individuales). Escribe `acervo_documental` con `tipo=digital`.
  - **Documentos pendientes (§7.7):** `IngestaDocumentalSgd::ingestarDocumentosPendientes` — enfoque de **agregado directo** (no se copia el bruto). Join `TDTV_DESTINOS`×`TDTV_REMITOS` filtrado en origen por reglas R01–R03 + estado de recepción no resuelto. **Pendiente** = `ES_DOC_REC NOT IN (2,3,4,5,9)` (atendido/archivado/derivado/enviado/anulado); verificado en vivo que `ES_DES` es inútil (siempre `0`) y el estado real vive en `ES_DOC_REC`. Asunto desde `DE_ASU` (requirió ampliar `documentos_pendientes.asunto` a `text`, migración `...000006`). Poda idempotente: soft-delete de pendientes SGD del ámbito que ya no vienen de la consulta; nunca toca registros manuales.
  - **Comando:** `sgd:ingestar` gana `--catalogos`, `--documental`, `--solo-catalogos`. Orden: organizacional → catálogos → documental (la documental usa los catálogos para nombrar tipos).
  - **Verificado (2026-11-04, piloto dep 00001):** catálogos 82 tipos + 18 estados; acervo 5 series digitales (CARTA/INFORME/MEMORÁNDUM/PROVEIDO/HOJA DE ENVIO); 43 documentos pendientes (37 no leídos + 6 recibidos), re-ejecución idempotente estable. Pint y `php artisan test` en verde. **Ingesta del universo completo (157 deps) aún no ejecutada** — pendiente de visto bueno por volumen.
- **2026-11-06 v1.4** — F8 autorización por rol (nivel de acción).
  - **Enforcement:** middleware `App\Http\Middleware\VerificarPermiso` (alias `permiso`), registrado en `bootstrap/app.php`. Resuelve el permiso contra `User::tienePermiso()` (catálogo materializado `rol_permiso`), rechaza 401 sin auth, 403 por cuenta inactiva o permiso faltante. Soporta varios permisos en OR (`permiso:anexos.ver,reportes.ver`). El ApiResponse mantiene el envoltorio estándar.
  - **Rutas:** todos los endpoints de `routes/api.php` quedan protegidos por su permiso (anexos ver/registrar, bienes.verificar, entregas.remitir, actas.generar, usuarios.gestionar). Antes solo exigían `auth:sanctum` → cualquier cuenta autenticada accedía a todo.
  - **Factories (abono a F6):** `UserFactory` alineada al esquema real (dni/activo/servidor_id) + estados `inactivo()`; nuevas `ProcesoTransferenciaFactory` y `AsignacionRolFactory`; `HasFactory` + `newFactory()` en `ProcesoTransferencia` y `AsignacionRol`.
  - **Tests:** `tests/Feature/AutorizacionPermisosTest` (9 casos) prueba concesión y rechazo por rol, cuenta inactiva y acta solo para responsable de centro de costo. Suite completa en verde (11 tests), Pint limpio.
  - **Pendiente explícito — autorización por ámbito (dependencia):** el middleware controla *qué acción* puede hacer un rol, no *sobre qué dependencia*. Hoy un servidor puede consultar datos de otra dependencia pasando otro `dependencia_id` (los services filtran por el parámetro, sin validar que el usuario pertenezca a ese ámbito ni a su subárbol). Requiere, por módulo, acotar las consultas al ámbito del usuario (dependencia propia + subárbol para roles consolidadores). No incluido en esta sesión.
- **2026-11-06 v1.5** — F8 autorización por ámbito + flujo de remisión jerárquico. Aclaración del modelo operativo (ver [propuesta-directiva.md](propuesta-directiva.md) §7.2–7.4).
  - **Aclaración de negocio:** no todos los servidores entran a la plataforma. En una dependencia, el encargado **designa a un integrante** (delegado) para completar los anexos; este los remite al encargado, que **evalúa**, agrega su propia información y remite al **padre**; sube por niveles (3°→2°→1°→ETTS) con verificación de coordinadores ETTE. El **Anexo 02 (Informe de Gestión) es mayormente manual**. Las firmas serán **firma digital** (mecanismo a definir en sesión aparte).
  - **Delegado (decisión):** no se crea rol nuevo. El delegado es un `servidor` con `AsignacionRol` sobre la dependencia que debe llenar. Puede registrar/editar anexos de esa dependencia; remitir lo hace el encargado (`responsable_centro_costo`, permiso `entregas.remitir`).
  - **Ámbito (modelo):** `User::dependenciasEnAmbito()` resuelve el alcance por rol — admin/ETTS/ETTE = global (`null` = sin filtro); responsable_centro_costo/equipo y coordinador = dependencia asignada **+ subárbol** (`Dependencia::idsSubarbol()`, recursivo por `parent_id`, portable SQLite/PG); servidor/delegado = dependencia asignada exacta. `User::puedeAccederDependencia()` es el punto de verdad.
  - **Enforcement:** trait `App\Support\Concerns\AutorizaAmbito` para controllers (`autorizarDependencia()` → 403 fuera de ámbito; `acotarFiltrosAlAmbito()` inyecta `dependencia_ids` en listados). Escrituras de anexos: `App\Support\Http\AnexoFormRequest` base valida el ámbito en `authorize()` (lo extienden los Guardar*Request de Acervo/Gestión/Personal/NoPatrimonial/Documentos). Lectura/escritura por `id` (Patrimonio show/verificar) verifica contra la dependencia del bien cargado. Los services ganan filtro `dependencia_ids` (whereIn).
  - **Flujo de remisión:** `TransferenciaService::revisarEntrega()` + `POST /api/transferencia/revisar` (permiso `entregas.revisar`): el responsable del padre **observa** (→ OBSERVADA, devuelve para subsanar) o **consolida** (→ CONSOLIDADA). Usa el `EstadoEntrega` ya existente; deja constancia de receptor y fecha (RN-14). No muta datos de origen (RN-06).
  - **Factories (abono a F6):** `DependenciaFactory` (+ `hijaDe()`), `HasFactory`/`newFactory()` en `Dependencia`.
  - **Tests:** `AutorizacionAmbitoTest` (8: servidor acotado, delegado, subárbol de consolidador, ETTS global, listado acotado) y `FlujoRemisionTest` (4: remitir, consolidar, observar, servidor no revisa). Suite completa **23 en verde**, Pint limpio.
  - **Pendiente:** firma digital (investigar proveedor PKI/RENIEC — fuera de sesión); el Anexo 02 mayormente manual ya es soportado por el formulario actual (campos libres), sin precarga SGD.
- **2026-11-06 v1.6** — Completado el flujo de transferencia: integridad de edición, observaciones/subsanaciones, acta real y cierre hacia el ETTS (ver [propuesta-directiva.md](propuesta-directiva.md) §7.5–7.6, §7.9, §7.10).
  - **#1 Bloqueo de edición tras remitir (RN-13):** nuevo trait `App\Support\Concerns\RespetaEstadoEntrega` (ortogonal a `AutorizaAmbito`: aquél decide *quién/sobre qué dependencia*, éste *en qué estado del flujo*). `exigirEntregaModificable()` resuelve la última `Entrega` de la dependencia en el proceso activo y lanza **409** si ya fue remitida y no está OBSERVADA (BORRADOR/OBSERVADA/sin entrega = editable; OBSERVADA reabre para subsanar). Enganchado en los **services** de los 6 anexos (Gestión, Acervo, Patrimonio, Personal, NoPatrimonial, Documentos) — único punto por el que pasan tanto las escrituras por payload `dependencia_id` como las identificadas por id de registro (update/delete, Patrimonio verificar).
  - **#2 Observaciones y subsanaciones (§7.9):** `ObservacionService` + `ObservacionController` + `RegistrarObservacionRequest`/`SubsanarObservacionRequest` + rutas `GET/POST /api/observaciones`, `POST /api/observaciones/{id}/subsanar`, `.../desestimar`. La observación es polimórfica sobre el elemento de anexo (whitelist de claves `gestion|acervo|patrimonio|personal|nopatrimonial|documento` → modelo, evita class strings arbitrarios); el ámbito se verifica contra la dependencia del observable. Estados reales del enum: ABIERTA → SUBSANADA/DESESTIMADA (abiertas = ABIERTA+EN_SUBSANACION). **Re-remisión automática:** al cerrar la última observación abierta de una entrega OBSERVADA, ésta vuelve a REMITIDA. Relación con `revisarEntrega`: marcar la entrega OBSERVADA es el estado agregado; las observaciones concretas las registra el mismo revisor (tiene `observaciones.registrar`) por el endpoint propio.
  - **#4 Acta real (§7.10):** `obtenerActa()` ahora exige entrega **CONSOLIDADA** (409 en otro caso) y construye `anexos_entregados` desde la presencia real por anexo (`presenciaAnexos()`, apoyada en `obtenerEstadoEntrega()` + documentos pendientes), en lugar del hardcode `true`. De paso se corrigió la escritura del acta a las columnas reales del esquema (`numero_acta`, `fecha_acta`, `intervinientes`, `anexos_entregados`, `estado`, `generada_por_id`) — antes escribía columnas inexistentes (`codigo`/`lugar`/`fecha_hora`) silenciadas por mass-assignment.
  - **#3 Cierre hacia el ETTS (Etapa 6, §7.6):** la entrega de una dependencia en la cima de su cadena (sin `parent_id`) se remite con `dependencia_destino_id = NULL` = ETTS institucional. `Entrega::esHaciaEtts()` lo expone; el `estado` de entrega publica `destino_id`/`hacia_etts`/`consolidada_en`. El rol **ETTS gana `entregas.revisar`** para recibir y consolidar institucionalmente esas entregas con el mismo `revisarEntrega` (ámbito global ya lo habilitaba).
  - **Tests:** `BloqueoEdicionTrasRemitirTest` (6), `ObservacionesTest` (6), `ActaTransferenciaTest` (2), `CierreHaciaEttsTest` (3). Suite completa **40 en verde**, Pint limpio.
  - **Pendiente explícito — firma digital:** sigue sin implementar (requiere decidir proveedor PKI/RENIEC + infra de firmado de PDF); documentado como seam en el acta (`ruta_pdf`/`ruta_pdf_suscrito`, estado `suscrita`).
