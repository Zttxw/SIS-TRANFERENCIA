<?php

declare(strict_types=1);

namespace App\Modules\NoPatrimonial\Services;

use App\Models\User;
use App\Modules\NoPatrimonial\Models\BienNoPatrimonial;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\FuenteDato;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class NoPatrimonialService
{
    /**
     * Lista los bienes no patrimoniales con filtros y paginación (Anexo 06).
     */
    public function listar(array $filtros = []): LengthAwarePaginator
    {
        $query = BienNoPatrimonial::query()
            ->with(['dependencia', 'servidor', 'registradoPor', 'evidencias', 'observaciones'])
            ->orderBy('id', 'desc');

        if (! empty($filtros['dependencia_id'])) {
            $query->where('dependencia_id', (int) $filtros['dependencia_id']);
        }

        if (! empty($filtros['search'])) {
            $term = trim((string) $filtros['search']);
            $query->where(function ($q) use ($term) {
                $q->where('denominacion', 'ilike', "%{$term}%")
                    ->orWhere('descripcion', 'ilike', "%{$term}%")
                    ->orWhere('ubicacion', 'ilike', "%{$term}%");
            });
        }

        $perPage = isset($filtros['per_page']) ? min((int) $filtros['per_page'], 100) : 15;

        return $query->paginate($perPage);
    }

    /**
     * Registra un bien no patrimonial en el Anexo 06.
     */
    public function crear(array $datos, User $usuario, ?int $procesoId = null): BienNoPatrimonial
    {
        $procesoId = $procesoId ?? $this->resolverProcesoActivoId();

        return BienNoPatrimonial::create([
            'proceso_transferencia_id' => $procesoId,
            'dependencia_id' => (int) $datos['dependencia_id'],
            'servidor_id' => $datos['servidor_id'] ?? null,
            'registrado_por_id' => $usuario->id,
            'denominacion' => $datos['denominacion'],
            'descripcion' => $datos['descripcion'] ?? null,
            'cantidad' => $datos['cantidad'],
            'unidad_medida' => $datos['unidad_medida'],
            'estado_conservacion' => $datos['estado_conservacion'] ?? null,
            'ubicacion' => $datos['ubicacion'] ?? null,
            'observaciones' => $datos['observaciones'] ?? null,
            'fuente' => FuenteDato::MANUAL->value,
        ]);
    }

    /**
     * Actualiza un bien no patrimonial.
     */
    public function actualizar(int $id, array $datos): BienNoPatrimonial
    {
        $bien = BienNoPatrimonial::findOrFail($id);
        $bien->update($datos);

        return $bien->fresh(['dependencia', 'servidor']);
    }

    /**
     * Elimina un bien no patrimonial.
     */
    public function eliminar(int $id): bool
    {
        $b = BienNoPatrimonial::findOrFail($id);

        return (bool) $b->delete();
    }

    private function resolverProcesoActivoId(): int
    {
        return (int) (ProcesoTransferencia::where('estado', 'abierto')->value('id') ?? 1);
    }
}
