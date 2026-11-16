# Preparación del despliegue de SIS Transferencia

Fecha de revisión: 16 de noviembre de 2026. Estado: código e ingestas aplicados a SIS Transferencia en el servidor; endurecimiento del stack y cotejo físico pendientes.

## Aplicación en servicio, 16 de noviembre

- Se desplegó `main` en el commit `fad5c4f`. La rama de firma quedó integrada. Se usó modo mantenimiento únicamente para SIS Transferencia; ningún contenedor de los otros tres proyectos se reinició.
- Respaldo previo restaurado y comprobado: `/home/siracom/backups/sis-transferencia/db-20261116-141449.dump`. También se guardaron archivos y configuración en el mismo directorio. No se vació ninguna tabla ni se recreó la base en servicio.
- Se aplicaron cuatro migraciones y se retiraron lógicamente los 48 nodos SIGA vacíos. La estructura tiene una raíz activa (`00001`, Alcaldía) y ninguna unidad activa con padre inactivo.
- Se repitió la ingesta desde las fuentes oficiales para el proceso 1: SGD, 158 dependencias, 645 servidores, 82 tipos, 18 estados, 1 133 agregados de acervo y 6 413 pendientes al terminar; SIGA, 59 centros y 6 302 bienes. El total de pendientes cambia mientras opera el SGD.
- Los 6 302 bienes quedaron con fecha de extracción de hoy. Hay 0 sin dependencia, 0 cuyo centro SIGA difiere del código de la dependencia y 0 vinculados a una unidad inactiva.
- `GET /` respondió 200 y la API respondió 401 para una petición sin autenticación con `Accept: application/json`. Los contenedores de los otros tres proyectos continuaron en ejecución.
- La ubicación física sigue sin verificarse: los 6 302 bienes tienen `ubicacion` sin completar. Patrimonio debe cotejar A/B durante la verificación; el centro de costo del SIGA no prueba dónde está el equipo.
- El Compose actual todavía publica Vite de desarrollo y PostgreSQL en puertos del host. La aplicación funciona, pero esta configuración requiere endurecimiento antes de considerarla una operación productiva definitiva. Una petición API sin cabecera `Accept: application/json` devolvió 500 por ausencia de ruta `login`; el cliente React sí envía esa cabecera.

## Ensayo del 16 de noviembre

- La base de SIS Transferencia se respaldó y se restauró correctamente en una base temporal. No se modificaron las bases ni los contenedores de los otros tres sistemas.
- Las 275 pruebas backend pasaron (1 250 aserciones), y el frontend compiló en el directorio de ensayo.
- En la copia se aplicaron cuatro migraciones pendientes y se retiraron lógicamente 48 raíces SIGA vacías. Quedó una sola raíz activa: Alcaldía `00001`.
- La ingesta SGD oficial devolvió 158 dependencias, 645 servidores y 6 420 documentos pendientes. La ingesta SIGA oficial devolvió 6 302 bienes para 59 centros mapeados.
- El `JOIN` con la tabla `MARCA` duplicaba 224 filas por un código de marca con dos nombres. La consulta se corrigió para elegir un nombre de manera determinista; una nueva ingesta de ensayo devolvió 6 302 filas únicas. Los 6 302 bienes quedaron vinculados a un centro SIGA coincidente con su dependencia local.
- Aún falta aplicar los cambios a la base en servicio y comprobar la ubicación física de los equipos con Patrimonio.

## Estado de las ramas

- `main` es la rama de destino. En el repositorio local, `main` tiene seis commits exclusivos respecto de `feature/firma-peru-v2` y la rama de firma tiene uno exclusivo (`52f10ab`). Por tanto, `main` **no contiene todo** lo de la rama de firma.
- El commit exclusivo corrige la aparición de dos raíces en el organigrama: desactiva el pliego SGD `01`, conserva `00001` como Alcaldía y sitúa `01.01` bajo ella. La integración local en `main` se preparó sin conflictos; hay que verificarla antes de usarla en producción. No basta con seleccionar la rama por nombre.
- Los cambios posteriores de `main` incluyen flujo de ETTE, cronograma, firma y presentación. La integración se hará conservando esos cambios y comprobando la historia y la prueba del organigrama.
- Los archivos locales sin seguimiento, incluidos los `.env.servidor` y los archivos de asignaciones, son material de trabajo local: no se incluirán en Git ni en el paquete de despliegue sin revisión individual. No registrar secretos en este documento ni en logs.

