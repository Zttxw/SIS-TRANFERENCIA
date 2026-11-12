<?php

declare(strict_types=1);

namespace App\Modules\Organization\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Organization\Models\Dependencia;
use App\Support\Concerns\AutorizaAmbito;
use App\Support\Enums\Rol;
use App\Support\Http\ApiResponse;
use App\Support\Services\ContextoTransferencia;
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
            ->with('encargado:id,dni,nombres,apellidos,cargo')
            ->where('proceso_transferencia_id', app(ContextoTransferencia::class)->procesoActivoId())
            ->orderBy('codigo');

        if ($request->boolean('solo_activas', true)) {
            $query->where('activa', true);
        }

        // Si el usuario no tiene ámbito global (admin/ETTS), acotar a su dependencia o subárbol
        if ($request->user()) {
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

    /** Estructura institucional completa; consultar una unidad no concede acceso a sus anexos ni personal. */
    public function organigrama(Request $request): JsonResponse
    {
        $usuario = $request->user();
        $procesoId = app(ContextoTransferencia::class)->procesoActivoId();
        $ambito = $usuario->dependenciasEnAmbito();
        $responsables = $usuario->asignacionesRol()->where('proceso_transferencia_id', $procesoId)
            ->whereIn('rol', [Rol::RESPONSABLE_CENTRO_COSTO->value, Rol::RESPONSABLE_EQUIPO->value])
            ->pluck('dependencia_id')->filter()->all();
        if ($usuario->servidor?->es_responsable && $usuario->servidor->dependencia_id) {
            $responsables[] = $usuario->servidor->dependencia_id;
        }
        $unidades = Dependencia::query()->where('proceso_transferencia_id', $procesoId)->where('activa', true)
            ->with('encargado:id,nombres,apellidos,cargo')
            ->get(['id', 'parent_id', 'codigo', 'nombre', 'nivel', 'encargado_servidor_id'])->sortBy('codigo')->values()
            ->map(function (Dependencia $dep) use ($ambito, $responsables): array {
                $accesible = $ambito === null || in_array($dep->id, $ambito, true);

                return ['id' => $dep->id, 'parent_id' => $dep->parent_id, 'codigo' => $dep->codigo,
                    'nombre' => $dep->nombre, 'nivel' => $dep->nivel, 'en_ambito' => $accesible,
                    'es_responsable' => in_array($dep->id, $responsables, true),
                    'encargado' => $accesible ? $dep->encargado?->only(['id', 'nombres', 'apellidos', 'cargo']) : null];
            });

        return ApiResponse::success($unidades, 'Estructura institucional de centros de costo.');
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
