# Flujo implementado al corte

Este documento describe el código del 2026-11-11 y se conserva como línea base. El [nuevo flujo solicitado](04-nuevo-flujo-y-requisitos.md) ya se recibió: exige firma de anexos 02–07 antes de remitir, visto bueno del padre, cronograma con bloqueo y portales ETTS/ETTE. Esos cambios todavía no están implementados; las reglas siguientes describen el comportamiento anterior.

## Unidad de trabajo y actores

Los anexos se consultan y registran por dependencia. `remitirEntrega()` crea o actualiza una entrega identificada por `proceso_transferencia_id + dependencia_id`. Actualmente no hay una remisión separada por cada persona participante.

Las cuentas acceden con DNI y contraseña mediante Sanctum. La administración permite preparar y activar cuentas del padrón. La autorización combina permiso de acción y dependencias accesibles.

| Rol existente | Ámbito calculado | Capacidades iniciales relevantes |
|---|---|---|
| `administrador` | Global | Usuarios, configuración e ingesta declaradas como permisos; reportes. No obtiene permisos de anexos por defecto |
| `servidor` | Dependencia asignada | Consultar/registrar anexos, verificar bienes, **remitir**, subsanar y consultar expediente |
| `responsable_equipo` | Dependencia y subárbol | Registrar, verificar, revisar, observar, subsanar y remitir; consultar reportes |
| `responsable_centro_costo` | Dependencia y subárbol | Lo anterior, generar actas y exportar reportes |
| `coordinador` | Dependencia y subárbol | Consultar, registrar observaciones, expediente y reportes/exportación |
| `etts` | Global | Revisar/consolidar, generar actas, expediente y reportes/exportación |
| `ette` | Global | Consulta de anexos, expediente y reportes |

Fuente: [Rol.php](../../backend/app/Support/Enums/Rol.php), [Permiso.php](../../backend/app/Support/Enums/Permiso.php) y [User.php](../../backend/app/Models/User.php). El catálogo materializado en `rol_permiso` determina los permisos efectivos del backend; esta tabla resume el mapeo inicial del código. Un permiso declarado no demuestra que exista una pantalla o endpoint de administración para ejercerlo.

No existe un rol `delegado` en el enum. Si el nuevo flujo introduce delegaciones, habrá que definir su responsabilidad y alcance. La documentación anterior reservaba la remisión al encargado, pero el mapeo actual también se la concede al servidor: requiere decisión explícita.

## Secuencia actual

1. Se precargan datos desde fuentes institucionales en la base propia, y se activan las cuentas que correspondan.
2. El usuario selecciona una dependencia dentro de su ámbito y completa o verifica los anexos.
3. `POST /api/transferencia/remitir` crea/actualiza la entrega y la coloca en `remitida`. El destino es el `parent_id` de la dependencia. Si no tiene padre, el destino queda en `NULL`, interpretado como ETTS institucional.
4. `POST /api/transferencia/revisar` acepta `observar` o `consolidar` sobre una entrega remitida o en revisión. Registra receptor, comentario y fechas.
5. Si se observa, los anexos vuelven a admitir edición. Las observaciones concretas se registran por otro endpoint, sobre elementos de anexo.
6. Al subsanar o desestimar la última observación abierta de esa dependencia/proceso, una entrega observada vuelve automáticamente a `remitida`.
7. Una entrega consolidada habilita la emisión del acta y la descarga del paquete PDF actual.

La consolidación implementada cambia el estado de la entrega. No implica por sí sola copiar los registros de las hijas al padre ni producir un expediente institucional que los reúna. La revisión comprueba permiso y ámbito; no comprueba que el usuario sea exclusivamente el receptor inmediato del destino.

Fuente principal: [TransferenciaService.php](../../backend/app/Modules/Transferencia/Services/TransferenciaService.php), [TransferenciaController.php](../../backend/app/Modules/Transferencia/Controllers/TransferenciaController.php) y [ObservacionService.php](../../backend/app/Modules/Transferencia/Services/ObservacionService.php).

