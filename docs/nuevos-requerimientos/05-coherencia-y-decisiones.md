# Coherencia y decisiones pendientes

**Actualización:** 2026-11-11. Insumos: requisitos y aclaraciones del usuario, [catálogo funcional](04-nuevo-flujo-y-requisitos.md) y [comportamiento actual](02-flujo-implementado.md). Esta revisión es documental; no implementa el nuevo proceso.

## 1. Evaluación general

El objetivo es coherente: preparación descentralizada, firma previa, recepción y visto bueno del padre, consolidación jerárquica y seguimiento desde portales ETTS/ETTE. El cronograma dirige los plazos y las observaciones permanecen como excepción.

Las primeras respuestas resuelven dos contradicciones: los integrantes ETTE **sí consultan anexos firmados de sus dependencias**, y **administrador y ETTS** administran el cronograma, cuyo vencimiento **bloquea entregas**. No se hereda la exclusión inicial de anexos ni la administración exclusiva del administrador.

Se mantiene el alcance de **anexos 02–07**, mediante Firma Perú con certificados RENIEC. La última aclaración establece firma digital **obligatoria de ETTS y del personal de la entidad** en sus intervenciones de suscripción, y firma **opcional de ETTE**. Si ETTE no firma, queda constancia en el sistema y se le entrega copia digital. Esto reemplaza la exigencia anterior de firma del delegado ETTE como requisito de entrega.

ETTE mantiene un comité principal de aproximadamente tres personas y puede crear usuarios fuera del comité como delegados para una o varias dependencias: visitan, revisan y pueden firmar cada anexo conforme, sin obligación de hacerlo. Se conserva su acceso previo al documento.

Por tanto, esos usuarios designados tienen consulta y firma limitada a su función; la prohibición inicial de firmar queda superada para ellos. Su revisión de conformidad no los convierte en responsables del visto bueno jerárquico ni de la consolidación. No se ha exigido una categoría adicional de cuentas de consulta pura ni un número máximo fijo de miembros del comité.

## 2. Decisiones confirmadas y pendientes

