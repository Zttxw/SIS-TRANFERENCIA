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
 * PDF oficial del Anexo 03 (Acervo Documentario): sección A (digital, SGD) y
 * sección B (física, registrada a mano), cada una con sus bloques por año.
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
            'secciones' => [
                [
                    'letra' => 'A',
                    'titulo' => 'Acervo digital (Sistema de Gestión Documental)',
                    'grupos' => $this->agruparPorAnio($series->where('tipo', AcervoDocumental::TIPO_DIGITAL)),
                ],
                [
                    'letra' => 'B',
                    'titulo' => 'Acervo físico',
                    'grupos' => $this->agruparPorAnio($series->where('tipo', AcervoDocumental::TIPO_FISICO)),
                ],
            ],
        ];
    }

    /**
     * Bloques por año, del más reciente al más antiguo; «Sin año» al final.
     *
     * @param  Collection<int, AcervoDocumental>  $series
     * @return list<array{anio: string, series: list<array{serie_documental: string|null, folios: int|null, unidad_conservacion: string|null, ubicacion: string|null}>}>
     */
    private function agruparPorAnio(Collection $series): array
    {
        return $series
            ->groupBy(fn (AcervoDocumental $serie): string => $serie->anio !== null ? (string) $serie->anio : 'Sin año')
            ->sortKeysUsing(function (string $a, string $b): int {
                if ($a === 'Sin año' || $b === 'Sin año') {
                    return ($a === 'Sin año') <=> ($b === 'Sin año');
                }

                return (int) $b <=> (int) $a;
            })
            ->map(fn (Collection $filas, string $anio): array => [
                'anio' => $anio,
                'series' => $filas->map(fn (AcervoDocumental $serie): array => [
                    'serie_documental' => $serie->serie_documental,
                    'folios' => $serie->folios,
                    'unidad_conservacion' => $serie->unidad_conservacion,
                    'ubicacion' => $serie->ubicacion,
                ])->values()->all(),
            ])
            ->values()
            ->all();
    }
}
