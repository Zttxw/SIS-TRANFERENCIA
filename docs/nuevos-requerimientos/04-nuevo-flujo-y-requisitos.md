# Nuevo flujo y requisitos

**Actualización:** 2026-11-11. **Estado:** requisitos y aclaraciones sobre ETTE, firmas y cronograma incorporados; decisiones complementarias abiertas. **Implementación:** pendiente.

Este documento recoge la solicitud y las respuestas del usuario. [02-flujo-implementado.md](02-flujo-implementado.md) describe el sistema existente, no el nuevo objetivo. Las recomendaciones se distinguen de las decisiones confirmadas en [05-coherencia-y-decisiones.md](05-coherencia-y-decisiones.md).

## 1. Definiciones confirmadas por el usuario

| ID | Definición | Origen |
|---|---|---|
| C-01 | La consulta ETTE ordinaria permite **anexos firmados de sus dependencias asignadas, solo lectura**. El delegado firmante tiene acceso previo para revisar y firmar | Primera respuesta y aclaración posterior de la excepción firmante |
| C-02 | Anexos **02 al 07**, con Firma Perú y certificados RENIEC. La firma digital de **ETTS y personal de la entidad es obligatoria** en sus intervenciones de suscripción; la de **ETTE es opcional** | Última aclaración: reemplaza la exigencia previa de firma ETTE |
| C-03 | **Administrador y ETTS** pueden modificar el cronograma; el **vencimiento bloquea entregas** | Aclaración expresa sobre cronograma |
| C-04 | El centro de costo completa y firma antes de remitir; el padre recibe documentos firmados, da vistos buenos y consolida los de sus hijas | Explicación del flujo en la solicitud |
| C-05 | Se conservan las observaciones como camino excepcional | Explicación del flujo en la solicitud |
| C-06 | ETTS y ETTE tendrán portales propios. ETTE tendrá un comité principal de aproximadamente tres personas y podrá crear usuarios fuera del comité, designados como delegados para una o varias dependencias | Solicitud y segunda aclaración |
| C-07 | El delegado ETTE visita y revisa sus dependencias y puede firmar cada anexo conforme, **opcionalmente**. Conserva acceso previo para revisar y, cuando corresponda, suscribir | Aclaración sobre delegados, ajustada por la opcionalidad posterior |
| C-08 | Si ETTE no firma, se registra esa ausencia en el sistema y se le entrega **una copia digital del documento**. La falta de firma ETTE no bloquea la entrega por ese motivo | Última aclaración expresa y consecuencia de su carácter opcional |

La aclaración posterior concreta a los usuarios designados por ETTE como **delegados con consulta y firma tras revisión**, no como cuentas impedidas de firmar. La prohibición inicial de firma no se aplica a esa función expresamente designada. Consultar y firmar no les concede edición de datos, eliminación, visto bueno del padre ni consolidación. No se ha solicitado obligatoriamente una categoría adicional de usuarios de consulta pura; si se conserva, no hereda la firma del delegado.

La referencia a aproximadamente tres miembros describe el comité, no establece un límite rígido de cuentas. Falta definir quién del comité administra las designaciones y si sus miembros pueden actuar también como delegados firmantes.

La obligatoriedad de ETTS y del personal se aplica a quienes deban suscribir cada documento según su responsabilidad. No implica que todos los servidores o todos los miembros ETTS firmen todos los anexos. Falta completar la matriz de documentos, firmantes y etapas ETTS; no se agrega por defecto una firma ETTS a toda remisión de centro de costo. La excepción de ETTE no se extiende a las firmas obligatorias de la entidad.

## 2. Flujo objetivo recibido

