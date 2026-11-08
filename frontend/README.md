# SIS-TRANSFERENCIA · Frontend Institucional

Sistema Institucional de Transferencia de Gestión 2026 para la **Municipalidad Distrital de San Jerónimo**, conforme a las directivas de la Contraloría General de la República (Directiva N.° 016-2022-CG/PREVI) y la Directiva Institucional N.° 001-2026-MDSJ/A.

---

## 1. Stack Tecnológico

- **Framework:** React 19 + TypeScript (strict mode).
- **Bundler & Build Tool:** Vite 8 con Rolldown / Rollup optimizado para code-splitting.
- **Estilos & Diseño:** Tailwind CSS v4 (CSS-first, `@theme inline`) con sistema de tokens institucionales (modo claro/oscuro) y primitivas accesibles shadcn/ui.
- **Enrutamiento:** React Router v7 (`createBrowserRouter`, guards `RutaProtegida`, enrutado declarativo y error boundaries).
- **Gestión de Estado Servidor:** TanStack Query v5 (React Query) con invalidaciones reactivas, cache de catálogos y reintentos selectivos ante errores HTTP.
- **Formularios & Validación:** React Hook Form + Zod (espejo estricto de las reglas y regular expressions del backend).
- **Iconografía & Feedback:** Lucide React + Sonner (notificaciones toast institucionalizadas).
- **Linter & Calidad:** Oxlint con reglas activas de accesibilidad, ciclo de vida de hooks y buenas prácticas.

---

## 2. Arquitectura de Módulos (`src/features/`)

La aplicación organiza la lógica por dominios funcionales independientes:

1. **`auth/`**: Autenticación por DNI con Laravel Sanctum, persistencia de tokens Bearer en almacenamiento seguro, contexto de dependencia activa (`DependenciaProvider`) y árbol de permisos derivados (`<Can>`, `usePermiso`).
2. **`dashboard/`**: Panel de control con monitoreo en tiempo real del ciclo de vida de la entrega (`borrador`, `remitida`, `observada`, `consolidada`), KPIs del Anexo 04 y accesos directos normativos.
3. **`documentos/` (Anexo 01):** Control de documentos pendientes de atención con trazabilidad discriminada entre fuente **SGD Oficial** (solo lectura, RN-06) y complemento manual.
4. **`gestion/` (Anexo 02):** Informe de gestión con persistencia de borrador, control de caracteres y panel integrado de observaciones.
5. **`acervo/` (Anexo 03):** Padrón de series documentales, archivo físico/digital, metraje lineal y ubicación topográfica.
6. **`patrimonio/` (Anexo 04):** Inventario físico de bienes patrimoniales SIGA-MEF con flujo de contraste físico, estados de conservación y generación obligatoria de observaciones polimórficas (RN-05).
7. **`personal/` (Anexo 05):** Padrón de servidores asignados al centro de costo con validación de regímenes laborales (D.L. 276, 728, 1057 CAS, Locación).
8. **`nopatrimonial/` (Anexo 06):** Registro y control de bienes y activos auxiliares no patrimoniales.
9. **`observaciones/`:** Bandeja central y transversal de observaciones polimórficas (abiertas, en subsanación, subsanadas, desestimadas) con soporte de re-remisión automática institucional (RN-13).
10. **`entregas/`:** Flujo jerárquico de transferencias (3° nivel → 2° nivel → 1° nivel → ETTS), visualizador interactivo del organigrama municipal (107 centros de costo) y bandeja del revisor.
11. **`acta/` (Anexo 07):** Generación del Acta Oficial de Transferencia según formato reglamentario, expediente digital de evidencias con cálculo de hash SHA-256 y costura técnica (seam) para firma digital.
12. **`admin/`:** Panel de administración y activación de cuentas para servidores municipales a partir del padrón oficial con asignación automática de roles institucionales.

---

## 3. Variables de Entorno

Copiar `.env.example` a `.env` en la raíz de `frontend/`:

```bash
# Desarrollo: el proxy interno de Vite se encarga de dirigir las peticiones /api
# hacia el servicio backend (por defecto http://web o http://localhost:8000).
VITE_BACKEND_URL=http://web

# Producción: si la SPA se hospeda en un dominio o CDN desacoplado del backend:
VITE_API_URL=https://transferencia.sanjeronimo.gob.pe/api
```

---

## 4. Scripts de Desarrollo y Construcción

```bash
# Iniciar servidor de desarrollo en http://localhost:5173
npm run dev

# Ejecutar el linter estático ultrarrápido
npm run lint

# Compilación TypeScript y generación del bundle de producción
npm run build

# Previsualizar el bundle compilado localmente
npm run preview
```

---

## 5. Estrategia de Build y Despliegue en Producción

El archivo `vite.config.ts` implementa una división manual de paquetes (`manualChunks`) para garantizar que ningún módulo supere los límites recomendados de descarga (350 kB por fragmento):

- `vendor-react`: React 19, React DOM, React Router v7.
- `vendor-query`: TanStack React Query v5, Axios.
- `vendor-forms`: React Hook Form, Resolvers, Zod.
- `vendor-ui`: Lucide React, Sonner.
- `index`: Lógica de negocio y vistas del sistema institucional.

Los artefactos resultantes se generan en `frontend/dist/` y están optimizados para ser servidos por un servidor Nginx con soporte de compresión Gzip/Brotli y reglas de reescritura SPA:

```nginx
server {
    listen 80;
    server_name transferencia.sanjeronimo.gob.pe;
    root /var/www/sis-transferencia/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
