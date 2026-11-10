<?php

declare(strict_types=1);

namespace App\Support\Services;

use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\Entrega;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\EstadoEntrega;
use Illuminate\Support\Carbon;

/**
 * Contexto común de transferencia reutilizado por los generadores de PDF (F5) y
 * los reportes: resuelve el proceso activo, la dependencia y el estado de su
 * entrega. Centraliza la noción de «borrador» (entrega aún no consolidada), que
 * decide la marca de agua de los PDF y el estado mostrado en los consolidados.
 */
class ContextoTransferencia
{
    /**
     * Devuelve la cabecera de contexto para un PDF/reporte de una dependencia.
     *
     * @return array<string, mixed>
     */
    public function paraDependencia(int $dependenciaId, ?int $procesoId = null): array
    {
        $procesoId = $procesoId ?? $this->procesoActivoId();
        $dep = Dependencia::findOrFail($dependenciaId);
        $entrega = $this->entregaDe($dependenciaId, $procesoId);
        $estado = $entrega?->estado ?? EstadoEntrega::BORRADOR;

        return [
            'proceso_id' => $procesoId,
            'dependencia' => [
                'id' => $dep->id,
                'codigo' => $dep->codigo,
                'nombre' => $dep->nombre,
                'nivel' => $dep->nivel,
            ],
            'entrega_estado' => $estado->value,
            'entrega_estado_etiqueta' => $estado->etiqueta(),
            'es_borrador' => $estado !== EstadoEntrega::CONSOLIDADA && $estado !== EstadoEntrega::CERRADA,
            'emitido_en' => Carbon::now()->format('d/m/Y H:i'),
        ];
    }

    public function entregaDe(int $dependenciaId, ?int $procesoId = null): ?Entrega
    {
        $procesoId = $procesoId ?? $this->procesoActivoId();

        return Entrega::where('proceso_transferencia_id', $procesoId)
            ->where('dependencia_id', $dependenciaId)
            ->latest('id')
            ->first();
    }

    public function procesoActivoId(): int
    {
        return (int) (ProcesoTransferencia::where('estado', 'abierto')->value('id') ?? 1);
    }
}
