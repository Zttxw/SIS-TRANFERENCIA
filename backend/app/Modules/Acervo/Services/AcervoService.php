<?php

declare(strict_types=1);

namespace App\Modules\Acervo\Services;

use App\Models\User;
use App\Modules\Acervo\Models\AcervoDocumental;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\FuenteDato;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class AcervoService
{
    /**
     * Lista los registros de acervo documental con filtros y paginación.
     */
    public function listar(array $filtros = []): LengthAwarePaginator
    {
        $query = AcervoDocumental::query()
            ->with(['dependencia', 'registradoPor', 'evidencias'])
            ->orderBy('id', 'desc');

        if (! empty($filtros['dependencia_id'])) {
            $query->where('dependencia_id', (int) $filtros['dependencia_id']);
        }

        // Acotación por ámbito (F8): lista de dependencias accesibles al usuario.
        if (array_key_exists('dependencia_ids', $filtros) && $filtros['dependencia_ids'] !== null) {
            $query->whereIn('dependencia_id', $filtros['dependencia_ids']);
        }

        if (! empty($filtros['tipo'])) {
            $query->where('tipo', (string) $filtros['tipo']);
        }

        if (! empty($filtros['search'])) {
            $term = trim((string) $filtros['search']);
            $query->where(function ($q) use ($term) {
                $q->where('serie_documental', 'ilike', "%{$term}%")
                    ->orWhere('descripcion', 'ilike', "%{$term}%")
                    ->orWhere('ubicacion', 'ilike', "%{$term}%");
            });
        }

        $perPage = isset($filtros['per_page']) ? min((int) $filtros['per_page'], 100) : 15;

        return $query->paginate($perPage);
    }

    /**
     * Crea un nuevo registro de acervo documental (Anexo 03).
     */
    public function crear(array $datos, User $usuario, ?int $procesoId = null): AcervoDocumental
    {
        $procesoId = $procesoId ?? $this->resolverProcesoActivoId();

        return AcervoDocumental::create([
            'proceso_transferencia_id' => $procesoId,
            'dependencia_id' => (int) $datos['dependencia_id'],
            'registrado_por_id' => $usuario->id,
            'tipo' => $datos['tipo'],
            'serie_documental' => $datos['serie_documental'],
            'anio' => $datos['anio'] ?? null,
            'desde_anio' => $datos['desde_anio'] ?? null,
            'hasta_anio' => $datos['hasta_anio'] ?? null,
            'periodo' => $datos['periodo'] ?? null,
            'cantidad_unidades' => (int) $datos['cantidad_unidades'],
            'unidad_conservacion' => $datos['unidad_conservacion'],
            'ubicacion' => $datos['ubicacion'] ?? null,
            'descripcion' => $datos['descripcion'] ?? null,
            'observaciones' => $datos['observaciones'] ?? null,
            'fuente' => FuenteDato::MANUAL->value,
        ]);
    }

    /**
     * Actualiza un registro existente de acervo documental.
     */
    public function actualizar(int $id, array $datos): AcervoDocumental
    {
        $acervo = AcervoDocumental::findOrFail($id);
        $acervo->update($datos);

        return $acervo->fresh(['dependencia', 'registradoPor']);
    }

    /**
     * Elimina un registro de acervo documental.
     */
    public function eliminar(int $id): bool
    {
        $acervo = AcervoDocumental::findOrFail($id);

        return (bool) $acervo->delete();
    }

    private function resolverProcesoActivoId(): int
    {
        return (int) (ProcesoTransferencia::where('estado', 'abierto')->value('id') ?? 1);
    }
}
