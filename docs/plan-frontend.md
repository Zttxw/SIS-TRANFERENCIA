# Plan de frontend — SIS-TRANSFERENCIA (por etapas)

> Documento de arranque y hoja de ruta del frontend. Redactado para que un agente
> pueda **empezar sin haber visto la conversación previa** y avanzar etapa por
> etapa. Cada etapa es un entregable revisable; al final de cada una: build/lint
> en verde y actualización de la bitácora (§ Bitácora, al final).

---

## 1. Contexto del proyecto

**SIS-TRANSFERENCIA** — Sistema de Transferencia de Gestión 2026, Municipalidad
Distrital de San Jerónimo. Monorepo:

- `backend/` — Laravel 13 · PHP 8.4 · PostgreSQL 16 · monolito modular
  (`app/Modules/*`). **Ya implementado**: auth por DNI, ingesta SGD/SIGA,
  autorización por rol + ámbito, los 7 anexos, flujo de remisión jerárquico,
  observaciones/subsanaciones, acta y cierre hacia ETTS. Ver
  `docs/plan-trabajo-backend.md` (bitácora v1.0 → v1.6).
- `frontend/` — **a crear en este plan.** React + Vite + TypeScript.

Documentos de referencia (leer antes de empezar):
- `docs/plan-trabajo-backend.md` — qué expone el backend y su bitácora.
- `docs/propuesta-directiva.md` — directiva oficial; §7.1–7.10 (flujo, roles,
  anexos). El formato de cada Anexo está al final del archivo.
- `docs/plan-inicial.md` — reglas de negocio RN-01..RN-14.
- `docs/prompt-continuacion-flujo.md` — contexto del flujo backend (útil para
  entender estados de entrega y observaciones).

**Entorno / comandos:**
- Backend local: `cd backend && php artisan serve` (por defecto
  `http://127.0.0.1:8000`). La API vive bajo `/api/*`.
- Frontend (una vez creado): `cd frontend && npm run dev` (Vite, por defecto
  `http://localhost:5173`).
- Tests backend (no tocar salvo que se pida): `cd backend && php artisan test`.

---

## 2. Stack y decisiones (confirmadas con el usuario)

| Área | Elección |
|------|----------|
| Framework | **React 18 + Vite + TypeScript** (SPA) |
| Ubicación | carpeta **`frontend/`** hermana de `backend/` |
| Estilos / UI | **Tailwind CSS + shadcn/ui** (componentes copiables, accesibles) |
| Routing | **React Router** (v6+) |
| Estado servidor | **TanStack Query** (`@tanstack/react-query`) + **axios** |
| Estado cliente | React Context para auth; Zustand solo si hace falta |
| Formularios | **react-hook-form** + **zod** (validación cliente alineada a las reglas del backend) |
| Fechas | `date-fns` |
| Iconos | `lucide-react` (viene con shadcn/ui) |
| Toasts/feedback | `sonner` (o el toast de shadcn) |

**Principios:**
- Tipar las respuestas de la API (archivo `src/types/api.ts`) alineadas al
  wrapper `ApiResponse` del backend (ver §4).
- Un cliente axios central con interceptores (token + manejo de 401/403/409/422).
- Gating de UI por **permiso**, no por rol directamente (ver §5): el frontend
  deriva permisos desde los roles del usuario replicando
  `Permiso::inicialesPorRol()`. Mantener ese mapa en un solo lugar
  (`src/auth/permisos.ts`) y comentarlo como "espejo del backend".
- Componentes de anexo siguen un patrón común (lista + filtros + formulario +
  estado de entrega). Se construye una vez (Etapa 4, Gestión) y se replica.

---

## 3. Autenticación (cómo funciona el backend — importante)

- **Login:** `POST /api/auth/login` con `{ dni, password, device_name? }`.
  Respuesta: `data.token` (token **Bearer** de Sanctum) + `data.usuario` (perfil).
  → Guardar el token (localStorage) y enviarlo en `Authorization: Bearer <token>`.
