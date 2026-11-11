<?php

declare(strict_types=1);

namespace App\Modules\Organization\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Organization\Models\Dependencia;
use App\Support\Concerns\AutorizaAmbito;
use App\Support\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DependenciaController extends Controller
{
    use AutorizaAmbito;

    /**
     * Lista dependencias / centros de costo acotados al ámbito del usuario autenticado.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Dependencia::query()
            ->with([
                'encargado:id,dni,nombres,apellidos,cargo',
                'servidores:id,dependencia_id,dni,nombres,apellidos,cargo,es_responsable',
            ])
            ->orderBy('codigo');

        if ($request->boolean('solo_activas', true)) {
            $query->where('activa', true);
        }

        // Acotar al ámbito solo cuando se solicita explícitamente (ej. en el selector de despacho).
        // Por defecto, el catálogo y el organigrama institucional (Anexo 01) son públicos para toda la entidad,
        // permitiendo a cualquier servidor consultar el árbol completo e identificar su ubicación.
        if ($request->boolean('solo_ambito', false) && $request->user()) {
            $idsAmbito = $this->idsDependenciaEnAmbito($request->user());
            if ($idsAmbito !== null) {
                $query->whereIn('id', $idsAmbito);
            }
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
    public function show(Request $request, int $id): JsonResponse
    {
        if ($request->user()) {
            $this->autorizarDependencia($request->user(), $id);
        }

        $dependencia = Dependencia::with([
            'padre',
            'hijas',
            'encargado',
            'servidores:id,dependencia_id,dni,nombres,apellidos,cargo,es_responsable',
        ])->findOrFail($id);

        return ApiResponse::success($dependencia, 'Dependencia encontrada.');
    }
}
