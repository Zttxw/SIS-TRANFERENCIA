<?php

declare(strict_types=1);

namespace App\Modules\Acervo\Services;

use App\Modules\Acervo\Models\AcervoDocumental;
use App\Modules\Organization\Models\Dependencia;
use App\Support\Enums\TipoAcervo;
use App\Support\Services\ContextoTransferencia;
use App\Support\Services\PdfService;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * PDF oficial del acervo documentario: el Anexo 03-A (físico, en folios) y el
 * Anexo 03-B (digital del SGD, en número de documentos) son documentos
 * distintos con la misma plantilla, cada uno con sus bloques por año.
 */
class AcervoPdf
{
    public function __construct(
        private readonly ContextoTransferencia $contexto,
        private readonly PdfService $pdf,
    ) {}

    public function descargar(int $dependenciaId, TipoAcervo $tipo): StreamedResponse
    {
        $datos = $this->datos($dependenciaId, $tipo);
        $contexto = $datos['contexto'];
        $codigo = str_replace('.', '', (string) ($contexto['dependencia']['codigo'] ?? 's-c'));
        $sufijo = ($contexto['es_borrador'] ?? false) ? '-BORRADOR' : '';

        return $this->pdf->descargar('pdf.anexo03', $datos, "Anexo{$tipo->sufijoArchivo()}-{$codigo}{$sufijo}.pdf");
    }

    /** @return array<string, mixed> */
    public function datos(int $dependenciaId, TipoAcervo $tipo): array
    {
        $contexto = $this->contexto->paraDependencia($dependenciaId);
        $dep = Dependencia::with('encargado')->find($dependenciaId);

        $series = AcervoDocumental::query()
            ->where('dependencia_id', $dependenciaId)
            ->where('proceso_transferencia_id', $contexto['proceso_id'])
            ->delTipo($tipo)
            ->orderBy('serie_documental')
            ->get();

        return [
            'contexto' => $contexto,
            'titulo' => "{$tipo->anexo()} — {$tipo->titulo()}",
            'cabecera' => [
                'dependencia' => $dep?->nombre ?? '',
                'encargado' => $dep?->encargado
                    ? trim("{$dep->encargado->nombres} {$dep->encargado->apellidos}")
                    : '',
            ],
            'columna_cantidad' => $tipo->columnaCantidad(),
            'grupos' => $this->agruparPorAnio($series, $tipo),
        ];
    }

    /**
     * Bloques por año, del más reciente al más antiguo; «Sin año» al final.
     *
     * @param  Collection<int, AcervoDocumental>  $series
     * @return list<array{anio: string, series: list<array{serie_documental: string|null, cantidad: int|null, unidad_conservacion: string|null, ubicacion: string|null}>}>
     */
    private function agruparPorAnio(Collection $series, TipoAcervo $tipo): array
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
                    'cantidad' => $tipo === TipoAcervo::DIGITAL ? $serie->numero_documentos : $serie->folios,
                    'unidad_conservacion' => $serie->unidad_conservacion,
                    'ubicacion' => $serie->ubicacion,
                ])->values()->all(),
            ])
            ->values()
            ->all();
    }
}