- **Perfil:** `GET /api/auth/me` → perfil del usuario (ver shape en §4).
- **Logout:** `POST /api/auth/logout` (revoca el token actual).
- **Es auth por token, NO por cookies SPA.** No hay flujo CSRF/stateful de
  Sanctum configurado. El frontend solo adjunta el header Bearer.
- **CORS:** el backend hoy no tiene `config/cors.php` publicado. Si el navegador
  bloquea las llamadas desde `http://localhost:5173`, pedir al usuario (o hacer,
  si se tiene acceso al backend) publicar CORS y permitir ese origin. En
  desarrollo, alternativa: **proxy de Vite** (`server.proxy` en `vite.config.ts`
  redirige `/api` → `http://127.0.0.1:8000`), que evita CORS por completo. Usar
  el proxy por defecto en dev.

### Shape de `data.usuario` (login y `/auth/me`)
```jsonc
{
  "id": 1,
  "dni": "12345678",
  "nombre": "Juan Pérez",
  "email": "juan@...",
  "activo": true,
  "roles": [
    { "rol": "responsable_centro_costo", "etiqueta": "...", "dependencia_id": 42 }
  ],
  "servidor": { "id": 9, "dependencia_id": 42, "dni": "...", "nombres": "...",
                "apellidos": "...", "cargo": "...", "es_responsable": true,
                "dependencia": { "id": 42, "codigo": "...", "nombre": "...", "nivel": 2 } }
}
```
Un usuario puede tener **varias asignaciones de rol** (sobre distintas
dependencias). El frontend debe manejar la lista `roles`, no un rol único.

---

## 4. Contrato de la API (wrapper `ApiResponse`)

Todas las respuestas usan este envoltorio (backend `App\Support\Http\ApiResponse`):

**Éxito simple:**
```jsonc
{ "success": true, "message": "...", "data": { ... } }
```
**Paginado** (listados de anexos):
```jsonc
{ "success": true, "data": [ ... ],
  "meta": { "current_page": 1, "last_page": 5, "per_page": 15, "total": 73 } }
```
**Error:**
```jsonc
{ "success": false, "message": "...", "errors": { "campo": ["..."] } }  // errors solo en 422
```

**Códigos que el cliente debe tratar:**
- `401` → sin/caducó token → limpiar sesión y redirigir a login.
- `403` → fuera de ámbito o sin permiso → toast "no autorizado" (no romper la app).
- `409` → **conflicto de estado del flujo** (p. ej. editar anexo de una entrega
  ya remitida — RN-13; o emitir acta sin entrega consolidada). Mostrar el
  `message` tal cual: es información accionable para el usuario.
- `422` → validación → mapear `errors` a los campos del formulario.

---

## 5. Autorización en el frontend (rol → permiso → UI)

El backend protege cada endpoint con el middleware `permiso:<codigo>` y, además,
acota por **ámbito** (dependencia + subárbol). El frontend **no reimplementa el
ámbito** (confía en el backend: un 403 significa "fuera de ámbito"); pero sí
**oculta/deshabilita** controles según el **permiso** para no ofrecer acciones
que fallarán.

- Enum de permisos (espejo de `App\Support\Enums\Permiso`): `plataforma.acceder`,
  `usuarios.gestionar`, `anexos.ver`, `anexos.registrar`, `bienes.verificar`,
  `entregas.remitir`, `entregas.revisar`, `entregas.consolidar`,
  `observaciones.registrar`, `observaciones.subsanar`, `actas.generar`,
  `expediente.ver`, `reportes.ver`, `reportes.exportar` (+ roles/parametros/ingesta).
- Mapa **rol → permisos** (espejo de `Permiso::inicialesPorRol()`) en
  `src/auth/permisos.ts`. Derivar el set de permisos del usuario como la unión
  de los permisos de todos sus roles.
- Hook `usePermiso('anexos.registrar')` y componente `<Can permiso="...">` para
  gating declarativo.

**Resumen de roles (de la directiva §7 y el backend):**
- `servidor` (y el "delegado" = servidor asignado a una dependencia): ve/registra
  anexos de su dependencia, verifica bienes, remite, subsana.
- `responsable_centro_costo`: todo lo del servidor + revisar/consolidar/observar
  su subárbol, generar actas, reportes.