| ID | Tema | Estado y definición |
|---|---|---|
| D-01 | Visibilidad de integrantes ETTE | **Confirmado:** anexos firmados de su ámbito, sin exigir firma ETTE opcional para su consulta; delegado con acceso previo. Pendiente publicación de documentos aún no remitidos |
| D-02 | Documentos y firmantes | **Confirmado:** anexos 02–07, Firma Perú/RENIEC; firma obligatoria ETTS/personal de la entidad y opcional ETTE. Si ETTE no firma: constancia y copia digital. **Gate de remisión (2026-11-11):** para remitir se exige la firma **obligatoria del acta (Anexo 07)** por el **responsable del centro de costo**; el gate es **configurable y por defecto APAGADO** (`procesos_transferencia.exige_firma_acta`) para no romper el flujo mientras no haya proveedor real; **sin orden de firmas impuesto** por ahora (un solo firmante obligatorio). Pendientes: matriz documental/etapas ETTS (qué cuenta ETTS firma cada dependencia), orden multi-firmante, proveedor real y no conformidad |
| D-03 | Cronograma | **Confirmado:** administrador y ETTS lo modifican; vencimiento bloquea entregas. Pendientes atribución de revisor ETTS, operaciones afectadas, hora/zona y forma de retomar un trámite vencido |
| D-04 | Corte y complementos | Pendiente: significado exacto del corte SGD, plazo de declaraciones complementarias e incorporación después de firmar/remitir |
| D-05 | Visto bueno y consolidación | **Confirmado (2026-11-11):** visto bueno y consolidación **por paquete** (toda la entrega como bloque, no anexo por anexo); el visto bueno queda **registrado** (acto trazable usuario/fecha/versión recibida), sin exigir firma digital del receptor. La firma digital se reserva a los suscriptores del documento. Pendiente: tratamiento fino de versiones corregidas en la cadena superior |
| D-06 | Jerarquía y cierre | **Confirmado (2026-11-11):** el Anexo 07 que se firma **antes de remitir** declara **solo la suscripción de la hija** (no afirma recepción ni consolidación, que aún no ocurren); el visto bueno/consolidación se registran aparte sobre la versión recibida. Al corregir una entrega observada se genera **nueva versión** y se **re-firman** las obligatorias; las firmas previas quedan históricas sobre su versión. Pendiente: responsable exacto de remisión por cuenta, condiciones sobre hijas y recepción/cierre ETTS |
| D-07 | Observaciones administrativas | Pendiente: quién registra/atiende/aprueba, estados y efectos sobre asignaciones, firmas y entregas |
| D-08 | Ámbito y gestión de equipos | **Confirmado:** comité ETTE de alrededor de tres miembros y alta de delegados fuera del comité para una o varias dependencias. Pendientes dependencia exacta/subárbol, facultades individuales del comité, revocación y quién administra revisores ETTS |
| D-09 | Métricas y actividades | Pendiente: completitud, no aplicabilidad, ponderación del avance, oficinas sin iniciar y criterio de finalización de actividades |
| D-10 | Documentos y originales SGD | Pendiente: definiciones documentales, identificación única y forma autorizada de recuperar originales |
| D-11 | Falta de certificado | **Confirmado:** la ausencia de firma ETTE se registra y se entrega copia digital; no bloquea por sí sola la entrega. Pendientes contingencia para firmantes obligatorios de la entidad/ETTS sin certificado y relación con la propuesta inicial de sustitución por el jefe |
| D-12 | Constancia y copia digital ETTE | **Confirmado:** registrar cuando ETTE no firma y entregarle copia digital. **Cerrado (2026-11-11):** el **responsable del centro de costo** registra la constancia (permiso `firmas.constancia_ausencia`); se modela como una `FirmaAnexo` con estado **`ausente`** (opcional) sobre la versión del documento, con nota de constancia y **marca de copia entregada** (fecha + usuario que la registró), **sin presumir acuse** del ETTE; la ausencia **no bloquea** remisión/consolidación ni elimina plazo. Pendiente: canal concreto de entrega (correo/portal) y acreditación operativa fuera del sistema |

Las respuestas sobre delegados y acceso previo ya se incorporaron. No se interpreta el silencio sobre otros detalles como definición. Las decisiones restantes pueden cerrarse por módulo antes de diseñarlo, empezando por orden de firmas, visto bueno/consolidación y alcance del bloqueo.

## 3. Recomendación de acceso — pendiente de validar

Conviene combinar **capacidades por perfil** con **asignaciones a dependencias**, reutilizando el modelo existente cuando alcance. No crear un rol por cada oficina. Una persona asignada a dos oficinas necesita dos asignaciones de ámbito, no dos roles equivalentes.

Tampoco conviene dar al integrante ETTE el rol de jefe para imitar sus vistas: heredaría atribuciones de escritura/remisión/firma. Las vistas de consulta pueden reutilizar componentes y aplicar permisos diferentes.

| Perfil funcional | Alcance | Atribuciones a distinguir |
|---|---|---|
| Administrador | Plataforma | Gestión institucional de acceso y cronograma |
| Coordinación ETTS | Entidad | Seguimiento, archivo y cronograma; firma digital obligatoria al suscribir documentos de su competencia, con matriz por precisar |
| Revisor ETTS | Por definir | Consulta/revisión y firma obligatoria cuando corresponda su suscripción; no heredar gestión de cronograma o usuarios sin definición |
| Comité principal ETTE | Seguimiento institucional solicitado | Crear usuarios fuera del comité y designar delegados; atribuciones de cada miembro por definir |
| Delegado ETTE | Una o varias dependencias asignadas | Visitar, revisar y firmar 02–07 opcionalmente; acceso previo. Si no firma, constancia y copia digital. Sin edición/eliminación ni visto bueno/consolidación del padre |
| Consulta pura ETTE, si se conserva | Dependencias autorizadas | Anexos firmados y seguimiento de lectura, sin firma; no se exige como un perfil adicional obligatorio |
| Jefe y personal responsable de la entidad | Unidad y responsabilidades asignadas | Firma digital obligatoria según documento/intervención; jefe suscribe 02–07. Remisión, visto bueno y consolidación según atribuciones |

