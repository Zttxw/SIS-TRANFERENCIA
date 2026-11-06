<?php

declare(strict_types=1);

namespace App\Modules\Gestion\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Gestion\Requests\GuardarInformeGestionRequest;
use App\Modules\Gestion\Services\GestionService;
use App\Support\Concerns\AutorizaAmbito;
use App\Support\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GestionController extends Controller
{
    use AutorizaAmbito;

    public function __construct(
        protected GestionService $gestionService,
    ) {}

    /**
     * Consulta el informe de gestión de una dependencia (Anexo 02).
     */
    public function show(Request $request): JsonResponse
    {
        $dependenciaId = (int) $request->input('dependencia_id');
        if (! $dependenciaId) {
            return ApiResponse::error('Debe especificar dependencia_id.', 422);
        }

        $this->autorizarDependencia($request->user(), $dependenciaId);

        $informe = $this->gestionService->obtenerInforme($dependenciaId);

        return ApiResponse::success($informe, 'Informe de gestión recuperado.');
    }

    /**
     * Guarda o actualiza el informe de gestión (Anexo 02).
     */
    public function store(GuardarInformeGestionRequest $request): JsonResponse
    {
        $informe = $this->gestionService->guardarInforme(
            datos: $request->validated(),
            usuario: $request->user()
        );

        return ApiResponse::success($informe, 'Informe de gestión guardado con éxito.');
    }
}