- `responsable_equipo`: similar al anterior para su equipo.
- `coordinador` (ETTE acreditado): ve y **registra observaciones**; no edita anexos.
- `ETTS`: ve todo (global), **revisa/consolida** entregas de 1er/2do nivel, actas.
- `ETTE`: ve y verifica (consulta global).
- `administrador`: gestiona usuarios/roles/parámetros/ingesta; no accede a anexos
  por defecto.

---

## 6. Mapa de endpoints por pantalla

| Pantalla / módulo | Endpoints |
|---|---|
| Login | `POST /auth/login`, `GET /auth/me`, `POST /auth/logout` |
| Dashboard (estado) | `GET /transferencia/estado?dependencia_id=` |
| Dependencias (selector de ámbito) | `GET /dependencias`, `GET /dependencias/{id}` |
| Anexo 01 — Documentos pendientes | `GET/POST /documentos-pendientes`, `PUT/DELETE /{id}`, `GET /documentos-pendientes/resumen` |
| Anexo 02 — Gestión | `GET /gestion/informe?dependencia_id=`, `POST /gestion/informe` |
| Anexo 03 — Acervo | `GET/POST /acervo`, `PUT/DELETE /acervo/{id}` |
| Anexo 04 — Patrimonio | `GET /patrimonio/bienes`, `GET /patrimonio/bienes/{id}`, `POST /patrimonio/bienes/{id}/verificar`, `GET /patrimonio/resumen` |
| Anexo 05 — Personal | `GET/POST /personal`, `DELETE /personal/{id}` |
| Anexo 06 — No patrimonial | `GET/POST /nopatrimonial`, `PUT/DELETE /nopatrimonial/{id}` |
| Observaciones | `GET/POST /observaciones`, `POST /observaciones/{id}/subsanar`, `POST /observaciones/{id}/desestimar` |
| Entrega / flujo | `POST /transferencia/remitir`, `POST /transferencia/revisar` |
| Acta (Anexo 07) | `GET /transferencia/acta?dependencia_id=` |
| Evidencias (adjuntos) | `POST /evidencias`, `GET /evidencias/{id}/descargar` |
| Admin — activación de cuentas | `GET /servidores`, `POST /servidores/{id}/preparar-activacion`, `POST /servidores/{id}/activar` |

> Nota de filtros: los listados aceptan `dependencia_id`, `search`/`buscar`,
> `per_page` y filtros propios (p. ej. `estado_verificacion` en Patrimonio,
> `estado_atencion` en Documentos, `tipo` en Acervo). Sin `dependencia_id` el
> backend acota al ámbito del usuario automáticamente.

---

## 7. Etapas de implementación (versionadas)

> Orden pensado para entregar valor pronto y dejar un patrón replicable antes de
> multiplicar anexos. Cada etapa termina con build + lint verdes y entrada en la
> bitácora.

### E1 — Fundaciones (scaffolding)
- Crear `frontend/` con Vite (`react-ts`). Instalar y configurar Tailwind +
  shadcn/ui, React Router, TanStack Query, axios, react-hook-form, zod, date-fns,
  lucide-react, sonner.
- `vite.config.ts` con **proxy `/api` → `http://127.0.0.1:8000`** para dev.
- Cliente API central (`src/lib/api.ts`): axios con baseURL `/api`, interceptor
  que inyecta `Authorization: Bearer`, e interceptor de respuesta que normaliza
  errores (401/403/409/422) a un tipo propio.
- Tipos base (`src/types/api.ts`): `ApiSuccess<T>`, `ApiPaginated<T>`, `ApiError`.
- Layout base (sidebar + topbar), tema claro, estructura de carpetas por feature.
- **Entregable:** app corre, página en blanco autenticable, estructura lista.

### E2 — Autenticación y sesión
- Contexto de auth (`src/auth/`): login, logout, persistencia de token, carga de
  `/auth/me` al iniciar, estado `cargando/autenticado/anónimo`.
- Pantalla **Login por DNI** (react-hook-form + zod; errores 422/credenciales).
- Guard de rutas (`<RutaProtegida>`): redirige a login si no hay sesión.
- Mapa rol→permiso (`src/auth/permisos.ts`) + hook `usePermiso` + `<Can>`.
- Selector de **dependencia activa** (cuando el usuario tiene ámbito sobre varias
  o es global): persistido, usado como `dependencia_id` por defecto.
