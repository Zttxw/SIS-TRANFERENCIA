<?php

declare(strict_types=1);

namespace App\Modules\Acervo\Services;

use App\Modules\Acervo\Models\AcervoDocumental;
use App\Modules\Organization\Models\Dependencia;
use App\Support\Services\ContextoTransferencia;
use App\Support\Services\PdfService;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * PDF oficial del Anexo 03 (Acervo Documentario), agrupado por año como el
 * formato de la directiva. Recupera también los años de los periodos de texto
 * anteriores, igual que la vista «Por año» del frontend.
 */
class AcervoPdf
{
    public function __construct(
        private readonly ContextoTransferencia $contexto,
        private readonly PdfService $pdf,
    ) {}

    public function descargar(int $dependenciaId): StreamedResponse
    {
        $datos = $this->datos($dependenciaId);
        $contexto = $datos['contexto'];
        $codigo = str_replace('.', '', (string) ($contexto['dependencia']['codigo'] ?? 's-c'));
        $sufijo = ($contexto['es_borrador'] ?? false) ? '-BORRADOR' : '';

        return $this->pdf->descargar('pdf.anexo03', $datos, "Anexo03-Acervo-{$codigo}{$sufijo}.pdf");
    }

    /** @return array<string, mixed> */
    public function datos(int $dependenciaId): array
    {
        $contexto = $this->contexto->paraDependencia($dependenciaId);
        $dep = Dependencia::with('encargado')->find($dependenciaId);

        $series = AcervoDocumental::where('dependencia_id', $dependenciaId)
            ->where('proceso_transferencia_id', $contexto['proceso_id'])
            ->orderBy('serie_documental')
            ->get();

        return [
            'contexto' => $contexto,
            'cabecera' => [
                'dependencia' => $dep?->nombre ?? '',
                'encargado' => $dep?->encargado
                    ? trim("{$dep->encargado->nombres} {$dep->encargado->apellidos}")
                    : '',
            ],
            'grupos' => $this->agruparPorAnio($series),
        ];
    }

    /**
     * @param  Collection<int, AcervoDocumental>  $series
     * @return list<array{anio: string, series: list<array<string, mixed>>}>
     */
    private function agruparPorAnio($series): array
    {
        $grupos = [];

        foreach ($series as $serie) {
            preg_match_all('/\b(?:19|20)\d{2}\b/', $serie->periodo ?? '', $coincidencias);
            $anios = $coincidencias[0];
            $desde = $serie->desde_anio ?? $serie->anio ?? (isset($anios[0]) ? (int) $anios[0] : null);
            $hasta = $serie->hasta_anio ?? (isset($anios[1]) ? (int) $anios[1] : $desde);
            $anio = $serie->anio ?? $desde;
            $clave = $anio ? (string) $anio : 'Sin año';

            $grupos[$clave][] = [
                'serie_documental' => $serie->serie_documental,
                'desde_anio' => $desde,
                'hasta_anio' => $hasta,
                'cantidad_unidades' => $serie->cantidad_unidades,
                'unidad_conservacion' => $serie->unidad_conservacion,
                'ubicacion' => $serie->ubicacion,
            ];
        }

        // Orden descendente por año; «Sin año» al final.
        uksort($grupos, function (string $a, string $b): int {
            if ($a === 'Sin año') {
                return 1;
            }
            if ($b === 'Sin año') {
                return -1;
            }

            return (int) $b <=> (int) $a;
        });

        return array_map(
            fn (string $anio, array $filas): array => ['anio' => $anio, 'series' => $filas],
            array_keys($grupos),
            array_values($grupos),
        );
    }
}