## Hallazgos de datos

1. **SGD y SIGA comparten una dependencia maestra por mapeo**: `MapeoDependenciasSigaSeeder` asigna `codigo_siga` a dependencias SGD. `IngestaPatrimonioSiga` coloca el bien en la dependencia cuyo `codigo_siga` coincide. Se preparó una corrección para que un bien sin empate detenga la ingesta, en vez de crear otra raíz SIGA o dejarlo sin oficina. `dependencias:reconciliar-siga` mueve bienes y servidores de duplicados históricos SIGA hacia la maestra y los elimina lógicamente. El mapeo es fijo para el proceso 2026 y tiene 59 pares; debe cotejarse contra el catálogo vigente antes de usarlo.
2. **La adscripción del servidor podía quedar mal**: la ingesta SIGA hacía `updateOrCreate` de servidores por DNI y escribía `dependencia_id` con el centro de costo del bien. Se preparó una corrección que conserva la adscripción de servidores SGD y deja sin adscripción inferida a los que solo aparecen en SIGA. El bien y el servidor requieren validaciones separadas. Falta ejecutar la prueba de regresión con PHP 8.4.
3. **La ubicación física no está demostrada por el centro de costo**: el conector SIGA consulta `CENTRO_COSTO` pero no trae `UBICACION` a la ingesta. El campo `bienes_patrimoniales.ubicacion` lo completa la verificación física. Un bien asignado a A y encontrado en B debe quedar como discrepancia trazable, no reasignarse automáticamente a B ni ocultarse bajo A. La aceptación exige cotejo físico o una fuente institucional confiable de ubicación real.
4. **Vigencia**: SGD y SIGA se leen al ejecutar sus comandos, salvo `siga:ingestar --sqlite`, que usa una réplica local y no sirve para afirmar que los datos son actuales. SGD actualiza los pendientes y poda los que ya no están pendientes; SIGA actualiza los bienes presentes pero no retira automáticamente los bienes que dejaron de venir en la fuente. Es necesario medir fecha de extracción y conciliar ausentes antes de publicar.
5. **Organigrama**: la API muestra dependencias activas del proceso. La corrección exclusiva de la rama de firma se incorporó a la preparación local de `main`. Se ajustó la migración para enlazar Concejo con Alcaldía dentro del mismo proceso y no reactivar unidades que el SGD dio de baja. Los nodos SIGA históricos requieren auditoría y reconciliación; el árbol único no está acreditado con datos de producción. Falta prueba de regresión con PHP 8.4.

## Verificación local realizada

- El merge de `feature/firma-peru-v2` hacia `main` se preparó con `--no-commit`: Git informó integración automática sin conflictos.
- `npm.cmd run build` del frontend terminó correctamente (TypeScript y Vite).
- `php -l` de los archivos PHP modificados y `vendor/bin/pint --dirty --format agent` terminaron correctamente.
- `php artisan boost:install` y las pruebas Laravel no arrancan en esta terminal: Composer exige PHP `>=8.4.1` y el único PHP local es 8.3.33. El paquete Boost y las reglas generadas ya están presentes. Queda pendiente ejecutar la suite con PHP 8.4.
- No se ha consultado SGD ni SIGA en vivo, ni se ha ejecutado ingesta, migración o seeder sobre datos reales.

## Preparación antes de tocar el servidor