- **Entregable:** login funcional end-to-end contra el backend; navegación
  protegida; permisos derivados visibles (p. ej. ocultar menú de admin).

### E3 — Dashboard de estado de la entrega
- Vista que consume `GET /transferencia/estado?dependencia_id=` y muestra:
  presencia/avance por anexo (02–06), estado de la entrega
  (BORRADOR/REMITIDA/OBSERVADA/CONSOLIDADA…), `hacia_etts`, y accesos directos a
  cada anexo.
- Tarjetas de resumen + indicador de avance de verificación patrimonial.
- Acciones contextuales según permiso/estado: botón **Remitir**
  (`entregas.remitir`, visible si editable), **Revisar** (`entregas.revisar`,
  para revisores), **Emitir acta** (`actas.generar`, solo si CONSOLIDADA).
- **Entregable:** panel central navegable; punto de entrada del flujo.

### E4 — Patrón de anexo + Anexo 02 (Gestión) de referencia
- Construir el **patrón reutilizable de anexo**: hook de datos (TanStack Query),
  tabla/listado con filtros, formulario (crear/editar) con validación zod,
  manejo de 409 (entrega no modificable → aviso y bloqueo de edición), y panel de
  observaciones del anexo.
- Implementar **Anexo 02 (Informe de Gestión)** completo como ejemplar
  (`GET/POST /gestion/informe`). Es mayormente texto libre.
- **Entregable:** un anexo 100% funcional + abstracciones listas para replicar.

### E5 — Anexos documentales/listado (01, 03, 05, 06)
- Replicar el patrón para:
  - **Anexo 01 — Documentos pendientes** (incluye resumen; muchos vienen del SGD,
    solo-lectura los de fuente SGD, editable el complemento manual).
  - **Anexo 03 — Acervo documental** (físico/digital).
  - **Anexo 05 — Personal** (alta/baja; sin update, el backend hace upsert por DNI).
  - **Anexo 06 — No patrimonial**.
- Respetar RN-06 (no mutar datos de origen) y el bloqueo por estado (409).
- **Entregable:** 4 anexos CRUD operativos.

### E6 — Anexo 04 (Patrimonio) y verificación física
- Listado de bienes (origen SIGA, solo-lectura) + filtros
  (`estado_verificacion`, búsqueda) + resumen/porcentaje de avance.
- Flujo de **verificación** (`POST /patrimonio/bienes/{id}/verificar`): estado
  (confirmado/no ubicado/con observación), estado de conservación, observación.
  Al observar, se crea observación polimórfica (RN-05).
- **Entregable:** verificación patrimonial completa.

### E7 — Observaciones y subsanaciones (§7.9)
- Bandeja de observaciones (`GET /observaciones`) filtrable por anexo/estado/
  dependencia, acotada al ámbito.
- **Registrar** observación sobre un elemento (coordinador/revisor,
  `observaciones.registrar`): seleccionar anexo + registro + descripción.
- **Subsanar** (`observaciones.subsanar`) y **desestimar** acciones; reflejar la
  **re-remisión automática** (al cerrar la última observación abierta de una
  entrega OBSERVADA vuelve a REMITIDA).
- Integrar observaciones dentro de cada vista de anexo (badges "con observación").
- **Entregable:** ciclo observar → subsanar → re-remitir visible en la UI.

### E8 — Flujo jerárquico de entrega y revisión
- Acciones de **Remitir** (delegado/encargado → padre, o 1er nivel → ETTS) y
  **Revisar** (observar/consolidar) desde el dashboard y/o una vista de
  "Entregas recibidas" para revisores.
- Bandeja del revisor: entregas REMITIDAS de su subárbol pendientes de revisar.
- Visualización del árbol de dependencias y el avance por rama (para
  responsables/ETTS).
- **Entregable:** flujo 3°→2°→1°→ETTS operable end-to-end.

