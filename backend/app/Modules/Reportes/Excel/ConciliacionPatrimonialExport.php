<?php

declare(strict_types=1);

namespace App\Modules\Reportes\Excel;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;

/**
 * Hoja Excel del Reporte 2 (Conciliación patrimonial SIGA).
 */
class ConciliacionPatrimonialExport implements FromArray, ShouldAutoSize, WithHeadings, WithTitle
{
    /** @param array{filas: list<array<string, mixed>>} $data */
    public function __construct(private readonly array $data) {}

    public function title(): string
    {
        return 'Conciliación patrimonial';
    }

    /** @return list<string> */
    public function headings(): array
    {
        return ['Código', 'Centro de costo', 'Total bienes', 'Verificados', 'Pendientes', '% Avance'];
    }

    /** @return list<list<mixed>> */
    public function array(): array
    {
        return array_map(fn (array $f): array => [
            $f['codigo'],
            $f['nombre'],
            $f['total'],
            $f['confirmados'],
            $f['pendientes'],
            $f['porcentaje'].' %',
        ], $this->data['filas']);
    }
}
