<?php

declare(strict_types=1);

namespace App\Modules\Auth\Excel;

use Maatwebsite\Excel\Concerns\Import;
use Maatwebsite\Excel\Concerns\SkipsEmptyRows;

/**
 * Lectura en crudo de la plantilla de coordinadores ETTE (D-10). Las columnas se
 * reconocen por su encabezado en ImportacionDelegadosService, no aquí.
 */
class DelegadosImport implements Import, SkipsEmptyRows {}
