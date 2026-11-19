<?php

declare(strict_types=1);

namespace App\Modules\Reportes\Excel;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;

/**
 * Hoja Excel del Reporte 4 (resultado de la verificación por CC, RF-55).
 */
class VerificacionExport implements FromArray, ShouldAutoSize, WithHeadings, WithTitle
{
    /** @param array{filas: list<array<string, mixed>>} $data */
    public function __construct(private readonly array $data) {}

    public function title(): string
    {
        return 'Verificación';
    }

    /** @return list<string> */
    public function headings(): array
    {
        return [
            'Código', 'Centro de costo', 'Estado', 'Anexos faltantes', 'Bienes sin conformidad',
            'Observaciones', 'Aceptada', 'Aceptó', 'En calidad de', 'Constancia de lo revisado',
        ];
    }

    /** @return list<list<mixed>> */
    public function array(): array
    {
        return array_map(fn (array $f): array => [
            $f['codigo'],
            $f['nombre'],
            $f['estado_etiqueta'],
            implode(', ', $f['anexos_faltantes']),
            $f['bienes_sin_conformidad'],
            $f['observaciones'],
            $f['verificada_en'] ?? '',
            $f['verificada_por'] ?? '',
            $f['en_calidad_de'] ?? '',
            $f['resultado_verificacion'] ?? '',
        ], $this->data['filas']);
    }
}
