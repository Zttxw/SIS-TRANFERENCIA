<?php

declare(strict_types=1);

namespace App\Modules\Auth\Excel;

use Maatwebsite\Excel\Concerns\Export;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;

/**
 * Plantilla de carga de coordinadores ETTE (D-10): una hoja para llenar y una
 * hoja de consulta con los centros de costo del Anexo 01.
 */
class DelegadosPlantillaExport implements Export, WithMultipleSheets
{
    /** @param list<array{codigo: string, nombre: string, nivel: ?int, padre: ?string}> $centros */
    public function __construct(private readonly array $centros) {}

    /** @return list<object> */
    public function sheets(): array
    {
        return [
            new CoordinadoresHojaExport,
            new CentrosCostoHojaExport($this->centros),
        ];
    }
}
