<?php

declare(strict_types=1);

namespace App\Modules\Gestion\Services;

use App\Models\User;
use App\Modules\Gestion\Models\InformeGestion;
use App\Modules\Transferencia\Models\ProcesoTransferencia;

class GestionService
{
    /**
     * Obtiene el informe de gestión de una dependencia para el proceso activo.
     */
    public function obtenerInforme(int $dependenciaId, ?int $procesoId = null): ?InformeGestion
    {
        $procesoId = $procesoId ?? $this->resolverProcesoActivoId();

        return InformeGestion::with(['dependencia', 'responsable', 'elaboradoPor', 'evidencias', 'observaciones'])
            ->where('dependencia_id', $dependenciaId)
            ->where('proceso_transferencia_id', $procesoId)
            ->first();
    }

    /**
     * Guarda o actualiza el informe de gestión (Anexo 02).
     */
    public function guardarInforme(array $datos, User $usuario, ?int $procesoId = null): InformeGestion
    {
        $procesoId = $procesoId ?? $this->resolverProcesoActivoId();

        return InformeGestion::updateOrCreate(
            [
                'proceso_transferencia_id' => $procesoId,
                'dependencia_id' => (int) $datos['dependencia_id'],
            ],
            [
                'servidor_responsable_id' => $datos['servidor_responsable_id'] ?? null,
                'elaborado_por_id' => $usuario->id,
                'principales_funciones' => $datos['principales_funciones'],
                'logros' => $datos['logros'],
                'dificultades' => $datos['dificultades'] ?? null,
                'asuntos_pendientes' => $datos['asuntos_pendientes'] ?? null,
                'estado' => $datos['estado'] ?? 'borrador',
            ]
        );
    }

    private function resolverProcesoActivoId(): int
    {
        return (int) (ProcesoTransferencia::where('estado', 'abierto')->value('id') ?? 1);
    }
}