## Estados y edición

| Estado de entrega | Cómo se usa actualmente | Edición de anexos protegidos |
|---|---|---|
| Sin entrega / `borrador` | Preparación | Permitida |
| `remitida` | Resultado de remisión o retorno automático tras subsanar | Bloqueada, respuesta 409 |
| `en_revision` | Admitido por el enum y la revisión | Bloqueada; no se encontró una acción específica para iniciarlo |
| `observada` | Revisión con acción observar | Permitida |
| `consolidada` | Revisión con acción consolidar | Bloqueada |
| `cerrada` | Definido en el enum | Bloqueada; no se encontró endpoint específico de cierre/reapertura |

El bloqueo está en [RespetaEstadoEntrega.php](../../backend/app/Support/Concerns/RespetaEstadoEntrega.php), usado por los services de los seis módulos de anexos. No debe extrapolarse a evidencias e ingestas: requieren revisión propia.

Observaciones: el enum define `abierta`, `en_subsanacion`, `subsanada` y `desestimada`. Los endpoints actuales registran, subsanan o desestiman. Marcar la entrega como observada y crear una observación concreta son acciones independientes; observar solo con comentario no crea automáticamente una observación subsanable.

## Anexos y salidas existentes

| Referencia | Datos implementados | Salida encontrada |
|---|---|---|
| Organización / Anexo 01 histórico | Dependencias, jerarquía, encargados y vista de organigrama | Pantalla; sin generador específico de PDF del formato 01 en las rutas inspeccionadas |
| Documentos pendientes | Registros SGD y manuales | CRUD y resumen; la UI/API los llaman Anexo 01, en conflicto con la referencia histórica |
| Anexo 02 — Gestión | Identificación, `funciones`, `logros_items`, `dificultades_items`, `pendientes_items`; filas en JSON y estado del informe | Formulario por secciones y PDF |
| Anexo 03 — Acervo | Físico/digital, serie, año/rango, unidades y ubicación | Listado, vista por año, formulario y PDF |
| Anexo 04 — Patrimonio | Bienes, custodio, verificación física, conservación y complementos | Verificación en tabla, agrupación por servidor y PDF |
| Anexo 05 — Personal | DNI, nombres, cargo, régimen, modalidad, situación y observaciones | Listado, registro y PDF |
| Anexo 06 — No patrimoniales | Denominación, descripción, cantidad/unidad, conservación, ubicación y observaciones | CRUD y PDF |
| Anexo 07 — Acta | Número, fecha, intervinientes, presencia de anexos y evidencias | Consulta/generación y PDF, con entrega consolidada |
| Anexo 08 histórico | Diagrama del procedimiento anterior | Referencia documental; no es un formulario de captura |

La numeración anterior procede de la [propuesta de directiva archivada](../historico/2026-11-11/propuesta-directiva.md). Su formato y aprobación aplicables deben confirmarse con los nuevos requisitos.

Los PDF individuales 02–06 pueden descargarse antes de consolidar, con marca de borrador. El paquete de `GET /api/expediente/pdf` exige entrega consolidada e incluye solamente los anexos **02–06 presentes**: no añade el acta 07, los documentos pendientes ni los archivos de evidencia. La descarga no acredita un archivo inmutable de cierre.

`presenciaAnexos()` comprueba existencia de registros, no una aprobación exhaustiva de contenido. El acta usa esa presencia para señalar lo entregado. No se encontró una declaración persistida de «No aplica» que permita diferenciarla de un anexo vacío.

La carga del acta suscrita adjunta un archivo como evidencia. `FirmaDigitalSeamModal` es un punto de extensión: no integra un proveedor de firma, no verifica criptográficamente el PDF ni completa por sí mismo el ciclo de suscripción.
