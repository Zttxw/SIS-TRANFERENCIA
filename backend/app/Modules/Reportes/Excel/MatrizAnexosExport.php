<?php

declare(strict_types=1);

namespace App\Modules\Reportes\Excel;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;

/**
 * Hoja Excel del Reporte 1 (Matriz de anexos y avance). Recibe las filas del
 * ReportesService y las vuelca a columnas; la presencia de anexo se muestra como
 * «Sí»/«—» para legibilidad de quien hace seguimiento.
 */
class MatrizAnexosExport implements FromArray, ShouldAutoSize, WithHeadings, WithTitle
{
    /** @param array{filas: list<array<string, mixed>>} $data */
    public function __construct(private readonly array $data) {}

    public function title(): string
    {
        return 'Matriz de anexos';
    }

    /** @return list<string> */
    public function headings(): array
    {
        return [
            'Código', 'Centro de costo', 'Nivel', 'Encargado', 'Estado entrega',
            'A02', 'A03-A', 'A03-B', 'A04', 'A05', 'A06',
            'Obs. vigentes', 'Bienes', 'Verificados', '% Patrimonio',
        ];
    }

    /** @return list<list<mixed>> */
    public function array(): array
    {
        return array_map(fn (array $f): array => [
            $f['codigo'],
            $f['nombre'],
            $f['nivel'],
            $f['encargado'] ?? '',
            ucfirst((string) $f['estado_entrega']),
            $this->etiquetaEstadoAnexo($f['anexo_02'] ?? null),
            $this->etiquetaEstadoAnexo($f['anexo_03a'] ?? null),
            $this->etiquetaEstadoAnexo($f['anexo_03b'] ?? null),
            $this->etiquetaEstadoAnexo($f['anexo_04'] ?? null),
            $this->etiquetaEstadoAnexo($f['anexo_05'] ?? null),
            $this->etiquetaEstadoAnexo($f['anexo_06'] ?? null),
            $f['observaciones_vigentes'],
            $f['patrimonio_total'],
            $f['patrimonio_confirmados'],
            $f['patrimonio_porcentaje'].' %',
        ], $this->data['filas']);
    }

    private function etiquetaEstadoAnexo(mixed $valor): string
    {
        if ($valor === 'firmado' || $valor === 'entregado') {
            return 'Entregado';
        }
        if ($valor === 'generado' || $valor === true || $valor === 'si') {
            return 'Sí';
        }

        return '—';
    }
}
