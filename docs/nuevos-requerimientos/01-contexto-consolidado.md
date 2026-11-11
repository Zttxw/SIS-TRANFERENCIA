# Contexto consolidado

## Propósito y alcance del corte

SIS-TRANSFERENCIA organiza información para la transferencia de gestión municipal de 2026 de la Municipalidad Distrital de San Jerónimo. La implementación reúne datos por dependencia, permite completarlos y verificarlos, gestiona entregas y observaciones, y genera documentos y reportes.

Las fuentes institucionales son SGD para organización, servidores y documentación, y SIGA para patrimonio. El sistema mantiene datos propios del proceso y complementos manuales. Las ingestas inspeccionadas leen las fuentes y escriben en la base de la aplicación. SIGEPER no aparece como integración implementada.

Los nuevos requisitos y las primeras aclaraciones ya se recibieron y están en [04-nuevo-flujo-y-requisitos.md](04-nuevo-flujo-y-requisitos.md). Las reglas descritas aquí siguen siendo la línea base del código: no incluyen una implementación de esos cambios. La [revisión de coherencia](05-coherencia-y-decisiones.md) separa decisiones confirmadas de preguntas pendientes.

## Arquitectura existente

| Parte | Implementación y ubicación |
|---|---|
| Backend | Laravel 13, PHP requerido `^8.4`, API en [backend/routes/api.php](../../backend/routes/api.php) |
| Organización interna | Monolito modular en [app/Modules](../../backend/app/Modules): Auth, Organization, Gestion, Acervo, Patrimonio, Personal, NoPatrimonial, Documentos, Transferencia, Expediente y Reportes |
| Soporte compartido | [app/Support](../../backend/app/Support): auditoría, fuentes, ámbito, bloqueo por entrega, evidencias, PDF y respuestas API |
| Frontend | React 19, TypeScript, Vite 8, Tailwind 4; rutas en [router/index.tsx](../../frontend/src/router/index.tsx) |
| Estado y formularios | TanStack Query, React Hook Form y Zod; servicios HTTP por módulo |
| Base propia | PostgreSQL 16 en [docker-compose.yml](../../docker-compose.yml); pruebas con SQLite en memoria |
| Fuentes externas | Conexiones SQL Server `sgd` y `siga`; SIGA también admite réplica SQLite |
| Salidas | Dompdf para PDF; Laravel Excel para XLSX; plantillas en [resources/views/pdf](../../backend/resources/views/pdf) |
| Archivos | Disco `secure`, evidencias polimórficas con metadatos y hash SHA-256 |

La aplicación Laravel está en `backend/`; los comandos Artisan y Composer se ejecutan allí. Las dependencias exactas se resuelven en sus archivos lock.

## Modelo de datos que condiciona los cambios

- `ProcesoTransferencia` define el proceso, fecha de corte y estado. Numerosas tablas guardan `proceso_transferencia_id`.
- `Dependencia` representa la unidad organizacional y su jerarquía mediante `parent_id`; vincula códigos institucionales, encargado y código SIGA.
- `Servidor` es el padrón de personas. `User` es la cuenta de acceso, vinculable a ese padrón; `AsignacionRol` asocia cuenta, rol y dependencia.
- `Entrega` representa actualmente la entrega de una **dependencia por proceso**, no un paquete independiente por servidor.
- Los módulos de anexos guardan informes, acervo, bienes/verificaciones, personal, bienes no patrimoniales y documentos pendientes.
- `Observacion` apunta polimórficamente a un elemento de anexo; su dependencia se obtiene del elemento observado.
- `ActaTransferencia` guarda identificación, intervinientes y relación de anexos. `Evidencia` vincula archivos a modelos admitidos.
- `MovimientoAuditoria` registra cambios de los modelos que usan `Auditable`. La existencia del trait no acredita cobertura de todas las operaciones.

## Integraciones reutilizables

