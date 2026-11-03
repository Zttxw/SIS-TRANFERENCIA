# PROPUESTA FUNCIONAL DEL SISTEMA DE TRANSFERENCIA DE GESTIÓN 2026

**Municipalidad Distrital de San Jerónimo**

**Versión:** 1.1 — Propuesta actualizada  
**Estado:** Sujeto a evaluación, validación y modificaciones  
**Documento de referencia:** Propuesta de Directiva N.° XXXX-2026-MDSJ/GM.

---

## 1. DESCRIPCIÓN GENERAL

Se propone implementar un sistema web para organizar, registrar, verificar, consolidar y entregar la información correspondiente al proceso de transferencia de gestión de la Municipalidad Distrital de San Jerónimo del año 2026.

El sistema permitirá recopilar información siguiendo la estructura jerárquica institucional, comenzando por los servidores públicos, continuando con los responsables de dependencias subordinadas y culminando en las dependencias superiores y el Equipo de Transferencia del Titular Saliente (ETTS).

Una característica fundamental será el aprovechamiento de la información existente en los sistemas institucionales, principalmente el Sistema de Gestión Documentaria (SGD) y el módulo patrimonial del SIGA, evitando solicitar a los servidores la transcripción de información que ya se encuentra registrada.

La plataforma facilitará la participación de los usuarios mediante procedimientos de verificación, complementación y registro de observaciones.

## 2. OBJETIVO GENERAL

Desarrollar una plataforma web que centralice la información requerida para la transferencia de gestión 2026, utilizando los registros existentes en los sistemas municipales y permitiendo completar, verificar y consolidar progresivamente la información faltante.

### 2.1. Objetivos específicos


- Aprovechar la estructura organizacional y los registros de personal existentes en el SGD.
- Recuperar información documentaria del SGD y facilitar su incorporación a los anexos correspondientes.
- Obtener los inventarios patrimoniales del SIGA.
- Permitir que los servidores verifiquen la existencia y el estado de los bienes asignados.
- Registrar manualmente la documentación física no disponible en los sistemas institucionales.
- Implementar un procedimiento de entrega y consolidación jerárquica.
- Facilitar la identificación y subsanación de observaciones.
- Generar informes, anexos y actas conforme a la directiva.
- Centralizar los documentos sustentatorios y facilitar la consulta de la información consolidada.

## 3. ALCANCE

El sistema se implementará exclusivamente para apoyar la transferencia de gestión municipal de 2026.

Comprenderá la recopilación de información, integración con fuentes institucionales, registro manual complementario, validación, consolidación por niveles organizacionales, generación de documentación y cierre de expedientes.

No se contempla reemplazar el SGD, SIGA, los sistemas de personal ni los aplicativos oficiales de la Contraloría General de la República.

Las integraciones dependerán de la disponibilidad y calidad de los datos, de las posibilidades técnicas de acceso y de los plazos de implementación.

## 4. FUENTES DE INFORMACIÓN INSTITUCIONAL

### 4.1. Sistema de Gestión Documentaria (SGD)

El SGD será considerado la fuente principal de información para identificar:

- Estructura organizacional vigente.
- Dependencias y relaciones jerárquicas.
- Responsables de las dependencias.
- Servidores vinculados a cada dependencia.
- Documentos y expedientes registrados.
- Documentos pendientes de atención.
- Estado de atención y asignaciones documentarias, según la información disponible.

La información organizacional permitirá configurar automáticamente la estructura de entrega y recepción de información.

Además, se evaluará la posibilidad de vincular el SGD con el sistema de transferencia para incorporar directamente información documentaria y generar los anexos correspondientes.

Los usuarios podrán complementar los registros cuando existan datos faltantes, inconsistencias o documentación que no se encuentre digitalizada.

La información obtenida deberá conservar referencias a los registros originales del SGD.

### 4.2. SIGA — Módulo de Patrimonio

