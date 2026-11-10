<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Transferencia\Services\ActaPdf;
use App\Modules\Transferencia\Services\TransferenciaService;
use App\Support\Concerns\AutorizaAmbito;
use App\Support\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Apoyo a la generación de los anexos: avance institucional (tablero), avance de
 * los anexos de una dependencia y el Acta (Anexo 07). El flujo de remisión y
 * consolidación lo lleva el SGD; este controlador no lo expone.
 */
class TransferenciaController extends Controller
{
    use AutorizaAmbito;

    public function __construct(
        protected TransferenciaService $transferenciaService,
        protected ActaPdf $actaPdf,
    ) {}

    /**
     * Tablero de avance institucional de los anexos, acotado al ámbito.
     */
    public function tablero(Request $request): JsonResponse
    {
        $dependenciaIds = $this->idsDependenciaEnAmbito($request->user());
        $tablero = $this->transferenciaService->obtenerTableroOperativo($dependenciaIds);

        return ApiResponse::success($tablero, 'Tablero de avance recuperado con éxito.');
    }

    /**
     * Avance de los anexos de una dependencia (para el dashboard de «mi entrega»).
     */
    public function estado(Request $request): JsonResponse
    {
        $dependenciaId = (int) $request->input('dependencia_id');
        if (! $dependenciaId) {
            return ApiResponse::error('Debe especificar dependencia_id.', 422);
        }

        $this->autorizarDependencia($request->user(), $dependenciaId);

        $resumen = $this->transferenciaService->obtenerEstadoEntrega($dependenciaId);

        return ApiResponse::success($resumen, 'Avance de los anexos obtenido.');
    }

    /**
     * Materializa o consulta el Acta oficial (Anexo 07) con los datos disponibles.
     */
    public function acta(Request $request): JsonResponse
    {
        $dependenciaId = (int) $request->input('dependencia_id');
        if (! $dependenciaId) {
            return ApiResponse::error('Debe especificar dependencia_id.', 422);
        }

        $this->autorizarDependencia($request->user(), $dependenciaId);

        $acta = $this->transferenciaService->obtenerActa($dependenciaId, $request->user());

        return ApiResponse::success($acta, 'Acta de transferencia obtenida.');
    }

    /**
     * Descarga el PDF oficial del Acta (Anexo 07).
     */
    public function actaPdf(Request $request): StreamedResponse
    {
        $dependenciaId = (int) $request->input('dependencia_id');
        abort_unless($dependenciaId > 0, 422, 'Debe especificar dependencia_id.');
        $this->autorizarDependencia($request->user(), $dependenciaId);

        return $this->actaPdf->descargar($dependenciaId, $request->user());
    }
}
