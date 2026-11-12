<?php

declare(strict_types=1);

namespace App\Modules\Personal\Services;

use App\Models\User;
use App\Modules\Personal\Models\Personal;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Concerns\RespetaEstadoEntrega;
use App\Support\Enums\FuenteDato;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class PersonalService
{
    use RespetaEstadoEntrega;

    /**
     * Lista el personal declarado con filtros y paginación (Anexo 05).
     */
    public function listar(array $filtros = []): LengthAwarePaginator
    {
        $query = Personal::query()
            ->where('proceso_transferencia_id', $this->resolverProcesoActivoId())
            ->with(['dependencia', 'servidor', 'observaciones'])
            ->orderBy('apellidos');

        if (! empty($filtros['dependencia_id'])) {
            $query->where('dependencia_id', (int) $filtros['dependencia_id']);
        }

        // Acotación por ámbito (F8): lista de dependencias accesibles al usuario.
        if (array_key_exists('dependencia_ids', $filtros) && $filtros['dependencia_ids'] !== null) {
            $query->whereIn('dependencia_id', $filtros['dependencia_ids']);
        }

        if (! empty($filtros['search'])) {
            $term = trim((string) $filtros['search']);
            $query->where(function ($q) use ($term) {
                $q->whereLike('dni', "%{$term}%")
                    ->orWhereLike('nombres', "%{$term}%")
                    ->orWhereLike('apellidos', "%{$term}%")
                    ->orWhereLike('cargo', "%{$term}%");
            });
        }

        $perPage = isset($filtros['per_page']) ? min((int) $filtros['per_page'], 100) : 15;

        return $query->paginate($perPage);
    }

    /**
     * Registra o actualiza un personal en la relación del Anexo 05.
     */
    public function guardar(array $datos, User $usuario, ?int $procesoId = null): Personal
    {
        $procesoId = $procesoId ?? $this->resolverProcesoActivoId();

        $this->exigirEntregaModificable((int) $datos['dependencia_id'], $procesoId);

        return Personal::updateOrCreate(
            [
                'proceso_transferencia_id' => $procesoId,
                'dni' => $datos['dni'],
            ],
            [
                'dependencia_id' => (int) $datos['dependencia_id'],
                'servidor_id' => $datos['servidor_id'] ?? null,
                'nombres' => $datos['nombres'],
                'apellidos' => $datos['apellidos'],
                'cargo' => $datos['cargo'],
                'regimen_laboral' => $datos['regimen_laboral'],
                'modalidad_contractual' => $datos['modalidad_contractual'] ?? null,
                'situacion_laboral' => $datos['situacion_laboral'] ?? null,
                'observaciones' => $datos['observaciones'] ?? null,
                'validado' => $datos['validado'] ?? true,
                'validado_por_id' => $usuario->id,
                'fuente' => FuenteDato::MANUAL->value,
            ]
        );
    }

    /**
     * Elimina un registro de personal.
     */
    public function eliminar(int $id): bool
    {
        $p = Personal::findOrFail($id);
        $this->exigirEntregaModificable((int) $p->dependencia_id);

        return (bool) $p->delete();
    }

    private function resolverProcesoActivoId(): int
    {
        return (int) (ProcesoTransferencia::where('estado', 'abierto')->value('id') ?? 1);
    }
}
