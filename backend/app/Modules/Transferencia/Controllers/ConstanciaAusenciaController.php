<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Transferencia\Services\ConstanciaAusenciaService;
use App\Support\Concerns\AutorizaAmbito;
use App\Support\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Constancia de ausencia de firma ETTE + copia digital (B2, D-12). El
 * responsable del centro de costo registra que el ETTE no firmó una versión y
 * marca la entrega de la copia digital (sin presumir acuse). La consulta exige
 * anexos.ver; el registro exige firmas.constancia_ausencia (ruta). Ambos quedan
 * acotados al ámbito de la dependencia.
 */
class ConstanciaAusenciaController extends Controller
{
    use AutorizaAmbito;

    public function __construct(
        protected ConstanciaAusenciaService $constancias,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $dependenciaId = (int) $request->input('dependencia_id');
        abort_unless($dependenciaId > 0, 422, 'Debe especificar dependencia_id.');
        $this->autorizarDependencia($request->user(), $dependenciaId);

        return ApiResponse::success(
            $this->constancias->listar($dependenciaId),
            'Constancias de ausencia ETTE recuperadas.',
        );
    }

    public function store(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'dependencia_id' => ['required', 'integer', 'exists:dependencias,id'],
            'ette_nombre' => ['nullable', 'string', 'max:200'],
            'nota' => ['nullable', 'string', 'max:1000'],
        ]);

        $this->autorizarDependencia($request->user(), (int) $datos['dependencia_id']);

        $constancia = $this->constancias->registrar(
            (int) $datos['dependencia_id'],
            $request->user(),
            [
                'ette_nombre' => $datos['ette_nombre'] ?? null,
                'nota' => $datos['nota'] ?? null,
            ],
        );

        return ApiResponse::success(
            $constancia,
            'Constancia de ausencia ETTE registrada; copia digital marcada como entregada.',
            201,
        );
    }
}
