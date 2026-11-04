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
| **F6** | Seeders (roles, catálogos, datos de prueba) + factories | ⬜ |
| **F7** | Services + Form Requests + Controllers + rutas API (por módulo) | ⬜ |
| **F8** | Policies/autorización por rol y ámbito | ⬜ |
| **F9** | Importadores (Excel SGD/SIGA) + Reportes (PDF/Excel) | ⬜ |

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
