<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Transferencia\Services\TransferenciaService;
use App\Support\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TransferenciaController extends Controller
{
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

        $entrega = $this->transferenciaService->remitirEntrega(
            dependenciaId: (int) $request->input('dependencia_id'),
            usuario: $request->user(),
            comentario: $request->input('comentario')
        );

        return ApiResponse::success($entrega, 'Entrega de información remitida con éxito al superior jerárquico.');
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

        $acta = $this->transferenciaService->obtenerActa($dependenciaId);

        return ApiResponse::success($acta, 'Acta de transferencia obtenida.');
    }
}
