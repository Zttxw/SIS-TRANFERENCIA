<?php

declare(strict_types=1);

namespace App\Modules\Auth\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Auth\Services\DelegadoService;
use App\Support\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Gestión de delegados ETTE por el comité (RF-008, D2). Todas las acciones
 * exigen delegados.gestionar: alta/designación/revocación limitadas al equipo
 * ETTE, sin facultad de administrar roles o cuentas institucionales.
 */
class DelegadoController extends Controller
{
    public function __construct(
        protected DelegadoService $delegados,
    ) {}

    public function index(): JsonResponse
    {
        return ApiResponse::success($this->delegados->listar(), 'Delegados ETTE recuperados.');
    }

    public function store(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'dependencia_id' => ['required', 'integer', 'exists:dependencias,id'],
        ]);

        $asignacion = $this->delegados->designar(
            userId: (int) $datos['user_id'],
            dependenciaId: (int) $datos['dependencia_id'],
        );

        return ApiResponse::success(
            $asignacion->load(['usuario:id,dni,name', 'dependencia:id,codigo,nombre']),
            'Delegado ETTE designado para la dependencia.',
            201,
        );
    }

    public function destroy(int $id): JsonResponse
    {
        $revocado = $this->delegados->revocar($id);

        if (! $revocado) {
            return ApiResponse::error('La designación de delegado no existe.', 404);
        }

        return ApiResponse::success(null, 'Designación de delegado revocada.');
    }
}
