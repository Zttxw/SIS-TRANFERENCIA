<?php

declare(strict_types=1);

namespace App\Modules\Patrimonio\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Patrimonio\Requests\VerificarBienRequest;
use App\Modules\Patrimonio\Services\PatrimonioService;
use App\Support\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PatrimonioController extends Controller
{
    public function __construct(
        protected PatrimonioService $patrimonioService,
    ) {}

    /**
     * Listado paginado de bienes patrimoniales con filtros.
     */
    public function index(Request $request): JsonResponse
    {
        $filtros = $request->only([
            'dependencia_id',
            'servidor_id',
            'estado_verificacion',
            'search',
            'per_page',
        ]);

        $bienes = $this->patrimonioService->listarBienes($filtros);

        return ApiResponse::paginated($bienes, 'Bienes patrimoniales recuperados con éxito.');
    }

    /**
     * Detalle de un bien patrimonial.
     */
    public function show(int $id): JsonResponse
    {
        $bien = $this->patrimonioService->obtenerBien($id);

        return ApiResponse::success($bien);
    }

    /**
     * Registra la verificación física de un bien patrimonial (RN-04, RN-05).
     */
    public function verificar(VerificarBienRequest $request, int $id): JsonResponse
    {
        $bien = $this->patrimonioService->verificarBien(
            id: $id,
            datos: $request->validated(),
            usuario: $request->user()
        );

        return ApiResponse::success($bien, 'Verificación patrimonial guardada con éxito.');
    }

    /**
     * Métricas y resumen del avance de verificación patrimonial.
     */
    public function resumen(Request $request): JsonResponse
    {
        $dependenciaId = $request->filled('dependencia_id') ? (int) $request->input('dependencia_id') : null;
        $resumen = $this->patrimonioService->obtenerResumen($dependenciaId);

        return ApiResponse::success($resumen, 'Resumen patrimonial obtenido.');
    }
}
