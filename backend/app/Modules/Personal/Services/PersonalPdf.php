<?php

declare(strict_types=1);

namespace App\Modules\Personal\Services;

use App\Modules\Organization\Models\Dependencia;
use App\Modules\Personal\Models\Personal;
use App\Support\Services\ContextoTransferencia;
use App\Support\Services\PdfService;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * PDF oficial del Anexo 05 (Personal a cargo del Centro de Costo). Fila por
 * servidor con régimen, modalidad, situación laboral y observaciones.
 */
class PersonalPdf
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
            'pdf.anexo05',
            $datos,
            "Anexo05-Personal-{$codigo}{$sufijo}.pdf",
            'a4',
            'landscape',
        );
    }

    /** @return array<string, mixed> */
    public function datos(int $dependenciaId): array
    {
        $contexto = $this->contexto->paraDependencia($dependenciaId);
        $dep = Dependencia::with('encargado')->find($dependenciaId);

        $registros = Personal::where('dependencia_id', $dependenciaId)
            ->where('proceso_transferencia_id', $contexto['proceso_id'])
            ->orderBy('apellidos')
            ->orderBy('nombres')
            ->get();

        return [
            'contexto' => $contexto,
            'cabecera' => [
                'dependencia' => $dep?->nombre ?? '',
                'encargado' => $dep?->encargado
                    ? trim("{$dep->encargado->nombres} {$dep->encargado->apellidos}")
                    : '',
            ],
            'personal' => $registros->map(fn (Personal $p): array => [
                'dni' => $p->dni,
                'nombre' => trim("{$p->apellidos} {$p->nombres}"),
                'cargo' => $p->cargo,
                'regimen_laboral' => $p->regimen_laboral,
                'modalidad_contractual' => $p->modalidad_contractual,
                'situacion_laboral' => $p->situacion_laboral,
                'observaciones' => $p->observaciones,
            ])->all(),
        ];
    }
}