1. Configurar etapas, actividades y plazos del cronograma del proceso.
2. Cada centro de costo completa los anexos y declara la información complementaria pertinente, incluidos documentos pendientes posteriores al corte del SGD.
3. Se generan los documentos de los anexos 02–07 y se obtienen las firmas digitales obligatorias del personal responsable de la entidad, incluido el jefe encargado. El delegado ETTE tiene acceso previo, visita y revisa; puede firmar opcionalmente. Si no firma, se deja constancia y se le entrega una copia digital del documento. Se utiliza Firma Perú con certificados RENIEC.
4. El centro de costo remite al padre los documentos con sus firmas obligatorias completas, dentro del plazo vigente. La ausencia de firma ETTE registrada no bloquea esta remisión; tampoco exime del cronograma ni de los demás requisitos.
5. El padre consulta los documentos firmados de sus hijas, da vistos buenos y consolida. Puede observar excepcionalmente para solicitar correcciones.
6. La entrega continúa por la jerarquía, con firma digital obligatoria de los intervinientes ETTS en los documentos que deban suscribir. Se debe definir el producto consolidado del padre, la nueva emisión que le corresponda y los documentos/firmantes del cierre institucional ETTS.
7. ETTS monitorea toda la entidad y consulta/descarga los anexos organizados. El comité ETTE monitorea el avance y gestiona sus delegados. Estos consultan su ámbito y acceden al documento pendiente de suscripción para ejercer su función firmante.
8. El cronograma alimenta indicadores de cumplimiento y bloquea entregas vencidas. Falta definir qué operaciones quedan bloqueadas y qué regla permite retomar el trámite.

~~~mermaid
flowchart TD
    A[Centro de costo completa anexos] --> B[Genera documentos 02 a 07]
    B --> C[Firmas obligatorias de la entidad]
    C --> K{ETTE firma opcionalmente}
    K -->|Sí| L[Conserva firma ETTE]
    K -->|No| M[Registra ausencia y entrega copia digital a ETTE]
    L --> D[Remite dentro del plazo]
    M --> D
    D --> E[Padre revisa y da visto bueno]
    E --> F[Consolida documentos de hijas y continúa la cadena]
    E -. Observación excepcional .-> G[Corrección y nueva versión por definir]
    G -.-> B
    F --> H[Intervención ETTS con firma obligatoria donde corresponda]
    F --> I[Seguimiento ETTE y consulta de anexos firmados por ámbito]
    J[Cronograma administrado por administrador y ETTS] -. Plazos .-> A
    J -. Bloquea entregas vencidas .-> D
~~~

El diagrama expresa el recorrido solicitado; no define todavía los estados de base de datos. La firma ETTE, cuando se realiza, sigue su visita/revisión; falta definir su orden con la firma del jefe. El camino sin firma ETTE deja constancia y copia digital, sin suprimir las firmas obligatorias de la entidad ni atribuir a ETTE una conformidad que no haya registrado.

## 3. Catálogo de requisitos y criterios iniciales

### RF-001 — Documentos pendientes, sumillas y corte del SGD

**Solicitado:** incorporar documentos posteriores al corte del SGD o pendientes de atención que correspondan a la transferencia. Registrar número, tipo, fecha, dependencia, sumilla y justificación de la condición de pendiente.

**Criterios iniciales:**

- Conservar esos datos, proceso, origen, autor y fecha de declaración.
- Distinguir datos SGD de declaraciones complementarias, sin modificar la fuente.
- Exigir justificación de pendiente; una fecha posterior al corte no implica por sí sola que el documento esté pendiente.
- El **25 de diciembre es un ejemplo**, no una fecha fija aprobada.

**Por definir:** significado del corte —extracción o suspensión operativa del SGD—, plazo de incorporación de complementos, sumilla frente a asunto, identificación para evitar duplicados y documentos incorporados después de firmar/remitir. Debe ser coherente con el bloqueo por vencimiento y la conservación de versiones firmadas.

### RF-002 — Consulta documental desde indicadores

**Solicitado:** seleccionar una cifra, por ejemplo «35 informes técnicos enviados», y acceder a los 35 documentos correspondientes, sus datos y sus originales, según disponibilidad y permisos.

**Criterios iniciales:**

- Indicador y listado comparten definición, filtros, ámbito, periodo y referencia temporal; la cifra total no se confunde con una página de resultados.
- Se permite visualizar o descargar el archivo cuando existe y el usuario está autorizado.
- Se informa la falta de archivo o permiso sin habilitar accesos indirectos.
- El detalle documental respeta las restricciones del perfil, incluso al acceder por enlace directo.

