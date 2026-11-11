<?php

declare(strict_types=1);

namespace App\Modules\Organization\Services;

use App\Modules\Organization\Models\Dependencia;
use App\Support\Services\ContextoTransferencia;

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
        $centros = Dependencia::with('padre')
            ->where('proceso_transferencia_id', $contexto['proceso_id'])
            ->get()->sortBy('codigo', SORT_NATURAL)->values();

        return ['contexto' => $contexto, 'centros' => $centros];
    }
}