Estos son **perfiles de análisis**, no nombres de roles nuevos aprobados. La función del delegado con consulta y firma está confirmada. Se recomienda representarla con capacidades y asignaciones por dependencia, y reservar la gestión del equipo a quienes corresponda dentro del comité. La representación técnica queda pendiente; no hace falta crear primero un rol de lector para duplicarlo luego como firmante.

### Consecuencias en el código existente

- El rol actual ETTE tiene ámbito global y consulta de anexos. Añadir una oficina a su asignación no basta para limitarlo: hay que separar el acceso global de coordinación del acceso de integrantes.
- Los permisos actuales se agregan por rol y el ámbito se calcula por separado. Para una capacidad asignada solo a ciertas oficinas, comprobar la combinación **acción + asignación + dependencia + proceso**; evitar que un permiso obtenido para una oficina se extienda a otra por la unión de ámbitos.
- La gestión ETTE de integrantes debe ser limitada a su equipo. No equivale al permiso general de administrar usuarios, cambiar roles o crear administradores.
- El acceso previo del delegado ETTE al documento está confirmado y debe ser específico de su designación. La consulta ordinaria de documentos firmados no exige la firma opcional ETTE. No se amplía por ello el acceso previo a usuarios de consulta pura.
- Portal, menús y controles son presentación. Las restricciones también deben cumplirse en API, archivos, exportaciones y acceso directo por identificador.

## 4. Firma, acta y consolidación

El sistema actual solo genera el acta después de consolidar. La nueva regla exige firmar también el **Anexo 07 antes de remitir**, por lo que se debe cambiar el momento de emisión del acta. No basta con integrar un firmador sobre el flujo actual.

También se debe contrastar el texto del acta con ese momento: precisar qué declara cada firmante y distinguir su suscripción del posterior visto bueno de la dependencia padre. El documento no debe afirmar una recepción o consolidación que todavía no ocurrió.

Generar, firmar, remitir, dar visto bueno y consolidar son hechos distintos. **Recomendación:** conservar versiones de documentos, responsables, firmantes y archivos firmados, vinculando el visto bueno y la consolidación a la versión efectivamente recibida.

### Obligatoriedad y excepción ETTE

- **ETTS y personal de la entidad:** firma digital obligatoria para quienes deban suscribir el documento. Falta precisar qué personal firma cada anexo y en qué documentos/etapas interviene ETTS; no se exige que toda persona firme todos los anexos ni se agrega una firma ETTS a cada entrega por defecto.
- **ETTE:** firma opcional. La remisión y consolidación no pueden depender únicamente de conseguir esa firma. Si no firma, se registra esa situación y se le entrega una copia digital de la versión correspondiente, con sus firmas obligatorias.
- La constancia identifica al participante, su dependencia/ámbito y la versión sin firma ETTE. La entrega de copia debe ser trazable; el canal y la acreditación operativa siguen por definir.
- La falta de firma ETTE no equivale a documento sin firmas obligatorias, no elimina el plazo y no cierra una observación o una falta de conformidad que exista por otro motivo.
- No confundir ausencia de firma ETTE, falta de certificado y falta de conformidad: son hechos diferentes. No se exige justificar la ausencia opcional para convertirla en una autorización adicional no solicitada.
- La declaración de falta de certificado de un firmante obligatorio no habilita por sí misma omitirlo o sustituirlo por el jefe. Esa contingencia está pendiente; la excepción confirmada es la firma ETTE.

La última aclaración no amplía la firma obligatoria a personas que solo consultan ni define nuevos documentos de ETTS. Define el carácter obligatorio de sus suscripciones; la matriz documental queda pendiente.

Al corregir información observada debe definirse qué firmas/vistos buenos requiere la nueva versión. La re-remisión automática actual al cerrar la última observación no debe reutilizarse sin comprobar la regla de firma y el plazo vigente.

