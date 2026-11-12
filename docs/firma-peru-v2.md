# Firma Perú v2

Implementación individual de Codex en `feature/firma-peru-v2`, a petición del usuario.
El alcance es integrar la firma. Las reglas institucionales de remisión, revisión,
intervinientes y cierre se ajustarán posteriormente.

## Implementado

- Generación de PDF para anexos 01–07. Se reutilizan los formatos existentes;
  Anexo 01 agrega la relación institucional de centros de costo del proceso.
- Botón de Firma Perú en cada anexo, con carga del cliente bajo demanda.
- Sesiones UUID y tokens aleatorios distintos para parámetros, descarga y subida.
  Solo se almacenan sus hashes. Parámetros de un solo uso; vencimiento configurable.
- Archivos privados y huellas SHA-256 de originales y firmados. Descarga final
  autenticada y autorizada por dependencia, comprobando la huella conservada.
- Recepción multipart `signed_file`, límite 20 MiB por defecto, comprobación de
  firma CMS, cadena de confianza configurada y DNI del iniciador.
- El certificado personal y su clave privada permanecen en el equipo del usuario.
  Sin CA configurada en el servidor se permite abrir Firma Perú y recibir el PDF:
  se conserva como `pendiente_validacion`, con descarga «PDF recibido · sin verificar».
  No se publica como firma verificada ni se utiliza como base para agregar firmas.
- Agregar firmas sobre el PDF firmado anterior, con una sesión nueva y conservación
  del resultado anterior. Firmar datos actuales genera una nueva copia independiente.
- La UI espera confirmación del backend. `signatureOk` no marca éxito por sí solo.
  Cancelación, timeout, cambio de página y exclusión de firmas simultáneas por pestaña.

Las rutas y cuerpos están descritos en [contrato-api-firma-peru-v2.md](contrato-api-firma-peru-v2.md).
No se recuperaron archivos de credenciales de la rama antigua ni se fusionó su commit.

## Configuración local

El contenedor `backend` ya dispone de PHP 8.4 y OpenSSL. El PHP 8.3 del host no es
compatible con este proyecto. Ejecutar Artisan dentro del contenedor.

Configurar únicamente en `backend/.env`:

```dotenv
FIRMAPERU_CLIENT_ID=valor_institucional
FIRMAPERU_CLIENT_SECRET=valor_institucional
FIRMAPERU_TOKEN_URL=https://servicio-institucional/generate-token
FIRMAPERU_PUBLIC_URL=http://localhost:8000
FIRMAPERU_SESSION_MINUTES=15
FIRMAPERU_MAX_UPLOAD_KB=20480
FIRMAPERU_CA_BUNDLE=/var/www/html/storage/app/private/firmaperu-ca.pem
FIRMAPERU_OPENSSL_BINARY=openssl
```

Usar la URL de autenticación entregada con las credenciales de la institución,
no la URL de ejemplo. `PUBLIC_URL` debe ser accesible desde la computadora del
firmante, sin `/api` final. En producción usar HTTPS y el dominio real del backend.

El archivo CA es un bundle PEM de autoridades aprobadas por la institución. No
agregar automáticamente el certificado recibido a la lista de confianza. La ruta
es la que ve el contenedor; el ejemplo corresponde a
`backend/storage/app/private/firmaperu-ca.pem` en Windows. No versionar credenciales,
archivos privados ni certificados de prueba como autoridades de producción.

`FIRMAPERU_CA_BUNDLE` se necesita para la comprobación adicional del servidor, no
para abrir el firmador ni usar el certificado local del usuario. Cuando se configure,
los archivos recibidos previamente se pueden comprobar sin volver a pedir la firma:

```sh
docker compose exec -T backend php artisan firmaperu:validar-pendientes
```

Para comprobar solo uno, agregar `--id=UUID_DE_LA_SESION`. El comando no publica como
verificado un archivo cuya firma, identidad o confianza resulte inválida.

Migración nueva (solo crea la tabla de sesiones):

```sh
docker compose exec -T backend php artisan migrate --path=database/migrations/2026_11_11_220031_create_firma_sesiones_table.php
docker compose exec -T backend php artisan config:clear
```