**Por definir:** catálogo de indicadores, significado de enviado/recibido/pendiente, identificación del documento y acceso al repositorio de originales SGD. La ingesta actual de acervo solo conserva agregados y necesita ampliación o una consulta detallada complementaria.

### RF-003 — Observaciones administrativas

**Solicitado:** registrar incidencias sobre servidores, responsables y dependencias por rotación, cambio de oficina, cese en el cargo u otras discrepancias; conservar motivo, descripción, acción correctiva y trazabilidad.

**Criterios iniciales:**

- Identificar persona/dependencia afectada y su situación al registrar la incidencia.
- Conservar historial de acciones y atención, separado de observaciones de anexos.
- No sobrescribir automáticamente SGD ni perder la responsabilidad histórica de documentos y entregas.

**Por definir:** quién registra, atiende y aprueba la corrección, sus estados, efectos sobre asignaciones locales y si bloquea firma/remisión. Una rotación no debe borrar quién elaboró o firmó información anterior.

### RF-004 — Certificados, responsabilidad de información y firmantes

**Confirmado:** la firma digital de ETTS y del personal de la entidad es obligatoria para los documentos que deban suscribir; la de ETTE es opcional. Se mantiene la identificación del responsable de la información y del firmante efectivo, y la declaración de disponibilidad de certificado.

**Criterios iniciales:**

- Conservar la declaración de disponibilidad de certificado y su historial.
- Distinguir elaborador/responsable de información, jefe firmante y delegado ETTE firmante, con sus cargos y ámbito.
- Registrar cada firma a nombre de quien efectivamente usa su certificado.
- Distinguir firmantes obligatorios de participantes con firma opcional por documento y etapa.
- Si ETTE no firma, conservar constancia asociada a persona, dependencia y versión, y entregar copia digital identificable a su destinatario. No marcar al ETTE como firmante ni asumir su conformidad por recibirla.
- La falta de firma ETTE no bloquea la entrega por sí sola; la falta de una firma obligatoria de ETTS o de la entidad no se trata como la excepción ETTE.

**Por definir:** matriz de personal/ETTS que debe firmar cada documento y etapa; tratamiento de un firmante obligatorio sin certificado, sin dar por autorizada una sustitución por el jefe. La última regla no habilita omitir firmas obligatorias. Definir quién registra la ausencia ETTE y cómo se entrega y acredita la copia digital; no se presume un canal de envío ni un acuse de recepción automático.

### RF-005 — Firma Perú para anexos 02–07

**Confirmado:** integrar Firma Perú con certificados RENIEC; firmas obligatorias de ETTS y del personal responsable de la entidad, y firma opcional de ETTE. Se mantiene el alcance de anexos 02–07 y se completará la matriz de intervención ETTS.

**Criterios iniciales propuestos para validar:**

- Vincular operación, proceso, dependencia, versión del anexo y cada firmante autorizado.
- Conservar las firmas requeridas en cada documento sin perder la primera al incorporar la segunda.
- No marcar como firmado ante cancelación, error o simple carga de un archivo.
- Conservar el PDF firmado y el resultado de la comprobación de sus firmas.
- La capacidad de firma del delegado se restringe a las dependencias/documentos para los que está designado; no nace de la sola pertenencia al comité ETTE ni de una cuenta de consulta pura.
- Verificar la completitud de las firmas obligatorias sin exigir una firma ETTE opcional. Si esta se omite, registrar la ausencia y la entrega de copia digital.
- Un documento con firmas obligatorias válidas no se presenta como incompleto únicamente por no contener firma ETTE. Una firma ETTE cancelada o fallida no se registra como realizada; su ausencia sigue el camino documentado sin firma.

**Por definir:** quién administra la designación del delegado, orden de firmas, tratamiento de falta de conformidad/rechazo, cancelación y correcciones. El acceso previo del delegado está confirmado. La referencia técnica oficial se registra en [05-coherencia-y-decisiones.md](05-coherencia-y-decisiones.md); no se ha realizado una integración ni una prueba de certificados.

### RF-006 — Dashboard operativo y analítico por perfil

