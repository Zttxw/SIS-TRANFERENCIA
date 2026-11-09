<?php

declare(strict_types=1);

namespace App\Modules\Gestion\Services;

use App\Models\User;
use App\Modules\Gestion\Models\InformeGestion;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Concerns\RespetaEstadoEntrega;

class GestionService
{
    use RespetaEstadoEntrega;

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

        $this->exigirEntregaModificable((int) $datos['dependencia_id'], $procesoId);

        return InformeGestion::updateOrCreate(
            [
                'proceso_transferencia_id' => $procesoId,
                'dependencia_id' => (int) $datos['dependencia_id'],
            ],
            [
                'servidor_responsable_id' => $datos['servidor_responsable_id'] ?? null,
                'elaborado_por_id' => $usuario->id,
                'nivel_organizacional' => $datos['nivel_organizacional'] ?? null,
                'cargo_periodo' => $datos['cargo_periodo'] ?? null,
                'funciones' => $this->numerarFilas($datos['funciones'] ?? []),
                'logros_items' => $this->numerarFilas($datos['logros_items'] ?? []),
                'dificultades_items' => $this->numerarFilas($datos['dificultades_items'] ?? []),
                'pendientes_items' => $this->numerarFilas($datos['pendientes_items'] ?? []),
                'estado' => $datos['estado'] ?? 'borrador',
            ]
        );
    }

    /**
     * Reasigna el número de orden (`n`) de cada fila de forma secuencial (1..N),
     * preservando el orden de llegada. Devuelve null si no hay filas.
     *
     * @param  array<int, array<string, mixed>>  $filas
     * @return array<int, array<string, mixed>>|null
     */
    private function numerarFilas(array $filas): ?array
    {
        if ($filas === []) {
            return null;
        }

        $numeradas = [];
        $n = 1;
        foreach (array_values($filas) as $fila) {
            $fila['n'] = $n++;
            $numeradas[] = $fila;
        }

        return $numeradas;
    }

    private function resolverProcesoActivoId(): int
    {
        return (int) (ProcesoTransferencia::where('estado', 'abierto')->value('id') ?? 1);
    }
}