### E9 — Acta (Anexo 07) y expediente
- Vista de **Acta de transferencia** (`GET /transferencia/acta`): solo emisible
  con entrega CONSOLIDADA (manejar 409); mostrar `anexos_entregados` reales,
  intervinientes, estado (borrador/generada/suscrita).
- **Seam de firma digital**: dejar la UI preparada (botón "firmar"/cargar PDF
  suscrito) pero **sin** implementar la firma (pendiente de proveedor PKI/RENIEC
  — fuera de alcance). Documentarlo.
- Evidencias: subida/descarga de adjuntos (`/evidencias`).
- **Entregable:** acta consultable + gestión de evidencias.

### E10 — Administración (activación de cuentas)
- Padrón de servidores (`GET /servidores`, búsqueda), **preparar activación**
  (previsualizar roles) y **activar** (crear cuenta + contraseña). Solo
  `usuarios.gestionar`.
- **Entregable:** alta de usuarios desde la UI.

### E11 — Pulido, accesibilidad y build de producción
- Estados de carga/vacío/error consistentes, skeletons, responsive.
- Accesibilidad (focus, labels, teclado) — shadcn ya ayuda.
- Revisar manejo global de 401/403/409/422; i18n mínimo (textos en español).
- `npm run build` limpio; documentar variables de entorno y despliegue.
- **Entregable:** frontend listo para producción.

---

## 8. Reglas de trabajo

- **No modificar el backend** salvo que una etapa lo exija explícitamente (p. ej.
  publicar `config/cors.php`); si hace falta, confirmarlo con el usuario antes.
- Tipar todo lo que cruza la frontera de la API; nada de `any` en respuestas.
- Gating por permiso siempre que una acción pueda dar 403; el 409 se **muestra**
  (no se oculta): es la señal de integridad del flujo (RN-13).
- Componentes pequeños y reutilizables; el patrón de anexo (E4) es la unidad de
  reúso, no copiar/pegar vistas.
- Al cerrar cada etapa: `npm run lint` y `npm run build` en verde, y **añadir una
  entrada a la bitácora** (abajo) describiendo lo hecho y lo pendiente.
- Antes de implementar algo con decisiones abiertas (estructura de navegación,
  manejo de dependencia activa, diseño de la bandeja del revisor), **confirmar el
  enfoque con el usuario** en lugar de asumir.

## 9. Primer paso sugerido

Leer este plan + `docs/plan-trabajo-backend.md` (bitácora, para el contrato de
API) y la sección de anexos de `docs/propuesta-directiva.md`. Luego **empezar por
E1 (fundaciones)**: crear `frontend/` con Vite, configurar Tailwind + shadcn/ui,
el cliente axios y el proxy de Vite. Confirmar con el usuario la estructura de
navegación (sidebar propuesto) antes de E2.

---

## 10. Bitácora de avance (frontend)

