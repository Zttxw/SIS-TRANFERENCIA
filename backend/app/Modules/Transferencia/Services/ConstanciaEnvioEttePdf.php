<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Services;

use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\EnvioEtte;
use App\Support\Enums\EstadoEntrega;
use App\Support\Services\PdfService;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Constancia de entrega del ETTS al ETTE (RF-75): un documento por lote con los
 * CC enviados y, bajo cada uno, los CC de su subárbol que consolidó.
 */
class ConstanciaEnvioEttePdf
{
    public function __construct(
        private readonly PdfService $pdf,
        private readonly ConsolidacionCentroCosto $consolidacion,
    ) {}

    public function descargar(EnvioEtte $envio): StreamedResponse
    {
        return $this->pdf->descargar('pdf.constancia-envio-ette', $this->datos($envio),
            'constancia-envio-ette-'.$envio->codigo().'.pdf');
    }

    /** @return array<string, mixed> */
    public function datos(EnvioEtte $envio): array
    {
        $envio->loadMissing(['enviadoPor:id,name', 'entregas.dependencia']);

        $centros = $envio->entregas->sortBy(fn ($entrega) => $entrega->dependencia->codigo, SORT_NATURAL)
            ->map(fn ($entrega): array => [
                'codigo' => $entrega->dependencia->codigo,
                'nombre' => $entrega->dependencia->nombre,
                'recibida_etts_en' => $entrega->recibida_etts_en?->format('d/m/Y H:i'),
                'subarbol' => $this->subarbol($entrega->dependencia),
            ])->values()->all();

        return [
            'contexto' => [
                'dependencia' => ['codigo' => $envio->codigo(), 'nombre' => 'Envío del ETTS al ETTE'],
                'emitido_en' => now()->format('d/m/Y H:i'),
                'es_borrador' => false,
            ],
            'envio' => [
                'codigo' => $envio->codigo(),
                'enviado_en' => $envio->enviado_en->format('d/m/Y H:i'),
                'enviado_por' => $envio->enviadoPor?->name,
                'comentario' => $envio->comentario,
            ],
            'centros' => $centros,
        ];
    }

    /**
     * CC dependientes de la raíz con el estado de su entrega al emitir la constancia.
     *
     * @return list<array{codigo: string, nombre: string, estado: string, enviado_tarde: bool}>
     */
    private function subarbol(Dependencia $raiz): array
    {
        return collect($this->consolidacion->consolidado($raiz)['centros'])
            ->reject(fn (array $fila): bool => $fila['es_propio'])
            ->map(fn (array $fila): array => [
                'codigo' => (string) $fila['codigo'],
                'nombre' => (string) $fila['nombre'],
                'estado' => EstadoEntrega::from($fila['estado'])->fueRemitida() ? 'Remitida' : 'No remitida',
                'enviado_tarde' => $fila['enviado_tarde'],
            ])->values()->all();
    }
}
