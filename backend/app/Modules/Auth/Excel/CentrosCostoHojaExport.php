<?php

declare(strict_types=1);

namespace App\Modules\Auth\Excel;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;

/**
 * Hoja de consulta con los centros de costo del Anexo 01.
 */
class CentrosCostoHojaExport implements FromArray, ShouldAutoSize, WithHeadings, WithTitle
{
    /** @param list<array{codigo: string, nombre: string, nivel: ?int, padre: ?string}> $centros */
    public function __construct(private readonly array $centros) {}

    public function title(): string
    {
        return 'Centros de costo (Anexo 01)';
    }

    /** @return list<string> */
    public function headings(): array
    {
        return ['Código CC', 'Centro de costo', 'Nivel', 'CC padre'];
    }

    /** @return list<list<mixed>> */
    public function array(): array
    {
        return array_map(fn (array $c): array => [$c['codigo'], $c['nombre'], $c['nivel'], $c['padre'] ?? ''], $this->centros);
    }
}
