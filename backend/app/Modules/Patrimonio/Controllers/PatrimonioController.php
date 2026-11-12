<?php

declare(strict_types=1);

namespace App\Modules\Patrimonio\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Patrimonio\Models\BienPatrimonial;
use App\Modules\Patrimonio\Requests\VerificarBienRequest;
use App\Modules\Patrimonio\Services\PatrimonioPdf;
use App\Modules\Patrimonio\Services\PatrimonioService;
use App\Support\Concerns\AutorizaAmbito;
use App\Support\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PatrimonioController extends Controller
{
    use AutorizaAmbito;

    public function __construct(
        protected PatrimonioService $patrimonioService,
        protected PatrimonioPdf $patrimonioPdf,
    ) {}

    /**
     * Descarga el PDF oficial del Anexo 04 (bienes agrupados por servidor).
     */
    public function pdf(Request $request): StreamedResponse
    {
        $dependenciaId = (int) $request->input('dependencia_id');
        abort_unless($dependenciaId > 0, 422, 'Debe especificar dependencia_id.');
        $this->autorizarDependencia($request->user(), $dependenciaId);

        return $this->patrimonioPdf->descargar($dependenciaId);
    }

    /**
     * Listado paginado de bienes patrimoniales con filtros.
     */
    public function index(Request $request): JsonResponse
    {
        $filtros = $this->acotarFiltrosAlAmbito($request->user(), $request->only([
            'dependencia_id',
            'servidor_id',
            'estado_verificacion',
            'search',
            'per_page',
        ]));

        $bienes = $this->patrimonioService->listarBienes($filtros);

        return ApiResponse::paginated($bienes, 'Bienes patrimoniales recuperados con éxito.');
    }

    /**
     * Detalle de un bien patrimonial.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $bien = $this->patrimonioService->obtenerBien($id);
        $this->autorizarDependencia($request->user(), (int) $bien->dependencia_id);

        return ApiResponse::success($bien);
    }

    /**
     * Registra la verificación física de un bien patrimonial (RN-04, RN-05).
     */
    public function verificar(VerificarBienRequest $request, int $id): JsonResponse
    {
        // El ámbito se verifica contra la dependencia del bien, no de un payload.
        $bien = BienPatrimonial::query()->findOrFail($id, ['id', 'dependencia_id']);
        $this->autorizarDependencia($request->user(), (int) $bien->dependencia_id);

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

        if ($dependenciaId !== null) {
            $this->autorizarDependencia($request->user(), $dependenciaId);
        }

        $resumen = $this->patrimonioService->obtenerResumen($dependenciaId);

        return ApiResponse::success($resumen, 'Resumen patrimonial obtenido.');
    }
}