- **E1 — Fundaciones (scaffolding)** · _completada_
  - Proyecto Vite creado en `frontend/` (plantilla `react-ts`). Versiones del
    scaffold actual: **React 19, TypeScript 7, Vite 8, oxlint** como linter.
  - Dependencias instaladas: `react-router-dom`, `@tanstack/react-query`,
    `axios`, `react-hook-form` + `@hookform/resolvers`, `zod`, `date-fns`,
    `lucide-react`, `sonner`, `clsx`, `tailwind-merge`,
    `class-variance-authority`; dev: `tailwindcss` v4 + `@tailwindcss/vite`.
  - **Decisión:** Tailwind **v4** (config CSS-first con `@theme inline`, sin
    `tailwind.config.js`). shadcn/ui se adopta como **primitivas copiables**
    (no vía CLI) para evitar fricción con TS 7 / React 19. Tokens de diseño
    (claro/oscuro) en `src/index.css`.
  - `vite.config.ts`: alias `@` → `src`, **proxy `/api` → `http://127.0.0.1:8000`**
    y puerto 5173. `tsconfig.app.json`: `paths` para `@/*` (sin `baseUrl`,
    deprecado en TS 7).
  - **Cliente API** (`src/lib/api.ts`): axios con baseURL `/api` (o `VITE_API_URL`),
    interceptor que inyecta `Authorization: Bearer`, e interceptor de respuesta
    que normaliza todo error a `ApiError` (`src/types/api.ts`) con helpers
    `esNoAutorizado/esProhibido/esConflictoFlujo/esValidacion`. En 401 limpia el
    token y notifica vía callback (`registrarManejadorSesionCaducada`, se
    conecta al contexto de auth en E2). Token en localStorage (`src/lib/token.ts`).
  - **Tipos base**: `ApiSuccess<T>`, `ApiPaginated<T>`, `ApiErrorBody`
    (`src/types/api.ts`) y dominio de auth `Usuario/Servidor/Dependencia/...`
    (`src/types/auth.ts`), alineados a `AuthController::perfil()`.
  - **Permisos** (`src/auth/permisos.ts`): espejo verificado de
    `App\Support\Enums\Permiso`, `Rol` y `Permiso::inicialesPorRol()` +
    `derivarPermisos()` (unión de permisos de todos los roles del usuario).
  - **Shell**: `AppLayout` (sidebar + topbar, responsive), `QueryClientProvider`
    + `queryClient` (`src/lib/query.ts`, sin reintentos en 4xx), router
    (`src/router`), `Toaster` de sonner y página de inicio placeholder.
    Primitivas UI: `button`, `input`, `label`, `card`, `spinner`.
  - **Verificación:** `npm run lint` verde (1 warning benigno de fast-refresh en
    `button.tsx` por exportar `buttonVariants`), `npm run build` verde, dev
    server arranca en `:5173`. `.env.example` documentado.
  - **Pendiente / para E2:** definir y **confirmar con el usuario la estructura
    de navegación del sidebar** (ítems por permiso) antes de implementar el
    contexto de auth, el login por DNI, el guard de rutas y el hook
    `usePermiso` + `<Can>`.

- **Decisión de navegación (confirmada con el usuario, para E2):** sidebar
  **plano por anexos** — un ítem por pantalla: Dashboard, Anexo 01 (Documentos),
  Anexo 02 (Gestión), Anexo 03 (Acervo), Anexo 04 (Patrimonio), Anexo 05
  (Personal), Anexo 06 (No patrimonial), Observaciones, Entregas, Acta,
  Administración. Cada ítem con gating por permiso (`<Can>` / `usePermiso`).

- **E2 — Autenticación y sesión** · _completada_
  - **Contexto de auth** (`src/auth/`): `AuthProvider` + `AuthContext` con estado
    `cargando | autenticado | anonimo`. Al montar, si hay token persistido llama
    `/auth/me`; sin token queda anónimo sin tocar el backend. `iniciarSesion`,
    `cerrarSesion` (revoca token; limpia aunque falle), y **permisos derivados**
    de los roles vía `derivarPermisos`. Se registra el manejador global de 401
    (`registrarManejadorSesionCaducada`) para cerrar sesión al caducar el token.
  - **Servicio** `auth.service.ts`: `login/me/logout` desenvolviendo `ApiResponse`.
  - **Importante (contrato real):** el campo de dispositivo del login es
    **`dispositivo`** (no `device_name`); `LoginRequest` valida DNI de 8 dígitos.
    `LoginPayload` ajustado en consecuencia; se envía `dispositivo: 'web'`.
  - **Login por DNI** (`features/auth/LoginPage.tsx`): react-hook-form + zod
    (regex `^[0-9]{8}$` espejo del backend). Mapea 422 → campos y 401/credenciales
    → error general. Redirige al origen (`state.from`) si ya hay sesión.
  - **Guard** `RutaProtegida`: spinner en `cargando`, redirige a `/login`
    (recordando origen) en `anonimo`, `Outlet` si autenticado. Router: `/login`
    público; resto bajo el guard, con `DependenciaProvider` + `AppLayout` dentro.
  - **Gating**: `usePermiso(permiso)` y `<Can permiso>` (declarativo). Hooks en
    `src/auth/hooks.ts`.
  - **Dependencia activa** (`DependenciaProvider` + `useDependenciaActiva`):
    valor efectivo **derivado en render** (override persistido o, por defecto, la
    dependencia del servidor del usuario); persistencia con sentinela `all` para
    distinguir «todo mi ámbito» de «sin selección». Selector en la topbar
    (`DependenciaSelector`, catálogo vía `GET /dependencias?all=true`).
  - **Shell**: `AppLayout` con **sidebar plano por anexo** (ítems filtrados por
    permiso, `src/layouts/navegacion.ts`), responsive (overlay en móvil), topbar
    con selector de dependencia + usuario + botón salir. Rutas de anexos aún no
    montadas (llegan en E3+); el sidebar ya las lista con gating correcto.
  - **Verificación:** `npm run build` verde; `npm run lint` verde (solo el
    warning benigno de fast-refresh en `button.tsx`). Dev server sirve la app
    (HTTP 200) y el **proxy `/api` reenvía** correctamente (502 con backend
    caído, confirma la ruta). **Login end-to-end real pendiente de probar con el
    backend + PostgreSQL arriba** (no se levantó Docker/DB para no introducir
    efectos; usuario admin sembrado: DNI `00000000`).

