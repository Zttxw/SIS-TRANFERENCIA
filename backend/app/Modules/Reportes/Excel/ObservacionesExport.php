<?php

declare(strict_types=1);

namespace App\Modules\Reportes\Excel;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;

/**
 * Hoja Excel del Reporte 3 (Observaciones por dependencia).
 */
class ObservacionesExport implements FromArray, ShouldAutoSize, WithHeadings, WithTitle
{
    /** @param array{filas: list<array<string, mixed>>} $data */
    public function __construct(private readonly array $data) {}

    public function title(): string
    {
        return 'Observaciones';
    }

    /** @return list<string> */
    public function headings(): array
    {
        return ['Código', 'Centro de costo', 'Anexo', 'Observación', 'Estado', 'Autor', 'Registrada', 'Días subsanación'];
    }

    /** @return list<list<mixed>> */
    public function array(): array
    {
        return array_map(fn (array $f): array => [
            $f['codigo'],
            $f['nombre'],
            $f['anexo'],
            $f['descripcion'],
            $f['estado_etiqueta'],
            $f['autor'] ?? '',
            $f['registrada_en'] ?? '',
            $f['dias_subsanacion'] ?? '',
        ], $this->data['filas']);
    }
}