**Solicitado:** métricas reales, gráficos comparativos, filtros y acceso interactivo al detalle. Mostrar avance por dependencia, anexos completados/pendientes/observados, entregas, oficinas sin iniciar, cumplimiento de plazos y avance general.

**Perfiles:**

- ETTS: visión institucional y seguimiento de todas las entregas.
- Revisor ETTS: anexos e información necesarios para revisar/validar, con atribuciones específicas por definir.
- Comité principal ETTE: seguimiento y gestión de delegados; aproximadamente tres miembros, sin límite rígido aprobado.
- Delegado ETTE: consulta en dependencias asignadas, acceso previo para visita/revisión y firma de cada anexo conforme. No edita ni elimina datos ni realiza la consolidación del padre.
- Consulta pura ETTE, si se mantiene como capacidad separada: lectura de anexos firmados del ámbito asignado, sin firma.

**Criterios iniciales:**

- Todas las cifras y descargas respetan proceso, ámbito y capacidades del perfil.
- Distinguir presencia, completitud, firma, remisión y visto bueno.
- Separar firmas obligatorias pendientes de firma ETTE opcional ausente, y permitir consultar la constancia y situación de la copia digital.
- Aplicar filtros coherentes a gráficos, cifras, listados y descargas.
- Derivar cumplimiento del cronograma y conservar el contexto de sus cambios.

**Por definir:** fórmulas y denominadores, ponderación institucional, «sin iniciar», «completado», «No aplica» y filtros requeridos. Para la consulta ordinaria de anexos firmados, la ausencia de firma ETTE no los excluye si cumplen las firmas obligatorias; los demás criterios de publicación están por definir. No usar únicamente existencia de registros como avance aprobado.

### RF-007 — Cronograma configurable con bloqueo

**Confirmado:** administrador y ETTS modifican el cronograma. El vencimiento bloquea entregas.

**Solicitado:** actividades, etapas, fechas de inicio y vencimiento, modificaciones de plazos, estados pendientes/vencidos/completados e integración con dashboard.

**Criterios iniciales:**

- Conservar proceso y alcance de cada actividad/plazo.
- Auditar autor, fecha y valores anteriores/nuevos al modificar el cronograma.
- Rechazar desde la API una entrega cuyo plazo aplicable haya vencido; no limitar el bloqueo a la interfaz.
- Mostrar la causa del bloqueo y el plazo aplicable.
- Distinguir completar una actividad de cumplirla a tiempo.

**Por definir:** alcance de ETTS coordinador frente a revisor ETTS, fechas generales o por dependencia, zona horaria/hora de vencimiento, operaciones bloqueadas —remisión, firma, subsanación, visto bueno o consolidación— y mecanismo para continuar después del vencimiento. No se presume una excepción de bloqueo para administrador ni reactivación automática por prórroga.

### RF-008 — Portal ETTE, comité y delegados por dependencia

**Solicitado y aclarado:** ETTE tiene portal propio y un comité principal de aproximadamente tres personas. Puede crear usuarios fuera del comité y designarlos como delegados en una o varias dependencias. El delegado visita y revisa; su firma en cada anexo es **opcional**. Tiene acceso previo para revisar y eventualmente firmar. Cuando no firma, queda constancia y recibe copia digital.

**Criterios iniciales:**

- Distinguir gestión del comité, consulta y designación de firma por dependencia.
- Limitar altas/asignaciones a ese equipo, sin facultad general de modificar roles o cuentas institucionales.
- Impedir al delegado modificar o eliminar información de transferencia, realizar el visto bueno jerárquico o consolidar; permitir su revisión de conformidad y firma expresamente solicitadas.
- Permitir consulta previa y firma solo dentro de sus designaciones. La firma de cada anexo deja constancia de su intervención; precisar en el diseño cómo registrar la visita/revisión sin imponer pruebas adicionales no solicitadas.
- Comprobar ámbito en API, archivos y exportaciones; auditar altas, cambios y retiros de asignación.
- Permitir al delegado recibir/acceder a su copia digital aun sin firma propia, respetando el ámbito y la versión. Conservar registro de entrega de la copia sin equipararlo automáticamente con recepción confirmada o conformidad.