- Integrar la corrección del organigrama en `main`, revisar conflictos y ejecutar pruebas de organización, patrimonio, firma y compilación del frontend. Registrar commit exacto de salida; desplegar ese SHA, no una rama móvil.
- Revisar y corregir la ingesta de servidores SIGA para que no reemplace la adscripción del SGD por la del bien. Verificar con casos de un servidor que custodia bienes de dos centros de costo y de un bien sin centro de costo mapeado.
- Disponer de una verificación de calidad por proceso: centros SIGA sin mapeo, dependencias duplicadas, bienes sin dependencia, bienes con dependencia distinta del centro SIGA, servidores cuya dependencia cambió tras SIGA, fechas `extraido_en`, y bienes antes importados que ya no aparecen en SIGA. La nueva `fuente_referencia` del bien conserva el centro SIGA para la auditoría; los bienes históricos aún deben cotejarse con la fuente.
- Confirmar con Patrimonio qué significa `CENTRO_COSTO` en la fuente y cómo se prueba la oficina física del equipo. La discrepancia A/B se conserva para revisión; no se corrige con una regla inventada.
- Usar PHP 8.4 y extensiones necesarias. La terminal local tiene PHP 8.3; el `composer.json` exige `^8.4`. El Dockerfile usa PHP 8.4, pero el Docker local no está disponible para estas pruebas.
- Preparar un despliegue aislado: nombre de proyecto Compose exclusivo, nombres de contenedor y volúmenes exclusivos, red exclusiva, base de datos exclusiva, puerto HTTP de escucha en `127.0.0.1` o detrás del proxy existente, sin publicar PostgreSQL ni Vite. El `docker-compose.yml` actual sirve para desarrollo y publica web, Vite y PostgreSQL; no debe levantarse tal cual en el servidor con otros tres sistemas.
- Preparar build estático del frontend, variables de producción y HTTPS del dominio asignado. Revisar CORS, `APP_URL`, `APP_ENV=production`, `APP_DEBUG=false`, correo, almacenamiento privado y configuración de Firma Perú. No reutilizar certificados de prueba ni subir archivos `.env` al repositorio.

## Secuencia propuesta cuando vuelva el servidor

1. Inventariar por SSH los tres sistemas existentes **solo lectura**: servicios, proxy, puertos, proyectos Compose, nombres de contenedores/volúmenes/redes, rutas y recursos. Elegir rutas y nombres sin colisiones. Confirmar dominio y acceso de solo lectura a SGD/SIGA.
2. Obtener una copia restaurable de la base de SIS Transferencia y de sus archivos privados; registrar hora y tamaño. Verificar restauración en entorno aislado. No modificar las bases de los otros sistemas.
3. Desplegar el SHA aprobado en directorio propio. Construir imágenes y frontend; validar configuración de producción y conectividad antes de exponer el proxy. Ejecutar `migrate --force` tras revisar `migrate:status`, la lista SQL de migraciones pendientes y el respaldo.
4. Seleccionar explícitamente `--proceso=ID`. Probar conectividad a SGD y SIGA oficiales. Ejecutar SGD organizacional, catálogos y documental; aplicar el mapeo SIGA del proceso correcto; ejecutar SIGA oficial **sin** `--sqlite`; comparar métricas y fechas. La reconciliación SIGA se ejecuta primero con `--dry-run` y solo después de revisar los movimientos propuestos. Evitar `db:seed` completo en producción.
5. Pasar los controles de calidad anteriores. Revisar una muestra de equipos por oficina con Patrimonio y contrastar centro de costo, responsable y ubicación física. Si hay equipos asignados a A pero localizados en B, registrar la discrepancia y decidir la corrección con el área dueña de datos.
6. Activar el proxy únicamente tras aprobar pruebas funcionales: autenticación, un solo árbol del organigrama, anexos, PDF, firma, permisos y métricas de ingesta. Registrar hora, SHA, versiones, conteos y responsables.
7. Reversión: retirar la ruta del proxy de SIS Transferencia, volver a la versión anterior de su aplicación y restaurar **solo su** base/archivos desde el respaldo si las migraciones o la ingesta lo requieren. Mantener intactos los tres sistemas existentes.

## Información pendiente del servidor

Se necesitan dominio, sistema operativo, método de despliegue existente, proxy, puertos disponibles, ubicación de datos persistentes, recursos, versión de Docker/Compose o PHP, credenciales entregadas por canal seguro y alcance autorizado de las bases SGD/SIGA. La inspección SSH decidirá la configuración final; ningún puerto o ruta de producción se presume aquí.