El inventario patrimonial se obtendrá, preferentemente, de los registros oficiales disponibles en el módulo patrimonial del SIGA.

El sistema mostrará a cada usuario los bienes que figuren bajo su responsabilidad, de acuerdo con la información proporcionada.

Cada servidor realizará la verificación de sus bienes mediante las siguientes acciones:

1. Consultar la relación de bienes asignados.
2. Confirmar si tiene físicamente cada bien.
3. Registrar el estado de conservación del bien cuando corresponda.
4. Ingresar una observación obligatoria cuando declare que no tiene el bien.
5. Registrar observaciones adicionales en caso de diferencias o deterioro.
6. Remitir la información verificada a su responsable inmediato.

Los resultados se consolidarán por dependencia, permitiendo identificar bienes confirmados, bienes no ubicados por el servidor y bienes con observaciones.

Estas declaraciones no modificarán directamente los registros patrimoniales del SIGA. Las inconsistencias deberán ser evaluadas por la Oficina de Gestión Patrimonial.

También deberá contemplarse la posibilidad de registrar bienes físicos encontrados que no figuren en el inventario proporcionado, distinguiéndolos de los bienes patrimonializados oficialmente.

### 4.3. Sistema Integrado de Gestión de Personal (SIGEPER)

Debido a que SIGEPER se encuentra en desarrollo y todavía no constituye una fuente confiable y consolidada de información, no será utilizado como fuente principal para la transferencia de gestión 2026.

La información de servidores, encargados y estructura organizacional se obtendrá inicialmente del SGD.

Cuando resulte necesario, Recursos Humanos podrá validar o complementar los datos que no se encuentren disponibles o actualizados.

### 4.4. Información que requiere registro manual

La información que no pueda obtenerse mediante los sistemas institucionales deberá ser registrada por los servidores o responsables correspondientes.

Principalmente:

- Inventarios del acervo documentario físico.
- Ubicación de cajas, archivadores y legajos.
- Documentación no registrada en el SGD.
- Logros y dificultades de gestión.
- Asuntos pendientes que requieran descripción o acciones complementarias.
- Observaciones sobre bienes patrimoniales.
- Bienes no patrimonializados.
- Documentos sustentatorios no disponibles digitalmente.

## 5. USUARIOS Y ROLES

El sistema contará con los siguientes perfiles:

| Rol | Funciones |
|---|---|
| Administrador | Gestionar parámetros, usuarios, dependencias, permisos y configuración. |
| Servidor público | Verificar información precargada, registrar información faltante y remitir su entrega. |
| Responsable de equipo de trabajo | Revisar, complementar y consolidar información de sus integrantes. |
| Responsable de centro de costo | Consolidar información de la dependencia y sus unidades subordinadas. |
| Coordinador acreditado | Verificar información, formular observaciones y registrar resultados de revisión. |
| ETTS | Consultar, revisar y consolidar la información institucional. |
| ETTE | Consultar y verificar la documentación que corresponda a sus atribuciones. |

Los permisos se establecerán conforme al rol, la dependencia y las funciones asignadas.

## 6. FLUJO JERÁRQUICO DE TRANSFERENCIA

El procedimiento se organizará en las siguientes etapas.

### Etapa 1. Carga inicial de información

El sistema recuperará la estructura organizacional y los datos de personal desde el SGD.

Asimismo, se incorporarán los inventarios patrimoniales del SIGA y, cuando sea viable, la información documentaria correspondiente a cada dependencia.

Los registros serán asociados a sus respectivos servidores y centros de costo.

### Etapa 2. Verificación y complementación por los servidores

Cada servidor ingresará al sistema y visualizará la información que le corresponda.

Podrá:

- Verificar los registros importados.
- Confirmar la posesión de sus bienes patrimoniales.
- Registrar observaciones.
- Completar información faltante.
- Registrar documentación física.
- Identificar asuntos pendientes.
- Adjuntar evidencias.

