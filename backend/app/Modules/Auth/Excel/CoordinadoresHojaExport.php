<?php

declare(strict_types=1);

namespace App\Modules\Auth\Excel;

use App\Modules\Auth\Services\ImportacionDelegadosService;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;

/**
 * Hoja a llenar. DNI, celular y código CC van como texto para no perder ceros
 * a la izquierda ("07.05", "01234567").
 */
class CoordinadoresHojaExport implements FromArray, WithColumnFormatting, WithColumnWidths, WithHeadings, WithTitle
{
    public function title(): string
    {
        return 'Coordinadores';
    }

    /** @return list<string> */
    public function headings(): array
    {
        return ImportacionDelegadosService::COLUMNAS;
    }

    /** @return list<list<mixed>> */
    public function array(): array
    {
        return [];
    }

    /** @return array<string, string> */
    public function columnFormats(): array
    {
        return [
            'A2:A1000' => NumberFormat::FORMAT_TEXT,
            'E2:E1000' => NumberFormat::FORMAT_TEXT,
            'F2:F1000' => NumberFormat::FORMAT_TEXT,
        ];
    }

    /** @return array<string, int> */
    public function columnWidths(): array
    {
        return ['A' => 12, 'B' => 28, 'C' => 28, 'D' => 30, 'E' => 14, 'F' => 22, 'G' => 40];
    }
}
