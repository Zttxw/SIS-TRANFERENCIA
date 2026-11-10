<?php

declare(strict_types=1);

namespace App\Modules\NoPatrimonial\Services;

use App\Modules\NoPatrimonial\Models\BienNoPatrimonial;
use App\Modules\Organization\Models\Dependencia;
use App\Support\Services\ContextoTransferencia;
use App\Support\Services\PdfService;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * PDF oficial del Anexo 06 (Bienes No Patrimoniales). El estado de conservación
 * se consigna como B / R / M según el formato (ver EstadoConservacion::siglaBRM).
 */
class NoPatrimonialPdf
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

        return $this->pdf->descargar('pdf.anexo06', $datos, "Anexo06-NoPatrimonial-{$codigo}{$sufijo}.pdf");
    }

    /** @return array<string, mixed> */
    public function datos(int $dependenciaId): array
    {
        $contexto = $this->contexto->paraDependencia($dependenciaId);
        $dep = Dependencia::with('encargado')->find($dependenciaId);

        $registros = BienNoPatrimonial::where('dependencia_id', $dependenciaId)
            ->where('proceso_transferencia_id', $contexto['proceso_id'])
            ->orderBy('denominacion')
            ->get();

        return [
            'contexto' => $contexto,
            'cabecera' => [
                'dependencia' => $dep?->nombre ?? '',
                'encargado' => $dep?->encargado
                    ? trim("{$dep->encargado->nombres} {$dep->encargado->apellidos}")
                    : '',
            ],
            'bienes' => $registros->map(fn (BienNoPatrimonial $b): array => [
                'descripcion' => trim("{$b->denominacion} {$b->descripcion}"),
                'unidad_medida' => $b->unidad_medida,
                'cantidad' => $b->cantidad,
                'estado' => $b->estado_conservacion?->siglaBRM() ?? '',
                'ubicacion' => $b->ubicacion,
                'observaciones' => $b->observaciones,
            ])->all(),
        ];
    }
}