Al finalizar, remitirá su información al responsable inmediato.

### Etapa 3. Revisión por responsables de dependencias

Los responsables de los equipos de trabajo o dependencias subordinadas revisarán la información remitida por sus servidores.

Podrán formular observaciones, solicitar correcciones y complementar los registros con información correspondiente a su propia gestión.

Una vez concluida la revisión, consolidarán la información y la remitirán al nivel superior.

### Etapa 4. Consolidación por niveles organizacionales

La información seguirá la jerarquía institucional establecida en el SGD y contrastada con la directiva vigente.

Los responsables de los centros de costo de tercer, segundo y primer nivel efectuarán las actividades de consolidación que correspondan.

El sistema conservará la identificación del servidor que proporcionó cada registro, su dependencia de origen y el historial de remisiones.

### Etapa 5. Verificación y observaciones

Los coordinadores acreditados revisarán la información correspondiente a los centros de costo asignados.

Podrán registrar información faltante, inconsistencias, observaciones y resultados de verificación.

Los responsables atenderán las observaciones mediante los mecanismos de subsanación establecidos.

### Etapa 6. Consolidación institucional

El ETTS accederá a los registros consolidados, anexos, informes, actas, observaciones y documentos sustentatorios.

La información se utilizará como apoyo para preparar los entregables requeridos durante la transferencia formal.

## 7. MÓDULOS FUNCIONALES

### 7.1. Administración de usuarios y estructura organizacional

- Carga de dependencias desde el SGD.
- Identificación automática de relaciones jerárquicas.
- Importación de servidores y responsables.
- Asignación de roles y permisos.
- Registro de coordinadores acreditados.
- Configuración del periodo y fecha de corte.
- Verificación y corrección controlada de inconsistencias organizacionales.

### 7.2. Informe de gestión — Anexo N.° 02

- Datos del centro de costo y responsable.
- Principales funciones.
- Logros y resultados.
- Dificultades identificadas.
- Agenda y asuntos pendientes.
- Evidencias documentales.
- Generación del informe en PDF.

### 7.3. Acervo documentario — Anexo N.° 03

El módulo distinguirá dos tipos de información:

**Documentación digital**

Se evaluará su recuperación desde el SGD, mediante consultas a los documentos y expedientes registrados, conservando referencias a su ubicación y estado.

**Documentación física**

Será registrada manualmente por los servidores o responsables.

Se considerarán series documentales, periodos, cantidad de unidades de conservación, tipo de unidad de conservación y ubicación.

La información física y digital se organizará de manera diferenciada, evitando considerar que el inventario de documentos registrados en el SGD equivale necesariamente a todo el acervo documentario de una dependencia.

### 7.4. Bienes patrimoniales — Anexo N.° 04

- Importación de bienes desde SIGA.
- Asociación de bienes con servidores y dependencias.
- Consulta del inventario asignado.
- Confirmación individual de existencia física.
- Registro de bienes que el servidor declara no tener.
- Observaciones obligatorias ante ausencia declarada.
- Verificación del estado de conservación.
- Identificación de diferencias respecto del inventario.
- Consolidación por dependencia.
- Generación del anexo correspondiente.

### 7.5. Personal — Anexo N.° 05

- Importación de información disponible desde el SGD.
- Identificación de dependencias y personal asignado.
- Registro de DNI, nombres y cargo.
- Complementación del régimen laboral, modalidad contractual y situación laboral cuando estos datos no estén disponibles o no sean confiables.
- Validación por los responsables competentes.
- Generación de relaciones de personal por dependencia.

No se utilizará SIGEPER como fuente principal durante esta implementación.

### 7.6. Bienes no patrimoniales — Anexo N.° 06

- Registro de bienes no patrimonializados.
- Cantidad y unidad de medida.
- Estado de conservación.
- Ubicación.
- Servidor o dependencia responsable.
- Observaciones y documentos sustentatorios.
- Consolidación por centro de costo.

