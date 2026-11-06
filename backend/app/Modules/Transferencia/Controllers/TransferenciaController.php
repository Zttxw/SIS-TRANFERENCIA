<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Transferencia\Services\TransferenciaService;
use App\Support\Concerns\AutorizaAmbito;
use App\Support\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TransferenciaController extends Controller
{
    use AutorizaAmbito;

    public function __construct(
        protected TransferenciaService $transferenciaService,
    ) {}

    /**
     * Resumen del estado global de entrega de los Anexos por dependencia.
     */
    public function estado(Request $request): JsonResponse
    {
        $dependenciaId = (int) $request->input('dependencia_id');
        if (! $dependenciaId) {
            return ApiResponse::error('Debe especificar dependencia_id.', 422);
        }

        $this->autorizarDependencia($request->user(), $dependenciaId);

        $resumen = $this->transferenciaService->obtenerEstadoEntrega($dependenciaId);

        return ApiResponse::success($resumen, 'Estado de entrega obtenido.');
    }

    /**
     * Remite la entrega de la dependencia al superior jerárquico (plan §7.8).
     */
    public function remitir(Request $request): JsonResponse
    {
        $request->validate([
            'dependencia_id' => ['required', 'integer', 'exists:dependencias,id'],
            'comentario' => ['nullable', 'string', 'max:500'],
        ]);

        $dependenciaId = (int) $request->input('dependencia_id');
        $this->autorizarDependencia($request->user(), $dependenciaId);

        $entrega = $this->transferenciaService->remitirEntrega(
            dependenciaId: $dependenciaId,
            usuario: $request->user(),
            comentario: $request->input('comentario')
        );

        return ApiResponse::success($entrega, 'Entrega de información remitida con éxito al superior jerárquico.');
    }

    /**
     * Revisa una entrega recibida de una dependencia subordinada: la observa
     * (devuelve para subsanación) o la consolida (plan §6 Etapa 3-4, §7.8).
     */
    public function revisar(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'dependencia_id' => ['required', 'integer', 'exists:dependencias,id'],
            'accion' => ['required', 'in:observar,consolidar'],
            'comentario' => ['nullable', 'string', 'max:500'],
        ]);

        $dependenciaId = (int) $datos['dependencia_id'];

        // El revisor opera sobre una dependencia subordinada: debe estar en su
        // ámbito (dependencia propia + subárbol para consolidadores).
        $this->autorizarDependencia($request->user(), $dependenciaId);

        $entrega = $this->transferenciaService->revisarEntrega(
            dependenciaId: $dependenciaId,
            usuario: $request->user(),
            accion: $datos['accion'],
            comentario: $datos['comentario'] ?? null,
        );

        return ApiResponse::success($entrega, 'Revisión de la entrega registrada.');
    }

    /**
     * Obtiene el Acta oficial de Transferencia (Anexo 07).
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
}
