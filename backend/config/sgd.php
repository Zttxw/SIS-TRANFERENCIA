<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Integración con el SGD (Sistema de Gestión Documentaria)
|--------------------------------------------------------------------------
|
| El SGD es la fuente principal de la estructura organizacional y del padrón
| de personal (plan §4.1, RN-01). El acceso es de SOLO LECTURA: la ingesta
| copia datos hacia las tablas de dominio sin alterar el origen (RN-06).
|
| La conexión `sgd` (SQL Server) se define en config/database.php. El driver
| pdo_sqlsrv solo está disponible en el host (no en el contenedor Alpine), por
| lo que el comando `sgd:ingestar` se ejecuta desde el host.
|
*/

return [
    'connection' => 'sgd',
    'schema' => env('SGD_DB_SCHEMA', 'IDOSGD'),
];