### 7.7. Documentos pendientes

- Recuperación de información documentaria desde el SGD, cuando sea viable.
- Identificación de documentos pendientes por dependencia.
- Identificación del servidor o responsable de atención.
- Consulta del estado y antigüedad de los documentos.
- Registro de acciones pendientes.
- Incorporación de observaciones.
- Generación de reportes.

El sistema permitirá diferenciar la información obtenida del SGD de la información complementaria proporcionada por los servidores.

### 7.8. Entrega y consolidación jerárquica

- Remisión de información al responsable inmediato.
- Revisión de registros recibidos.
- Solicitud de correcciones.
- Consolidación por dependencia.
- Remisión al centro de costo superior.
- Identificación de responsables de entrega y recepción.
- Historial de actuaciones.
- Registro de fechas y horas.

### 7.9. Observaciones y subsanaciones

- Registro de observaciones por anexo o elemento.
- Identificación del usuario responsable.
- Comunicación de observaciones.
- Presentación de correcciones y sustentos.
- Seguimiento del estado.
- Conservación del historial de cambios.

### 7.10. Acta de transferencia — Anexo N.° 07

- Generación automática del acta.
- Identificación de responsables e intervinientes.
- Relación de anexos entregados.
- Registro de observaciones.
- Generación en PDF.
- Registro del documento suscrito.
- Custodia del acta y sus evidencias.

### 7.11. Seguimiento y reportes

- Avance general de la transferencia.
- Avance por gerencias, subgerencias y centros de costo.
- Información pendiente de registro.
- Información presentada y observada.
- Bienes patrimoniales confirmados y no confirmados.
- Diferencias patrimoniales reportadas.
- Documentos pendientes.
- Anexos completos e incompletos.
- Estado de las entregas.
- Reportes en PDF y Excel.

### 7.12. Expediente digital

Cada centro de costo contará con un expediente que agrupe sus informes, anexos, evidencias, observaciones, constancias y actas.

La información consolidada conservará referencias a los registros originales obtenidos desde SGD y SIGA.

## 8. REGLAS DE NEGOCIO

**RN-01. Fuente organizacional.** El SGD será la fuente principal de la estructura institucional y asignaciones disponibles, sujeta a validación con la organización vigente.

**RN-02. Responsabilidad individual.** Cada servidor verificará y complementará la información que le corresponda.

**RN-03. Información precargada.** Los datos obtenidos del SGD y SIGA deberán identificarse por su fuente y fecha de extracción.

**RN-04. Verificación patrimonial.** Cada bien importado deberá permitir confirmar si el servidor lo tiene físicamente.

**RN-05. Ausencia de bienes.** Si un usuario declara que no tiene un bien asignado, deberá registrar una observación.

**RN-06. Registros oficiales.** Las declaraciones de los usuarios no modificarán automáticamente los registros originales del SGD o SIGA.

**RN-07. Documentación física.** La información no disponible digitalmente será registrada manualmente.

**RN-08. Jerarquía.** Las entregas seguirán las relaciones de dependencia configuradas.

**RN-09. Consolidación.** La integración de registros conservará su origen y responsable.

**RN-10. Observaciones.** Los usuarios autorizados podrán formular observaciones y solicitar subsanaciones.

**RN-11. Anexos.** Los formularios deberán conservar correspondencia con la versión aprobada de la directiva.

**RN-12. Fecha de corte.** La información deberá identificarse con la fecha a la que corresponde.

**RN-13. Cierre.** Los expedientes cerrados no podrán ser modificados directamente sin un procedimiento autorizado.

**RN-14. Auditoría.** Las operaciones relevantes deberán conservar usuario, fecha, hora y registro afectado.

## 9. REQUERIMIENTOS TÉCNICOS

Se propone una aplicación web independiente, construida con tecnologías que permitan un desarrollo ágil y mantenimiento sencillo.

**Tecnologías sugeridas:**