- **2026-11-07 — E3 (Dashboard de estado de la entrega):**
  - **Tipos y modelos** (`src/types/transferencia.ts`): estructuras para
    `EstadoEntregaResponse`, `EntregaDetalle`, `ObservacionDetalle`, estados de entrega
    (`borrador`, `remitida`, `observada`, `subsanada`, `consolidada`) y payloads de workflow.
  - **Servicio y hooks** (`features/dashboard/dashboard.service.ts` y `use-dashboard.ts`):
    consultas React Query para `GET /transferencia/estado` y `GET /documentos-pendientes/resumen`;
    mutaciones para `POST /transferencia/remitir` y `POST /transferencia/revisar`.
  - **Modales de workflow**:
    - `RemitirModal.tsx`: confirmación para remitir la entrega al nivel superior con comentario opcional.
    - `RevisarModal.tsx`: permite consolidar u observar la entrega con registro obligatorio de sustento.
  - **Dashboard Principal** (`features/dashboard/DashboardPage.tsx`):
    - Banner institucional de estado con badges de ciclo de vida (`borrador`, `remitida`, `observada`, `consolidada`).
    - Tarjeta de avance físico del **Anexo 04 (Patrimonio)** con barra de progreso, conteos confirmados/pendientes e importe valorizado.
    - Cuadrícula de accesos directos para Anexos 01, 02, 03, 05, 06 y bandeja de Observaciones con indicadores en tiempo real.
    - Botones de acción contextuales según rol y estado (`Remitir`, `Revisar`, `Emitir Acta`), protegidos por `<Can>`.
  - **Routing:** montado en ruta raíz `/` dentro del guard `RutaProtegida` y `AppLayout`.
  - **Verificación:** `npm run build` y `npm run lint` 100% limpios; proxies Nginx y Vite operativos en puertos 8000 y 5173.

- **2026-11-07 — E4 (Patrón de anexo + Anexo 02 Gestión de referencia):**
  - **Componentes transversales y patrón de anexo**:
    - `AlertaBloqueoEntrega.tsx` (`src/components/anexos/`): banner reactivo que interpreta el estado de entrega (`remitida`, `observada`, `consolidada`) y notifica al usuario si la edición está congelada o habilitada por subsanación (RN-13).
    - `AnexoHeader.tsx` (`src/components/anexos/`): encabezado estandarizado con badge de anexo, referencia normativa a la Directiva N.° 001-2026-MDSJ/A, botón de retorno al dashboard y slot de acciones.
    - `ObservacionesAnexoPanel.tsx` (`src/components/anexos/`): bandeja polimórfica que lista observaciones abiertas/subsanadas del anexo (`GET /observaciones`), permite formular observaciones a coordinadores (`observaciones.registrar`) y responder con sustento de subsanación (`observaciones.subsanar`).
    - `Textarea.tsx` (`src/components/ui/`): primitiva reutilizable de área de texto con estilo institucional.
  - **Módulo de Observaciones** (`src/types/observaciones.ts`, `features/observaciones/`):
    - Tipos, servicio (`observacionesService`) y hooks (`useObservaciones`, `useRegistrarObservacion`, `useSubsanarObservacion`, `useDesestimarObservacion`).
  - **Anexo 02 — Informe de Gestión** (`src/types/gestion.ts`, `features/gestion/`):
    - Tipos para `InformeGestion` y `GuardarInformeGestionPayload`.
    - Servicio `gestionService` (`GET /gestion/informe`, `POST /gestion/informe`).
    - Hook `useInformeGestion` y `useGuardarInformeGestion` con captura y notificación amigable de 409 Conflict.
    - `InformeGestionPage.tsx`: formulario con validación `zod` (`react-hook-form`), contadores de caracteres, secciones para funciones, logros, dificultades y pendientes, botones para "Guardar Borrador" y "Marcar Completado", y panel integrado de observaciones.
  - **Routing:** ruta `/gestion` habilitada en `router/index.tsx` bajo `AppLayout` y `RutaProtegida`.
  - **Verificación:** `npm run build` y `npm run lint` 100% limpios y validados.

