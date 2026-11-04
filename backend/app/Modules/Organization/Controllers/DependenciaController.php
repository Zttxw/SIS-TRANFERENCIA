<?php

declare(strict_types=1);

namespace App\Modules\Organization\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Organization\Models\Dependencia;
use App\Support\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DependenciaController extends Controller
{
    /**
     * Lista dependencias / centros de costo disponibles para el proceso de transferencia.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Dependencia::query()
            ->with(['encargado:id,dni,nombres,apellidos,cargo'])
            ->orderBy('codigo');

        if ($request->boolean('solo_activas', true)) {
            $query->where('activa', true);
        }

        if ($request->filled('search')) {
            $term = trim((string) $request->input('search'));
            $query->where(function ($q) use ($term) {
                $q->where('codigo', 'ilike', "%{$term}%")
                    ->orWhere('nombre', 'ilike', "%{$term}%");
            });
        }

        if ($request->boolean('all')) {
            $dependencias = $query->get();

            return ApiResponse::success($dependencias, 'Catálogo de dependencias recuperado con éxito.');
        }

        $perPage = min((int) $request->input('per_page', 25), 100);
        $paginado = $query->paginate($perPage);

        return ApiResponse::paginated($paginado, 'Dependencias recuperadas con éxito.');
    }

    /**
     * Muestra el detalle de una dependencia específica.
     */
    public function show(int $id): JsonResponse
    {
        $dependencia = Dependencia::with(['padre', 'hijas', 'encargado'])->findOrFail($id);

        return ApiResponse::success($dependencia, 'Dependencia encontrada.');
    }
}
