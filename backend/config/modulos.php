<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Módulos que se pueden apagar sin retirar su código
|--------------------------------------------------------------------------
|
| documentos_pendientes: indicadores de documentos pendientes del SGD fuera del
| Anexo 02 (tarjeta del dashboard, tablero operativo, organigrama, filtro de
| observaciones y drill-down). Apagado, se ocultan y el drill-down responde 404.
| La sección IV del Anexo 02 y su pantalla de apoyo quedan siempre activas.
|
*/

return [
    'documentos_pendientes' => (bool) env('MODULO_DOCUMENTOS_PENDIENTES', false),
];
