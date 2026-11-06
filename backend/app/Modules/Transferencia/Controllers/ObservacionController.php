<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Transferencia\Models\Observacion;
use App\Modules\Transferencia\Requests\RegistrarObservacionRequest;
use App\Modules\Transferencia\Requests\SubsanarObservacionRequest;
use App\Modules\Transferencia\Services\ObservacionService;
use App\Support\Concerns\AutorizaAmbito;
use App\Support\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Observaciones y subsanaciones sobre los anexos (plan §7.9). El ámbito se
 * verifica contra la dependencia del elemento observado.
 */
class ObservacionController extends Controller
{
    use AutorizaAmbito;

    public function __construct(
        protected ObservacionService $observaciones,
    ) {}

    /**
     * Lista observaciones acotadas al ámbito del usuario.
     */
    public function index(Request $request): JsonResponse
    {
        $filtros = $this->acotarFiltrosAlAmbito(
            $request->user(),
            $request->only(['dependencia_id', 'anexo', 'estado', 'per_page'])
        );

        $observaciones = $this->observaciones->listar($filtros);

        return ApiResponse::paginated($observaciones, 'Observaciones recuperadas.');
    }

    /**
     * Registra una observación sobre un elemento de anexo (coordinador).
     */
    public function store(RegistrarObservacionRequest $request): JsonResponse
    {
        $datos = $request->validated();

        $observable = $this->observaciones->resolverObservable($datos['anexo'], (int) $datos['observable_id']);

        // El ámbito se verifica contra la dependencia del elemento observado.
        $this->autorizarDependencia($request->user(), (int) $observable->dependencia_id);

        $observacion = $this->observaciones->registrar(
            observable: $observable,
            autor: $request->user(),
            descripcion: $datos['descripcion'],
        );

        return ApiResponse::success($observacion, 'Observación registrada.', 201);
    }

    /**
     * Subsana una observación (responsable). Re-remite la entrega si era la
     * última observación abierta de la dependencia.
     */
    public function subsanar(SubsanarObservacionRequest $request, int $id): JsonResponse
    {
        $observacion = $this->cargarEnAmbito($request, $id);

        $observacion = $this->observaciones->subsanar(
            observacion: $observacion,
            responsable: $request->user(),
            respuesta: $request->validated()['respuesta'],
        );

        return ApiResponse::success($observacion, 'Observación subsanada.');
    }

    /**
     * Desestima una observación (autor/coordinador).
     */
    public function desestimar(Request $request, int $id): JsonResponse
    {
        $observacion = $this->cargarEnAmbito($request, $id);

        $observacion = $this->observaciones->desestimar(
            observacion: $observacion,
            usuario: $request->user(),
        );

        return ApiResponse::success($observacion, 'Observación desestimada.');
    }

    /**
     * Carga la observación y verifica que su dependencia esté en el ámbito.
     */
    private function cargarEnAmbito(Request $request, int $id): Observacion
    {
        $observacion = Observacion::with('observable')->findOrFail($id);

        $dependenciaId = $this->observaciones->dependenciaDelObservable($observacion);
        if ($dependenciaId !== null) {
            $this->autorizarDependencia($request->user(), $dependenciaId);
        }

        return $observacion;
    }
}