Nginx permite cuerpos de hasta 25 MiB para admitir el PDF de 20 MiB y el multipart.
PHP ya tiene un límite de 50 MiB. En un despliegue propio, alinear también los límites
del proxy externo y permitir el acceso del firmador a las rutas efímeras.

## Prueba con certificado institucional

Antes de firmar, el botón **Opciones de firma** comprueba si responde el servicio
local de Firma Perú en el puerto 48596. Chrome firma directamente cuando ese
servicio está abierto y accesible. Si no responde, en Windows se ofrece iniciar
el cliente oficial con Edge y volver a Chrome, o abrir el sistema completo en Edge
como respaldo. Esta última opción conserva la ruta de la página, sin trasladar
parámetros, fragmentos ni la sesión de Chrome: puede requerir iniciar sesión y
volver a seleccionar la dependencia y el anexo. Guarde los cambios antes de cambiar
de navegador. No se agregan extensiones ni FirmaBridge; el cliente oficial sigue
siendo necesario y puede solicitar instalación si falta en el equipo.

En macOS/Linux se ofrece abrir el iniciador Java después de preparar el equipo
según la guía oficial. La comprobación por sí sola no permite distinguir entre una
instalación ausente, un cliente cerrado y un bloqueo del navegador. No crea sesiones
de firma ni envía documentos.

El backend sirve los manifiestos y dependencias oficiales de ClickOnce desde
`/api/firmaperu/cliente/`, conservando sus bytes y tipos de contenido. Solo admite
rutas del paquete oficial y conserva una caché privada: cinco minutos para el
manifiesto inicial y un día para dependencias de versión. No requiere credenciales
del usuario para que Windows pueda descargar los archivos asociados.

La compatibilidad con Chrome utiliza el componente JavaScript oficial y el servicio
local del cliente; no agrega soporte nativo de ClickOnce a Chrome. No se reutilizan
ejecutables, código ni registros de la extensión FirmaBridge. El inicio del cliente
cerrado desde Chrome no está garantizado sin complementos; Edge se ofrece como
iniciador y como navegador de respaldo, sujeto a permisos y políticas del equipo.

Para probar desde una PC sin Firma Perú, abrir el sistema en Chrome y pulsar
«Firmar con Firma Perú». Si el cliente no responde, elegir «Iniciar cliente con
Edge», aceptar la instalación/apertura oficial y volver a Chrome para comprobar
la conexión y firmar. Si no responde allí, elegir «Abrir sistema en Microsoft Edge».
La firma real requiere el certificado correspondiente o DNIe y sus controladores.
Usar una URL accesible desde esa PC, preferiblemente HTTPS; `localhost` corresponde
a esa misma computadora. Clonar la rama no copia credenciales, datos ni `.env`:
para ejecutar el proyecto allí también hay que preparar el entorno y la base de datos.

1. Ingresar con una cuenta con permiso de registro y DNI correspondiente al
   certificado. Para el acta se requiere también `actas.generar`.
2. Guardar los datos del anexo. Tras integrar el flujo de `main`, el acta se puede
   emitir antes de remitir como suscripción de la dependencia; ya no exige una
   entrega consolidada para generar el PDF que se enviará al firmador.
3. Pulsar «Firmar con Firma Perú». Revisar la copia guardada en el firmador,
   posicionar la representación visual y completar la firma en el equipo.
4. Esperar la confirmación del backend. Descargar «PDF firmado» cuando esté
   verificado, o «PDF recibido · sin verificar» si la comprobación está pendiente.
5. Comprobar la firma con un lector/validador institucional. Para una segunda
   firma, otro interviniente inicia sesión con su propia cuenta y pulsa «Agregar firma».

## Certificado vinculado a la cuenta

Al preparar una firma, el servidor conserva el DNI de la cuenta autenticada en
`FirmaSesion.firmante_dni`. El parámetro `certificateFilter` utiliza ese DNI para
filtrar el campo CN del certificado en el cliente oficial. La expresión exige
que el DNI coincida como una secuencia de ocho dígitos completa. El filtro conserva
la identidad capturada al iniciar la sesión de firma.