**Por definir:** dependencia exacta o subárbol, identificación/alta de usuarios fuera del comité —sin asumir que ya existen en el padrón—, revocación, facultades de cada miembro del comité y registro operativo de visita/no conformidad. No crear un rol por oficina. La categoría adicional de consulta pura no es un requisito nuevo obligatorio.

### RF-009 — Firma previa, visto bueno y consolidación jerárquica

**Confirmado:** los centros de costo completan las firmas digitales obligatorias de la entidad en anexos 02–07 antes de remitir al padre. La firma ETTE es opcional; si falta, se registra y se entrega copia digital. El padre accede a lo firmado, da vistos buenos y consolida documentos de sus hijas. Observaciones como excepción. Las firmas ETTS son obligatorias en su intervención de suscripción, con documentos y etapas por precisar.

**Criterios iniciales:**

- Identificar la versión firmada remitida por cada hija, su origen y firmantes.
- Registrar quién da el visto bueno, cuándo y sobre qué entregable/versión.
- Conservar relación de documentos y vistos buenos al consolidar.
- No sustituir silenciosamente documentos firmados cuando se corrige información.
- No bloquear remisión, visto bueno o consolidación únicamente por ausencia registrada de la firma opcional ETTE. Esto no elimina observaciones, plazos ni controles de firmas obligatorias.

**Por definir:** quién remite formalmente, visto bueno por anexo o paquete, si requiere una firma adicional, producto consolidado, documentos propios del padre y cierre ETTS. Definir cómo se corrige, vuelve a firmar y vuelve a revisar una versión observada sin el retorno automático prematuro del flujo actual.

### RF-010 — Portal ETTS y archivo institucional

**Solicitado:** portal ETTS con seguimiento de toda la entidad, consulta/descarga organizada de anexos emitidos y configuración del cronograma. Revisores ETTS con acceso para revisar/validar entregas.

**Criterios iniciales:**

- Organizar por proceso, dependencia, anexo, versión y situación de emisión/firma/entrega.
- Descargar los originales firmados sin alterar su contenido.
- Separar consulta/revisión de las capacidades de gestionar cronograma y equipo.
- Exigir firma digital a quienes suscriban por ETTS en los documentos y etapas definidos; no confundir consulta del portal con una obligación de firmar cada documento consultado.

**Por definir:** coordinación frente a revisor, quién asigna revisores y su ámbito, visibilidad de borradores, tipos de descarga y contenido del cierre institucional.

## 4. Diferencias respecto de lo implementado

| RF | Base actual | Cambio requerido |
|---|---|---|
| 001 | CRUD de documentos; número, tipo y fecha opcionales; asunto obligatorio | Sumilla/justificación y reglas de corte/complementos |
| 002 | Agregados SGD y resúmenes | Listado documental exacto y acceso autorizado a originales |
| 003 | Observaciones sobre elementos de anexo | Incidencias administrativas y seguimiento correctivo |
| 004–005 | Evidencias del acta y punto de extensión de firma | Firma real 02–07, obligatoriedad ETTS/entidad, opcionalidad ETTE, constancia de ausencia y copia digital |
| 006 | Tablero por presencia/estado/patrimonio | Completitud, firma, visto bueno, plazos y análisis por perfil |
| 007 | Sin módulo de cronograma | Actividades/plazos, administración compartida y bloqueo |
| 008 | Rol ETTE global con consulta de anexos | Portal/comité, alta de delegados, ámbito limitado, visita/revisión y firma con acceso previo |
| 009 | Consolidación cambia estado; acta exige consolidación | Generación/firma anterior, visto bueno y consolidación documental con versiones |
| 010 | ETTS global con revisión, acta y reportes | Portal especializado, archivo organizado y cronograma |

## 5. Continuación

Cerrar las decisiones pendientes en [05-coherencia-y-decisiones.md](05-coherencia-y-decisiones.md), completar criterios de aceptación y preparar después el plan de implementación, considerando los hallazgos H-01 a H-10 de la evaluación inicial.

Esta actualización no modifica datos, roles, permisos, pantallas ni lógica del sistema. Los nombres de nuevos roles y estados no se han decidido.
