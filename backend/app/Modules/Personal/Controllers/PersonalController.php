<?php

declare(strict_types=1);

namespace App\Modules\Personal\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Personal\Requests\GuardarPersonalRequest;
use App\Modules\Personal\Services\PersonalService;
use App\Support\Concerns\AutorizaAmbito;
use App\Support\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PersonalController extends Controller
{
    use AutorizaAmbito;

    public function __construct(
        protected PersonalService $personalService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $filtros = $this->acotarFiltrosAlAmbito(
            $request->user(),
            $request->only(['dependencia_id', 'search', 'per_page'])
        );
        $personal = $this->personalService->listar($filtros);

        return ApiResponse::paginated($personal, 'Relación de personal recuperada con éxito.');
    }

    public function store(GuardarPersonalRequest $request): JsonResponse
    {
        $registro = $this->personalService->guardar(
            datos: $request->validated(),
            usuario: $request->user()
        );

        return ApiResponse::success($registro, 'Personal registrado en Anexo 05 con éxito.', 201);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->personalService->eliminar($id);

        return ApiResponse::success(null, 'Registro de personal eliminado.');
    }
}
