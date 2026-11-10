<?php

declare(strict_types=1);

namespace App\Modules\Patrimonio\Services;

use App\Modules\Organization\Models\Dependencia;
use App\Modules\Patrimonio\Models\BienPatrimonial;
use App\Support\Services\ContextoTransferencia;
use App\Support\Services\PdfService;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * PDF oficial del Anexo 04 (Bienes Patrimoniales). La cabecera del formato es el
 * servidor responsable de los bienes: se agrupan los bienes por `servidor_id`
 * (una cabecera + su tabla por cada custodio). El estado proviene de la
 * verificación física; las columnas físicas (color, dimensión, características,
 * código anterior, ubicación) se completan al verificar. Hoja apaisada por ancho.
 */
class PatrimonioPdf
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

        return $this->pdf->descargar(
            'pdf.anexo04',
            $datos,
            "Anexo04-Patrimonio-{$codigo}{$sufijo}.pdf",
            'a4',
            'landscape',
        );
    }

    /** @return array<string, mixed> */
    public function datos(int $dependenciaId): array
    {
        $contexto = $this->contexto->paraDependencia($dependenciaId);
        $dep = Dependencia::find($dependenciaId);

        $bienes = BienPatrimonial::with(['servidor', 'verificacion'])
            ->where('dependencia_id', $dependenciaId)
            ->where('proceso_transferencia_id', $contexto['proceso_id'])
            ->orderBy('servidor_id')
            ->orderBy('codigo_patrimonial')
            ->get();

        return [
            'contexto' => $contexto,
            'cabecera' => ['dependencia' => $dep?->nombre ?? ''],
            'grupos' => $this->agruparPorServidor($bienes),
        ];
    }

    /**
     * @param  Collection<int, BienPatrimonial>  $bienes
     * @return list<array<string, mixed>>
     */
    private function agruparPorServidor($bienes): array
    {
        $grupos = [];

        foreach ($bienes as $bien) {
            $servidor = $bien->servidor;
            $clave = $servidor?->id ?? 0;

            if (! isset($grupos[$clave])) {
                $grupos[$clave] = [
                    'servidor' => [
                        'nombre' => $servidor ? trim("{$servidor->nombres} {$servidor->apellidos}") : '',
                        'dni' => $servidor?->dni ?? '',
                        'cargo' => $servidor?->cargo ?? '',
                    ],
                    'bienes' => [],
                ];
            }

            $grupos[$clave]['bienes'][] = [
                'codigo_patrimonial' => $bien->codigo_patrimonial,
                'denominacion' => $bien->denominacion,
                'estado' => $bien->verificacion?->estado_conservacion?->etiqueta() ?? '',
                'marca' => $bien->marca,
                'modelo' => $bien->modelo,
                'color' => $bien->color,
                'serie' => $bien->serie,
                'dimension' => $bien->dimension,
                'caracteristicas' => $bien->caracteristicas,
                'codigo_patrimonial_anterior' => $bien->codigo_patrimonial_anterior,
                'ubicacion' => $bien->ubicacion,
            ];
        }

        return array_values($grupos);
    }
}