**Consolidación propuesta, no decidida:** organizar los originales firmados de las hijas junto con los documentos propios del padre y, si se requiere, un índice/informe de consolidación. No asumir que fusionar PDF mantiene las firmas de los originales. Hay que distinguir los archivos firmados de un documento resumen o de una copia para lectura.

La declaración «sin certificado» no equivale a una firma del servidor realizada con el certificado de otra persona. Cada firmante actúa con su propia identidad. La asignación de responsabilidad de información y la atribución del jefe/delegado deben quedar expresas.

### Referencia oficial de Firma Perú

Se consultaron el [servicio institucional de Firma Perú](https://www.gob.pe/22271-acceder-a-la-plataforma-nacional-de-firma-digital-firma-peru) y el [documento oficial de integración web](https://resources.firmaperu.gob.pe/documentos/firmador-componente-web.pdf) el 2026-11-11. La plataforma describe servicios para crear y validar firmas, y su integración web incluye un componente en el equipo del firmante y comunicación con el sistema institucional.

Estas fuentes sustentan la posibilidad técnica general; no prueban que la integración municipal ya funcione ni definen atribuciones de firma. Se requiere evaluar el entorno institucional, los certificados RENIEC que se usarán, múltiples firmas y comprobación del resultado. No se fijan todavía librerías, endpoints ni forma de despliegue.

## 5. Corte y detalle documental

Fecha de corte del SGD, fecha del documento, fecha de declaración y plazo de entrega tienen significados distintos. El ejemplo del 25 de diciembre no fija ninguno de ellos para todos los procesos.

La ingesta documental actual acota por año y conserva agregados de acervo. Tener un campo de corte en el proceso no demuestra que cada consulta se filtre por día/hora. Se deberá definir la referencia temporal del conjunto importado y cómo registrar complementos sin alterar documentos ya firmados.

Para que «35 enviados» muestre exactamente ese conjunto, se recomienda compartir filtros y referencia temporal entre conteo y listado. La consulta puede ser al SGD o a datos locales permitidos: no se ha elegido la estrategia. Acceso a SQL no implica acceso al repositorio de archivos ni autorización para difundirlos.

También se debe resolver si asunto y sumilla son datos diferentes. El modelo actual registra asunto, acción pendiente y observaciones, pero la solicitud exige una sumilla y justificación explícitas: no se decide renombrar o duplicar campos sin esa definición.

## 6. Cronograma y métricas

El bloqueo por vencimiento está confirmado, pero hay que precisar si afecta solo una remisión nueva o también corrección, firma, visto bueno y consolidación. Los distintos niveles pueden necesitar fechas diferentes; no se presupone que una sola fecha cierre toda la cadena.

Una prórroga debe conservar el plazo anterior y su autor. Falta decidir cómo se desbloquea una actividad y si las entregas ya realizadas cambian de clasificación de cumplimiento al modificarse el plazo. No se concede un permiso implícito para saltar el bloqueo.

El dashboard debe mostrar hechos diferentes: registro, completitud, firmas obligatorias, firma ETTE opcional, remisión, visto bueno y consolidación. La ausencia de firma opcional ETTE no debe reducir por sí sola el cumplimiento de firmas obligatorias; su constancia y la entrega de copia deben ser consultables. Las fórmulas de avance y la condición «No aplica» deben acordarse para no presentar presencia de datos como cumplimiento.

## 7. Orden recomendado para continuar

1. Precisar el orden de firmas y la emisión del acta anterior a la remisión; la función del delegado ETTE y su acceso previo ya están confirmados.
2. Precisar visto bueno, producto consolidado, correcciones/versiones y cierre institucional.
3. Cerrar reglas del cronograma, complementos posteriores al corte y tratamiento del vencimiento.
4. Definir capacidades/ámbitos, catálogo de entregables y métricas.
5. Preparar el plan de cambios en datos, API, interfaz, integración y pruebas por requisito.

Es una recomendación de secuencia. No se ha iniciado la implementación ni se hereda el plan F0–F9 del histórico.
