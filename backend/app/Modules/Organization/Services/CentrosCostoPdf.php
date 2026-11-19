<?php

declare(strict_types=1);

namespace App\Modules\Organization\Services;

use App\Modules\Organization\Models\Dependencia;
use App\Support\Services\ContextoTransferencia;
use Illuminate\Support\Collection;

class CentrosCostoPdf
{
    public function __construct(private readonly ContextoTransferencia $contexto) {}

    /**
     * El Anexo 01 es el catálogo institucional del proceso, consultable por todos
     * los usuarios con acceso a anexos. La dependencia seleccionada identifica la sesión.
     *
     * @return array<string, mixed>
     */
    public function datos(int $dependenciaId): array
    {
        $contexto = $this->contexto->paraDependencia($dependenciaId);

        return ['contexto' => $contexto, 'centros' => $this->centros($contexto['proceso_id']), 'institucional' => false];
    }

    /**
     * Anexo 01 institucional que firman el ETTS y un titular ETTE al cierre del
     * proceso (fase 6): el catálogo vigente, sin cabecera de CC.
     *
     * @return array<string, mixed>
     */
    public function datosInstitucionales(): array
    {
        $procesoId = $this->contexto->procesoActivoId();

        return [
            'contexto' => [
                'proceso_id' => $procesoId,
                'dependencia' => ['codigo' => 'Anexo 01', 'nombre' => 'Relación institucional de centros de costo'],
                'entrega_estado' => 'borrador',
                'entrega_estado_etiqueta' => '',
                'es_borrador' => true,
                'emitido_en' => now()->format('d/m/Y H:i'),
            ],
            'centros' => $this->centros($procesoId),
            'institucional' => true,
        ];
    }

    /** @return Collection<int, Dependencia> */
    private function centros(int $procesoId): Collection
    {
        return Dependencia::query()->centrosCosto()->with('padre')
            ->where('proceso_transferencia_id', $procesoId)
            ->get()->sortBy('codigo', SORT_NATURAL)->values();
    }
}