- **2026-11-07 — E5 (Anexos documentales/listado: 01, 03, 05, 06):**
  - **Componente de Paginación Reutilizable** (`src/components/ui/pagination.tsx`): barra de navegación paginada con selector de páginas y totales.
  - **Anexo 01 — Documentos Pendientes** (`features/documentos/`):
    - Tipos (`src/types/documentos.ts`), servicio (`documentosService`) y hooks (`useDocumentos`, `useResumenDocumentosPendientes`, `useCrearDocumento`, `useActualizarDocumento`, `useEliminarDocumento`).
    - Modal de alta/edición (`DocumentoModal.tsx`).
    - Pantalla `DocumentosPage.tsx`: resumen cuantitativo (KPIs), filtros por estado de atención y buscador de texto, tabla con distinción entre fuente **SGD Oficial** (solo lectura, RN-06) y **Manual**, acciones CRUD y panel de observaciones integrado (`anexo="documento"`).
  - **Anexo 03 — Acervo Documental** (`features/acervo/`):
    - Tipos (`src/types/acervo.ts`), servicio (`acervoService`) y hooks (`useAcervo`, `useCrearAcervo`, `useActualizarAcervo`, `useEliminarAcervo`).
    - Modal de alta/edición (`AcervoModal.tsx`) para series documentales con tipado numérico estricto.
    - Pantalla `AcervoPage.tsx`: filtro por formato (Físico vs Digital), tabla con series, periodo, cantidad, unidad de conservación y ubicación, CRUD completo y panel de observaciones (`anexo="acervo"`).
  - **Anexo 05 — Personal a Cargo** (`features/personal/`):
    - Tipos (`src/types/personal.ts`), servicio (`personalService`) y hooks (`usePersonal`, `useGuardarPersonal`, `useEliminarPersonal`).
    - Modal de servidor (`PersonalModal.tsx`) con validación de DNI de 8 dígitos y regímenes laborales del sector público (D.L. 276, 728, 1057 CAS, Locación).
    - Pantalla `PersonalPage.tsx`: padrón de personal del área, búsqueda en tiempo real, CRUD con upsert backend por DNI y panel de observaciones (`anexo="personal"`).
  - **Anexo 06 — Bienes No Patrimoniales** (`features/nopatrimonial/`):
    - Tipos (`src/types/nopatrimonial.ts`), servicio (`noPatrimonialService`) y hooks (`useNoPatrimonial`, `useCrearBienNoPatrimonial`, `useActualizarBienNoPatrimonial`, `useEliminarBienNoPatrimonial`).
    - Modal de activos auxiliares (`NoPatrimonialModal.tsx`) con estado de conservación (`bueno`, `regular`, `malo`, `inservible`).
    - Pantalla `NoPatrimonialPage.tsx`: inventario de activos auxiliares y herramientas menores, CRUD y panel de observaciones (`anexo="nopatrimonial"`).
  - **Enrutado:** rutas `/documentos`, `/acervo`, `/personal`, `/nopatrimonial` montadas en `src/router/index.tsx`.
  - **Verificación:** `npm run build` y `npm run lint` 100% limpios y sin errores.

- **(pendiente)** — E6: Anexo 04 (Patrimonio) y verificación física.
