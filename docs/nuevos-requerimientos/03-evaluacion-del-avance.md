# Evaluación del avance

**Corte:** 2026-11-11. Revisión de documentación, rutas, modelos, servicios y componentes, con ejecución de comprobaciones locales. No es una validación de operación institucional ni una auditoría exhaustiva.

## Resultado general

Existe una base funcional amplia y reutilizable: autenticación, autorización, ingestas, captura de anexos, verificación patrimonial, entregas, observaciones, PDF y reportes están implementados. Hay pruebas sobre partes centrales del flujo. El trabajo siguiente podrá partir de esos módulos, contrastando las reglas actuales con el nuevo proceso.

Los [nuevos requisitos](04-nuevo-flujo-y-requisitos.md) ya se recibieron después de esta evaluación inicial. Su [revisión de coherencia e impacto](05-coherencia-y-decisiones.md) complementa este diagnóstico sin reemplazarlo. No se asigna un porcentaje de avance mientras falten decisiones y criterios de aceptación. Tampoco corresponde calificar el sistema como listo para producción solo porque compila y pasa la suite actual.

## Evidencia ejecutada en esta revisión

| Comprobación | Resultado |
|---|---|
| `php -v` / `composer -V` | PHP 8.4.12 / Composer 2.8.11 disponibles |
| `php artisan test --compact` en backend | **60 pruebas aprobadas, 144 aserciones**; SQLite en memoria |
| `npm run build` en frontend | **Aprobado**, incluye `tsc -b` y Vite |
| `npm run lint` en frontend | **Código de salida 0**, con 6 advertencias existentes |

La primera compilación falló por restricciones al iniciar procesos (`spawn EPERM`); la repetición autorizada fuera del entorno restringido pasó. No se modificó código de aplicación para corregir ese fallo.

Las seis advertencias de lint están en `button.tsx`, `badge.tsx`, `confirm-dialog.tsx` (exportaciones y Fast Refresh), `FilaVerificacionPatrimonio.tsx` y `RegistrarObservacionModal.tsx` (compatibilidad de librería con memoización), e `InformeGestionPage.tsx` (actualización de estado en efecto).

La suite existente incluye autorización por permisos/ámbito, remisión, bloqueo tras remitir, observaciones, cierre hacia ETTS, acta, tablero, anexos PDF, reportes y expediente PDF. No equivale a cobertura total ni valida conexiones externas, interfaz en navegador o formatos aprobados institucionalmente.

## Capacidades y valoración

| Área | Evidencia del avance | Qué falta acreditar o decidir |
|---|---|---|
| Acceso | Sanctum, DNI, activación y roles; pruebas de autorización | Correspondencia de roles/atribuciones con el nuevo flujo |
| Organización y fuentes | Ingestas SGD/SIGA y mapeo de centros de costo | Calidad, vigencia, alcance real de ingestas y reconciliación institucional |
| Anexos | Modelos, formularios y servicios existentes; PDF 02–06 | Contenido obligatorio, completitud y declaración de no aplicabilidad |
| Entregas | Remisión, revisión, bloqueo y destino ETTS; pruebas | Transiciones estrictas, receptor exacto y semántica de consolidación |
| Observaciones | Registro, subsanación, desestimación y retorno automático | Separación entre corrección, respuesta y aprobación del revisor |
| Acta y expediente | Acta real y paquete PDF de anexos presentes | Suscripción, expediente integral y conservación del cierre |
| Reportes | Matriz/avance, conciliación patrimonial y observaciones; JSON, XLSX y PDF | Métricas necesarias en el nuevo proceso y alcance de filtros |
| Interfaz | Componentes compartidos, captura por filas y ayudas contextuales | Uniformidad pendiente y QA manual por rol, teclado y dispositivo |

## Hallazgos para revisar antes o durante la adaptación

Las prioridades siguientes son una valoración técnica inicial; no constituyen un plan funcional aprobado.