| Fuente | Capacidad encontrada | Límites del conocimiento actual |
|---|---|---|
| SGD organizacional | `IngestaSgd`: dependencias, jerarquía, encargados, servidores y cargos | No se consultó la fuente real en esta revisión |
| SGD catálogos | `IngestaCatalogosSgd`: tipos documentales y estados | No se verificó vigencia ni volumen actual |
| SGD documental | `IngestaDocumentalSgd`: acervo digital agregado por dependencia/tipo/año y pendientes filtrados en origen | No representa una copia íntegra del acervo ni acredita completitud de la información física |
| Personal | `IngestaPersonalSgd` para el anexo de personal | La complementación laboral debe contrastarse con el nuevo requerimiento |
| SIGA | `SigaPatrimonioConnector` + `IngestaPatrimonioSiga`; mapeo de centros de costo y responsables | No se ejecutó una sincronización ni se certificó el mapeo institucional |

Detalle relevante para continuar SGD: el código identifica pendientes con `TDTV_DESTINOS.ES_DOC_REC`, excluyendo `2,3,4,5,9`; cruza remito/destino por `NU_ANN, NU_EMI`, excluye destinos eliminados y ciertas emisiones. Estas reglas están en [IngestaDocumentalSgd.php](../../backend/app/Modules/Organization/Services/IngestaDocumentalSgd.php); deberán revisarse si cambia el concepto funcional de pendiente.

Los comandos `sgd:ingestar`, `personal:ingestar` y `siga:ingestar` materializan datos en la base propia; el de personal proyecta el padrón ya cargado y no conecta directamente al SGD. Consultar su ayuda antes de usarlos. Esta revisión no ejecutó ingestas, migraciones ni seeders sobre la base de trabajo; las pruebas inicializan su propia base SQLite en memoria.

## Interfaz y convenciones que vale la pena conservar

Las páginas existentes cubren tablero, organigrama, documentos, gestión, acervo, patrimonio, personal, no patrimoniales, entregas, observaciones, acta, reportes y usuarios.

Para extenderlas, revisar antes estas piezas:

- [components/anexos](../../frontend/src/components/anexos): `AnexoLayout`, `AnexoCrudPage`, estado, bloqueo, observaciones y descarga PDF.
- [components/ui](../../frontend/src/components/ui): tablas, editor de filas, campos, selectores, diálogos, confirmaciones y estados asíncronos.
- [lib/api-errors.ts](../../frontend/src/lib/api-errors.ts): traducción de errores y asignación de validaciones 422 a campos.
- [lib/descargas.ts](../../frontend/src/lib/descargas.ts): descargas autenticadas y tratamiento de errores recibidos como Blob.
- [index.css](../../frontend/src/index.css): tokens de tema. [FranjaAndina.tsx](../../frontend/src/components/common/FranjaAndina.tsx): recurso visual institucional existente.

El cliente HTTP usa Bearer con Sanctum y normaliza fallos a `ApiError`. El frontend deriva permisos para mostrar controles; el backend debe seguir verificando acciones y ámbito. Al cambiar permisos, revisar juntos el enum PHP, su siembra y [auth/permisos.ts](../../frontend/src/auth/permisos.ts).

## Entorno y comprobaciones reproducibles

El Compose publica web en `8000`, frontend en `5173` y PostgreSQL en `55432` por defecto. Dentro de Docker, PostgreSQL usa `db:5432`; desde el host debe usarse el puerto publicado. La configuración SGD advierte que `pdo_sqlsrv` está previsto en el host, no en el contenedor Alpine. No se volvió a comprobar ese driver en esta revisión.

Desde `backend/`:

```powershell
php artisan test --compact
php artisan route:list --path=api
php artisan help sgd:ingestar
php artisan help siga:ingestar
```

Desde `frontend/`:

```powershell
npm run build
npm run lint
```

Usar `.env.example` como referencia de variables y configurar los secretos localmente. La preparación exigida por el `AGENTS.md` raíz instaló `laravel/boost` como dependencia de desarrollo y generó [backend/AGENTS.md](../../backend/AGENTS.md) y `backend/boost.json`. No cambia el flujo funcional del sistema.
