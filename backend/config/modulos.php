<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Módulos que se pueden apagar sin retirar su código
|--------------------------------------------------------------------------
|
| documentos_pendientes: Reporte de documentos pendientes del SGD. Apagado,
| sus rutas responden 404, el frontend oculta sus pantallas y la sección IV
| del Anexo 02 deja de incluir los documentos pendientes.
|
*/

return [
    'documentos_pendientes' => (bool) env('MODULO_DOCUMENTOS_PENDIENTES', false),
];
