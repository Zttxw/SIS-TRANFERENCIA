<?php

declare(strict_types=1);

namespace App\Modules\NoPatrimonial\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\NoPatrimonial\Requests\GuardarBienNoPatrimonialRequest;
use App\Modules\NoPatrimonial\Services\NoPatrimonialPdf;
use App\Modules\NoPatrimonial\Services\NoPatrimonialService;
use App\Support\Concerns\AutorizaAmbito;
use App\Support\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class NoPatrimonialController extends Controller
{
    use AutorizaAmbito;

    public function __construct(
        protected NoPatrimonialService $noPatrimonialService,
        protected NoPatrimonialPdf $noPatrimonialPdf,
    ) {}

    /**
     * Descarga el PDF oficial del Anexo 06 (bienes no patrimoniales).
     */
    public function pdf(Request $request): StreamedResponse
    {
        $dependenciaId = (int) $request->input('dependencia_id');
        abort_unless($dependenciaId > 0, 422, 'Debe especificar dependencia_id.');
        $this->autorizarDependencia($request->user(), $dependenciaId);

        return $this->noPatrimonialPdf->descargar($dependenciaId);
    }

    public function index(Request $request): JsonResponse
    {
        $filtros = $this->acotarFiltrosAlAmbito(
            $request->user(),
            $request->only(['dependencia_id', 'search', 'per_page'])
        );
        $bienes = $this->noPatrimonialService->listar($filtros);

        return ApiResponse::paginated($bienes, 'Bienes no patrimoniales recuperados.');
    }

    public function store(GuardarBienNoPatrimonialRequest $request): JsonResponse
    {
        $bien = $this->noPatrimonialService->crear(
            datos: $request->validated(),
            usuario: $request->user()
        );

        return ApiResponse::success($bien, 'Bien no patrimonial registrado con éxito (Anexo 06).', 201);
    }

    public function update(GuardarBienNoPatrimonialRequest $request, int $id): JsonResponse
    {
        $bien = $this->noPatrimonialService->actualizar($id, $request->validated());

        return ApiResponse::success($bien, 'Bien no patrimonial actualizado.');
    }

    public function destroy(int $id): JsonResponse
    {
        $this->noPatrimonialService->eliminar($id);

        return ApiResponse::success(null, 'Bien no patrimonial eliminado.');
    }
}
