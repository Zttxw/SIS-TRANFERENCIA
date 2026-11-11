# Contrato API Firma Perú v2 — v1

Contrato para que frontend y backend avancen en paralelo. Las rutas de este
documento son el objetivo acordado, NO una afirmación de que ya estén implementadas.
Consultar el buzón Codex para conocer disponibilidad. Prefijo: `/api/firmaperu`.
Se usa el cliente API actual, con el envoltorio `ApiResponse` del proyecto.

## Preparar una sesión (autenticado)

`POST /preparar` con permiso `anexos.registrar` y ámbito de dependencia.

```json
{"tipo_documento":"anexo03","dependencia_id":12}
```

Tipos iniciales: `anexo02`, `anexo03`, `anexo04`, `anexo05`, `anexo06`, `anexo07`.
`acta` puede normalizarse a `anexo07`. No ofrecer `anexo01` en esta etapa.

Respuesta `201`:

```json
{
  "success": true,
  "message": "Sesión de firma preparada.",
  "data": {
    "sesion_id": "uuid",
    "param_token": "token-efimero",
    "param_url": "https://backend.example/api/firmaperu/param",
    "document_extension": "pdf",
    "expires_at": "2026-11-11T20:00:00Z"
  }
}
```

El envoltorio corresponde a `ApiResponse.php`. Usar `param_url` recibido, sin reconstruirlo desde Vite.
Codificar en Base64 UTF-8 solo `{param_url,param_token,document_extension}` y llamar
a `startSignature(48596, parametrosBase64)`.

Errores: 401 sin sesión, 403 permiso/ámbito, 422 datos inválidos, 409 documento no
disponible según restricciones existentes, 503 conector sin configuración.

## Consultar resultado (autenticado)

`GET /sesiones/{sesion_id}` con permiso `anexos.ver` y ámbito.

`data`:

```json
{
  "sesion_id": "uuid",
  "tipo_documento": "anexo03",
  "dependencia_id": 12,
  "estado": "pendiente",
  "expires_at": "2026-11-11T20:00:00Z",
  "documento_id": null,
  "firmado_en": null,
  "mensaje": null
}
```

Estados: `pendiente`, `emitida`, `validando`, `firmada`, `rechazada`, `expirada`.
`documento_id` se informa cuando el firmado está validado y disponible.
Tras `signatureOk`, consultar esta sesión hasta estado terminal, con espera entre
consultas y timeout. No mostrar «firmado» al recibir únicamente el callback.
`signatureCancel` termina la espera en UI; no implica modificar la entrega.

## Consultar documento disponible (autenticado)

`GET /estado/{tipo_documento}/{dependencia_id}` con permiso y ámbito.

`data`: `{firmado:boolean, documento_id:string|null, firmado_en:string|null}`.
Siempre se acota al proceso activo. `firmado` se refiere al PDF conservado;
no implica automáticamente que el contenido editable actual tenga esa firma.
Mostrar «Ver PDF firmado» y fecha; no etiquetar datos editables como firmados.

## Descargar (autenticado)

`GET /documentos/{documento_id}/descargar` → binario `application/pdf`.
Usar la descarga autenticada del proyecto, no `window.open` con un token privado.

## Rutas de intercambio exclusivas del firmador

- `POST /param`: form-urlencoded `param_token`, responde parámetros en Base64.
  Token de parámetros de un solo uso, con vencimiento.
- `GET /documento/{token}`: PDF exacto de esa sesión mediante capacidad efímera.
- `POST /subir-firmado/{token}`: multipart `signed_file`, con capacidad efímera.

Estas rutas no usan Sanctum porque las consume el firmador externo. No deben
convertirse en rutas públicas permanentes para documentos finales. La clave
privada y el PIN del firmante permanecen en su equipo.

## Dependencias frontend

La integración oficial requiere jQuery 3.6.0, `jqFirmaPeru`, `startSignature`,
`signatureInit`, `signatureOk`, `signatureCancel` y `div#addComponent`.
Una sola firma activa por pestaña para evitar sobrescribir callbacks globales.
Restaurar callbacks/limpiar temporizadores al finalizar o desmontar. No hacer que
una caída del script externo impida utilizar el resto de la aplicación.

Referencia: https://resources.firmaperu.gob.pe/documentos/firmador-componente-web.pdf