- Backend: Laravel.
- Base de datos: PostgreSQL.
- Interfaz web: Blade o Vue.js.
- Reportes: PDF y Excel.
- Almacenamiento seguro de evidencias documentales.
- Autenticación institucional o integración con el SSO existente, cuando resulte viable.

### 9.1. Integraciones

Las conexiones con el SGD y SIGA deberán utilizar mecanismos de acceso autorizados, preferentemente de solo lectura.

El sistema tendrá una base propia para almacenar los registros del proceso, las verificaciones, observaciones y consolidaciones, sin alterar los sistemas de origen.

Se contemplará el uso de archivos Excel para importar información cuando no sea posible implementar una conexión directa en el plazo disponible.

## 10. PRIORIZACIÓN DE DESARROLLO

### Prioridad 1 — Funcionamiento esencial

- Importación de estructura organizacional y usuarios desde SGD.
- Configuración de roles y dependencias.
- Formularios digitales de anexos.
- Importación del inventario desde SIGA o mediante archivos de exportación.
- Verificación individual de bienes.
- Registro manual de documentación física.
- Entrega y consolidación jerárquica.
- Observaciones y subsanaciones.
- Generación de informes y anexos.
- Panel básico de avance.

### Prioridad 2 — Formalización

- Generación de actas.
- Consolidación institucional.
- Cierre de expedientes.
- Reportes finales.
- Custodia de documentos sustentatorios.
- Registro de firmas o documentos suscritos.

### Prioridad 3 — Integraciones complementarias

Sujetas a evaluación técnica y disponibilidad:

- Consulta directa de documentos y expedientes desde SGD.
- Automatización de información para anexos documentarios.
- Integración directa con el SIGA.
- Firma digital integrada.
- Validaciones cruzadas adicionales.

## 11. ENTREGABLES

El sistema deberá permitir obtener:

1. Informe de gestión por centro de costo.
2. Inventario de acervo documentario.
3. Inventario patrimonial con resultados de verificación.
4. Relación de personal.
5. Inventario de bienes no patrimoniales.
6. Relación de documentos pendientes.
7. Actas de transferencia administrativa.
8. Reportes de observaciones.
9. Reportes de avance por dependencia.
10. Consolidado institucional.
11. Expediente digital de cada dependencia.

## 12. CRITERIOS DE ACEPTACIÓN

La implementación esencial deberá demostrar que:

- La estructura organizacional y el personal pueden cargarse desde los registros del SGD.
- Cada servidor visualiza la información que le corresponde.
- Los bienes provenientes del SIGA pueden ser verificados individualmente.
- Los bienes declarados como no disponibles generan observaciones.
- Los servidores pueden registrar documentación física y otros datos faltantes.
- Los responsables pueden revisar, observar y consolidar información.
- La información puede transferirse correctamente entre niveles organizacionales.
- Se pueden generar los anexos y documentos correspondientes.
- El ETTS puede consultar y utilizar la información institucional consolidada.
- Los registros conservan su fuente, responsable, fecha y trazabilidad.

## 13. CONSIDERACIONES FINALES

La propuesta prioriza el aprovechamiento de los sistemas institucionales existentes para evitar trabajo administrativo innecesario.

El SGD proporcionará la base organizacional y la información documentaria disponible; el SIGA facilitará la obtención de los inventarios patrimoniales; y los servidores se encargarán de verificar, complementar y sustentar la información correspondiente a sus responsabilidades.

El procedimiento de entrega se desarrollará de forma jerárquica, permitiendo la consolidación progresiva de información hasta los niveles superiores de la municipalidad.

El sistema tendrá un alcance específico para la transferencia de gestión de 2026 y se desarrollará priorizando los componentes indispensables para ejecutar el procedimiento en los plazos disponibles.

**La propuesta queda sujeta a los ajustes derivados de la aprobación definitiva de la directiva y de la validación técnica de los mecanismos de acceso al SGD y al SIGA.**