| ID | Prioridad | Hallazgo y evidencia | Implicación |
|---|---|---|---|
| H-01 | Alta | [TransferenciaService::remitirEntrega](../../backend/app/Modules/Transferencia/Services/TransferenciaService.php) usa `updateOrCreate` y asigna `remitida` sin validar el estado anterior, completitud ni consolidación de hijas | La API puede volver a remitir una entrega ya consolidada; definir las transiciones permitidas y sus requisitos |
| H-02 | Alta | [TransferenciaController::revisar](../../backend/app/Modules/Transferencia/Controllers/TransferenciaController.php) valida permiso y ámbito, sin exigir ser el receptor inmediato; el ámbito puede incluir la dependencia propia y todo el subárbol | Precisar quién revisa cada entrega y evitar que el alcance organizacional sustituya la responsabilidad del paso |
| H-03 | Alta | [EvidenciaController](../../backend/app/Support/Http/EvidenciaController.php) y [EvidenciaService](../../backend/app/Support/Services/EvidenciaService.php) validan permiso de ruta, tipo e ID, pero no verifican el ámbito del registro objetivo en carga/descarga ni el estado de entrega | El almacenamiento privado y el hash no bastan para acreditar autorización por dependencia; revisar estos accesos con pruebas específicas |
| H-04 | Alta | [PatrimonioService::verificarBien](../../backend/app/Modules/Patrimonio/Services/PatrimonioService.php) crea una observación con estado literal `pendiente`, ausente del enum `EstadoObservacion` | Posible fallo al persistir/leer o inconsistencia de seguimiento al declarar un bien no ubicado; reproducir y corregir según el ciclo acordado |
| H-05 | Media | La propuesta histórica denomina Anexo 01 a centros de costo; UI/API asignan ese número a documentos pendientes | Acordar un catálogo único de anexos y su correspondencia con pantallas y documentos |
| H-06 | Media | `presenciaAnexos()` usa existencia; el tablero cuenta bienes confirmados. No se encontró declaración persistida de «No aplica» | Evitar interpretar presencia o porcentaje como aprobación completa; definir métricas y excepciones |
| H-07 | Media | [ExpedientePdf](../../backend/app/Modules/Expediente/Services/ExpedientePdf.php) reúne 02–06; la carga del acta firmada solo crea evidencia | Definir composición del expediente, versión final, acta suscrita y alcance real de la firma |
| H-08 | Media | Remitir/consolidar no agrega físicamente registros de hijas ni exige su cierre; revisión observada y observaciones concretas son independientes | Acordar si consolidar significa aceptar, agregar información o emitir un paquete superior; definir devolución y subsanación |
| H-09 | Media | Varios hooks todavía leen `error.response.data`, aunque [lib/api.ts](../../frontend/src/lib/api.ts) transforma errores a `ApiError`; Documentos mantiene `confirm()` nativo | Se pierden mensajes específicos y la experiencia resulta desigual; completar adopción del patrón compartido |
| H-10 | Media | Varios servicios resuelven proceso abierto con respaldo a ID `1`; algunas consultas de anexos/observaciones no filtran explícitamente por proceso | No asumir aislamiento completo entre procesos; revisar antes de ampliar periodos o modificar la estructura |

H-01 a H-10 proceden de inspección estática; no se ejecutaron pruebas específicas para reproducir cada caso. Se documentan sin corregirlos en esta tarea, cuyo alcance es ordenar y evaluar.

Las referencias antiguas a F9 o Reportes como pendientes quedaron superadas: hay implementación de exportación y pruebas. Del mismo modo, ya existen el bloqueo, observaciones, acta basada en registros y destino ETTS. No deben volver a planificarse como módulos desde cero.

## Validaciones que quedan fuera de este corte

- Recorrido completo en navegador con cuentas de cada rol y datos representativos.
- Conexión real a SGD/SIGA, ingesta completa y controles de calidad del mapeo.
- Validación en PostgreSQL de los cambios futuros; esta suite se ejecutó con SQLite.
- Comparación visual de PDF con los formatos institucionales que se aprueben.
- Auditoría de accesibilidad, responsive, concurrencia, carga y recuperación de archivos.
- Confirmación funcional de cierre, reapertura, firma y composición final del expediente.

## Cambios de esta tarea

Se archivaron diez documentos anteriores, se creó esta base y se comprobó el avance local. Para cumplir las instrucciones de preparación del repositorio se agregó Laravel Boost de desarrollo, con sus dependencias y archivos de configuración/guidelines. No se implementaron los hallazgos ni se cambió el flujo de negocio.
