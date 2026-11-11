# Coordinación Firma Perú v2

> ACTUALIZACIÓN VIGENTE: el usuario canceló el trabajo con Gemini. Codex asume
> backend y frontend en `feature/firma-peru-v2`. Los buzones y el worktree de Gemini
> quedan inactivos; no son un requisito para continuar. El plan de coordinación
> que sigue es histórico. La implementación actual se describe en
> [firma-peru-v2.md](firma-peru-v2.md) y el contrato API v2.

## Objetivo y alcance autorizado

Hacer funcionar Firma Perú sobre los PDF actuales. El usuario encargó el conector;
las reglas institucionales sobre cuándo exigir firmas y cómo afectan la remisión
se ajustarán después. No imponer un nuevo requisito de entrega CONSOLIDADA para
los anexos. El acta conserva las restricciones que ya aplica su generador.

Base: `main` / `79d2201`, verificado con `origin/main` el 2026-11-11.
Referencia recuperable: `feature/firma-peru` / `dbebbdb`. No fusionar ese commit
completo ni copiar sus credenciales, plantillas antiguas o composer.lock.

## Carpetas y responsables

- Codex: carpeta principal `C:/Users/Jeanpier/Documents/OTI/Transferencia`, rama
  `feature/firma-peru-v2`. Responsable de backend, contrato e integración.
- Gemini: `C:/Users/Jeanpier/Documents/OTI/Transferencia/.worktrees/firma-peru-frontend`,
  rama `feature/firma-peru-v2-frontend`. Responsable de frontend.
- No cambiar la rama de la carpeta del otro agente. No editar archivos del otro
  responsable sin dejar propuesta y esperar respuesta. Solo Codex integra ramas.
- No subir ramas, fusionar en main ni ejecutar migraciones en la base compartida
  como parte de esta preparación.

## Canal compartido entre worktrees

Los archivos versionados de cada worktree NO se sincronizan automáticamente.
El buzón vivo está en una ruta física común, fuera del versionado:

`C:/Users/Jeanpier/Documents/OTI/Transferencia/.coordination/firma-peru-v2/`

- `codex.md`: solo Codex escribe; Gemini lee.
- `gemini.md`: solo Gemini escribe; Codex lee.
- Cada agente consulta ambos al empezar y antes de cambiar una decisión o hacer
  un commit. Usa identificadores `C-001`, `G-001`, fecha y estado.
- Una propuesta del otro agente no es un acuerdo hasta recibir ACK explícito.
- No hay notificaciones automáticas ni lectura de conversaciones. Si el otro
  agente está inactivo, su respuesta llegará en su siguiente turno.
- Los acuerdos aceptados se incorporan aquí o al contrato mediante un commit.
  El buzón no debe contener secretos, PIN, JWT ni credenciales.

## División de archivos

Codex: `backend/**`, `.gitignore`, este documento y
`docs/contrato-api-firma-peru-v2.md`.

Gemini: `frontend/**` y `docs/firma-peru-v2-frontend.md` (su registro de cambios,
pruebas, pendientes y commits entregables). No modificar backend, lockfiles PHP,
contrato API ni infraestructura. Si necesita cambiar el contrato, proponer en el
buzón antes de implementarlo.

## Decisiones iniciales

1. Reutilizar `PdfService` y los servicios `*Pdf::datos()` de main.
2. Piloto: Anexo 03. Extensión: 02–06 y acta. Anexo 01 requiere generador propio;
   no mostrarlo como soportado antes de que exista.
3. No regenerar un documento firmado para agregar una firma. Usar el PDF firmado
   anterior como entrada y preservar originales.
4. Credenciales únicamente en configuración privada del backend; nunca frontend.
5. La recepción HTTP y el callback `signatureOk` no acreditan una firma válida.
   Mostrar éxito definitivo solo tras consultar el estado confirmado del backend.
6. Conservar permisos y ámbito de main. Descargar documentos finales mediante
   API autenticada; tokens efímeros solo para el intercambio con el firmador.
7. No incorporar nuevas transiciones al flujo de transferencia en esta etapa.

## Entregables y comprobación

- [x] Rama v2 desde main actualizado.
- [x] Canal común y worktree frontend preparados.
- [x] Configuración y autenticación Firma Perú probadas con HTTP simulado.
- [x] Generación binaria reutilizando PDF de main.
- [ ] Endpoints de sesiones, parámetros, recepción y descarga.
- [ ] Frontend integrado por Gemini.
- [ ] Validación del firmado en backend e identidad autorizada.
- [ ] Firma real con certificado y revisión del PDF resultante.

Los checks se marcan solo con evidencia. Un test simulado no sustituye la firma
real. Las pruebas automatizadas usan SQLite y HTTP simulado, nunca la base real.

### Checkpoint backend inicial — 2026-11-11

- Boost 2.10.4 instalado con PHP 8.4.27 del contenedor; guías en
  `backend/AGENTS.md`. No es necesario instalar otro PHP para trabajar aquí.
- `FirmaperuAuthService`: obtiene JWT desde configuración privada, maneja errores
  sin propagar respuestas sensibles, cachea hasta 30 segundos antes de `exp` y
  separa la caché cuando cambian credenciales. Las pruebas usan JWT sintéticos.
- `FirmaperuPdfService`: genera binarios 02–06 con las vistas de main. Reutiliza
  el acta mediante `ActaPdf::datos()`, manteniendo su restricción previa.
- 25 pruebas nuevas aprobadas (52 aserciones) con `php artisan test --compact
  --filter=Firmaperu`, dentro del contenedor. No se conectó con Firma Perú real.
- Comprobación final con las pruebas existentes de anexos y acta: 33 pruebas
  aprobadas, 80 aserciones. Se ejecutaron los cuatro archivos de pruebas
  `AnexosPdfTest`, `ActaTransferenciaTest`, `FirmaperuAuthTest` y `FirmaperuPdfTest`.
- Pint aplicado a los seis archivos PHP del cambio. `--dirty` no está disponible
  dentro del contenedor porque el volumen backend no incluye `.git`; se usaron
  rutas explícitas.
- Siguiente implementación backend: sesiones/documentos persistidos y endpoints
  del contrato. Aún no hay rutas `/firmaperu` operativas ni firma real verificada.
- Instrucción para activar a Gemini: `docs/inicio-gemini-firma-peru-v2.md`, en la
  carpeta principal. El buzón de Gemini sigue pendiente de ACK.

## Instrucción inicial para Gemini

Abre exclusivamente el worktree frontend indicado. Lee AGENTS.md, este documento,
`docs/contrato-api-firma-peru-v2.md`, `docs/patron-anexo-y-errores.md` y los dos
buzones físicos. Confirma recepción en `gemini.md`. Implementa el frontend del
conector con el contrato v1; el backend puede seguir en desarrollo. Recupera de
la rama vieja solo lo útil, adaptándolo al cliente API y diseño de main. Respeta
el ámbito seleccionado, maneja cancelación y timeout, y consulta el estado de la
sesión tras `signatureOk`. Ejecuta build/lint según el proyecto y entrega commits
locales con evidencias. No fusiones ni publiques. El usuario ha autorizado esta
colaboración; no necesitas pedirle confirmación para empezar tu parte.