Al recibir el PDF, el servidor comprueba la firma CMS, la cadena de confianza y
la coincidencia del DNI del certificado con el de la sesión. Para ejecutar esa
comprobación se debe configurar `FIRMAPERU_CA_BUNDLE` con las autoridades de
confianza institucionales. Si esa configuración está pendiente, el PDF queda en
`pendiente_validacion`. La prueba con un certificado institucional real debe
confirmar que su CN incluye el DNI esperado.

El parámetro y el filtro por DNI se describen en la
[guía oficial de integración](https://resources.firmaperu.gob.pe/documentos/firmador-componente-web.pdf).

## Apertura del cliente después de reiniciar Windows

El servicio local se debe iniciar nuevamente después de reiniciar el equipo.
El usuario puede abrir el cliente instalado desde Windows o pulsar «Iniciar
cliente con Edge» y regresar a Chrome cuando el sistema confirme que responde
en el puerto 48596. El iniciador puede comprobar actualizaciones al abrirse.

Para automatizar su apertura al iniciar sesión, soporte puede colocar un acceso
directo al iniciador del cliente en la carpeta que abre `Win + R` → `shell:startup`.
El acceso directo debe abrir el servicio local utilizado por esta integración.
El procedimiento de inicio automático se describe en la
[documentación de Microsoft](https://support.microsoft.com/es-es/windows/experience/startup-boot/configure-startup-applications-in-windows).

## Límites actuales

Se conservan y verifican las revisiones incrementales CMS de los perfiles
`adbe.pkcs7.detached` y `ETSI.CAdES.detached`. Una herramienta que reescriba el PDF
completo será rechazada. La compatibilidad del firmador instalado requiere una
prueba real; los tests no usan DNIe ni certificados institucionales.

El control comprueba bytes, CMS, cadena y coincidencia del DNI en el sujeto del
certificado. No sustituye una validación integral de la estructura PDF, no compara
visualmente revisiones y no consulta revocación OCSP/CRL. La firma solicitada es
nivel B, sin sello de tiempo ni validación LTV. No afirmar una validación IOFE
integral a partir de estos controles.

Las sesiones nuevas se vinculan a `DocumentoFirma`: proceso, dependencia, tipo,
versión y huella del contenido impreso. Cada sesión verificada genera un único
registro `FirmaAnexo`, tanto al recibir el PDF como al verificarlo posteriormente.
La relación única con la sesión evita duplicados. El acta se vincula al modelo
`ActaTransferencia`; los anexos de registros agregados se vinculan a su copia lógica
`DocumentoFirma`. Los PDF se conservan en el almacenamiento privado de la sesión.

La firma del responsable del centro de costo marca su acta vigente como `suscrita`.
La firma del delegado ETTE es opcional y no reemplaza la del responsable; se mantiene
su ámbito exacto y no recibe permiso de edición ni remisión. El bloqueo de remisión
`exige_firma_acta` sigue configurable y apagado por defecto, como en `main`. Cuando
está activo, exige una firma obligatoria del responsable asignado sobre la versión
vigente y comprueba también la vigencia de la sesión v2 vinculada.

Observar una entrega genera la versión de corrección antes de volver a firmar.
Las entregas observadas antiguas se preparan al consultar el acta o intentar remitir.
Reintentar la remisión no incrementa otra vez esa versión. Con el bloqueo activo,
cerrar la última observación deja la entrega observada hasta firmar y remitir
expresamente. Cambiar los datos firmados obliga a preparar otra versión; para el
acta se incluyen también las huellas de los anexos 02–06, aunque su presencia no
cambie. La hora de impresión no crea otra versión. Cambiar la declaración del acta
de suscripción a recepción/consolidación también produce una versión distinta.

Un PDF recibido después de cambiar su contenido o versión se conserva verificado
como histórico (`FirmaSesion.firmada`), con su registro institucional cancelado:
no habilita remisión ni sirve de base para nuevas firmas. La UI lo identifica como
«PDF firmado anterior». Los PDF `pendiente_validacion` no generan hechos de firma.
Las sesiones antiguas sin vínculo de versión se conservan para descarga, pero no
se convierten automáticamente en firmas institucionales ni admiten agregar firmas;
se debe firmar la versión actual para establecer esa vinculación.

Aplicar la migración adicional `integrar_sesiones_con_firmas_anexo` antes de usar
el conector actualizado (`docker compose exec -T backend php artisan migrate`).
La matriz de etapas y suscriptores ETTS adicional a lo definido en `main` sigue
pendiente; no se impone una firma ETTS nueva a cada entrega.
El PDF de expediente regenerado sigue siendo un documento distinto de los anexos
firmados; los originales firmados se descargan individualmente.

## Verificación automatizada

Las pruebas Laravel utilizan SQLite en memoria y HTTP simulado. Las pruebas del
validador generan certificados y firmas CMS efímeros, verifican alteraciones,
identidad y confianza; no representan una firma institucional ni una prueba del
cliente de escritorio.

```sh
docker compose exec -T backend php artisan test --compact --filter=Firmaperu
docker compose exec -T frontend npm run build
docker compose exec -T frontend npm run lint
```

En Windows, con Node 24 (disponible en el equipo), desde `frontend`:

```sh
node --test tests/firmaperu-runtime.test.mjs
node --test tests/equipo-firmaperu.test.mjs
```

La compilación valida TypeScript. Las pruebas Node cubren callbacks, cancelación,
vigencia, limpieza de callbacks y exclusión de operaciones simultáneas.

## Resultado de esta implementación

- Filtro de certificados por DNI de la cuenta aplicado. Las pruebas de sesiones
  y del validador aprobaron 25 casos y 118 aserciones, incluyendo selección del
  DNI esperado, exclusión de otro DNI y rechazo de certificados de otro titular.
  La selección en el cliente oficial con un certificado institucional real queda
  pendiente de comprobación.
- Pruebas del conector aprobadas; la última comprobación de sesiones incluye
  16 pruebas y 101 aserciones, con recepción pendiente, verificación posterior y rechazo.
- Cliente: 7 pruebas aprobadas con Node 24.
- TypeScript y compilación de producción aprobados. Lint sin errores; se mantienen
  las seis advertencias preexistentes en los formularios y componentes de UI.
- Nginx validado y recargado con el límite de subida actualizado.
- Migración de sesiones aplicada en PostgreSQL local. La autorreferencia al PDF
  anterior se crea después de la clave primaria para ser compatible con PostgreSQL.
- Las credenciales institucionales se cargaron localmente desde el archivo del
  usuario y la autenticación real con Firma Perú fue comprobada. La firma real
  desde el equipo del usuario sigue pendiente de probar.
- El inicio ya no exige un bundle CA. Su ausencia mantiene los PDF recibidos
  pendientes de verificación; la confianza institucional se configura después.
- Preparación del equipo y respaldo en Edge: 16 pruebas Node aprobadas entre
  comprobación local y runtime; 66 pruebas Laravel de Firma Perú aprobadas (220 aserciones).
  Manifiesto inicial y manifiesto dependiente comprobados mediante HTTP local.
  La apertura de ClickOnce y la firma con certificado real siguen pendientes.
- Integración de `main` en v2: 171 pruebas backend aprobadas (489 aserciones),
  además de 16 Node. Compilación correcta y lint sin errores; se conservan las
  seis advertencias previas. La prueba de PDF del acta cubre emisión pre-remisión,
  declaración de suscripción de la dependencia y versión inicial.
- Acoplamiento institucional: suite backend de 182 pruebas aprobada (592 aserciones),
  con pruebas de firma obligatoria/opcional, verificación diferida, versión corregida,
  cambios de contenido y cierre de observaciones. La suite específica incorpora
  los casos de firma antigua recibida después de la versión vigente y firma tardía
  de un proceso cerrado. Compilación y 16 pruebas Node aprobadas; lint sin errores.
  Las pruebas de flujo simulan la criptografía y el binario PDF; las pruebas del
  validador continúan comprobando CMS, identidad y confianza por separado.
