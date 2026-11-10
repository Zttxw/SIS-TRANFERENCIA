<?php

declare(strict_types=1);

namespace App\Support\Services;

use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use Illuminate\Support\Carbon;

/**
 * Contexto común de transferencia reutilizado por los generadores de PDF de cada
 * anexo: resuelve el proceso activo y la cabecera de la dependencia.
 *
 * El sistema es una herramienta de apoyo para generar los anexos; el flujo de
 * remisión/consolidación lo lleva el SGD. Por eso el PDF de cualquier anexo es
 * siempre generable (sin marca de agua ni gate de estado de entrega).
 */
class ContextoTransferencia
{
    /**
     * Devuelve la cabecera de contexto para un PDF de una dependencia.
     *
     * @return array<string, mixed>
     */
    public function paraDependencia(int $dependenciaId, ?int $procesoId = null): array
    {
        $procesoId = $procesoId ?? $this->procesoActivoId();
        $dep = Dependencia::findOrFail($dependenciaId);

        return [
            'proceso_id' => $procesoId,
            'dependencia' => [
                'id' => $dep->id,
                'codigo' => $dep->codigo,
                'nombre' => $dep->nombre,
                'nivel' => $dep->nivel,
            ],
            'emitido_en' => Carbon::now()->format('d/m/Y H:i'),
        ];
    }

    public function procesoActivoId(): int
    {
        return (int) (ProcesoTransferencia::where('estado', 'abierto')->value('id') ?? 1);
    }
}
