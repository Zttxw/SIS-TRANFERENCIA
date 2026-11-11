<?php

declare(strict_types=1);

namespace App\Modules\Documentos\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Documentos\Requests\GuardarDocumentoPendienteRequest;
use App\Modules\Documentos\Services\DocumentoPendienteService;
use App\Support\Concerns\AutorizaAmbito;
use App\Support\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DocumentoPendienteController extends Controller
{
    use AutorizaAmbito;

    public function __construct(
        protected DocumentoPendienteService $documentoService,
    ) {}

    /**
     * Lista los asuntos/documentos pendientes del Anexo 01.
     */
    public function index(Request $request): JsonResponse
    {
        $filtros = $this->acotarFiltrosAlAmbito(
            $request->user(),
            $request->only(['dependencia_id', 'estado_atencion', 'search', 'per_page'])
        );
        $documentos = $this->documentoService->listar($filtros);

        return ApiResponse::paginated($documentos, 'Relación de asuntos pendientes recuperada con éxito.');
    }

    /**
     * Registra un nuevo asunto/documento pendiente.
     */
    public function store(GuardarDocumentoPendienteRequest $request): JsonResponse
    {
        $documento = $this->documentoService->guardar(
            datos: $request->validated(),
            usuario: $request->user()
        );

        return ApiResponse::success($documento, 'Documento registrado en Anexo 01 con éxito.', 201);
    }

    /**
     * Actualiza un asunto/documento pendiente existente.
     */
    public function update(GuardarDocumentoPendienteRequest $request, int $id): JsonResponse
    {
        $documento = $this->documentoService->guardar(
            datos: $request->validated(),
            usuario: $request->user(),
            id: $id
        );

        return ApiResponse::success($documento, 'Documento de Anexo 01 actualizado.');
    }

    /**
     * Elimina un asunto pendiente del Anexo 01.
     */
    public function destroy(int $id): JsonResponse
    {
        $this->documentoService->eliminar($id);

        return ApiResponse::success(null, 'Documento eliminado de Anexo 01.');
    }

    /**
     * Devuelve el resumen cuantitativo de asuntos pendientes por dependencia.
     */
    public function resumen(Request $request): JsonResponse
    {
        $dependenciaId = (int) $request->query('dependencia_id', $request->user()->servidor?->dependencia_id ?? 1);
        $this->autorizarDependencia($request->user(), $dependenciaId);
        $resumen = $this->documentoService->resumen($dependenciaId);

        return ApiResponse::success($resumen, 'Resumen de asuntos pendientes.');
    }
}
