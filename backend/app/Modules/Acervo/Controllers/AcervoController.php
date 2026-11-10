<?php

declare(strict_types=1);

namespace App\Modules\Acervo\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Acervo\Requests\GuardarAcervoRequest;
use App\Modules\Acervo\Services\AcervoPdf;
use App\Modules\Acervo\Services\AcervoService;
use App\Support\Concerns\AutorizaAmbito;
use App\Support\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AcervoController extends Controller
{
    use AutorizaAmbito;

    public function __construct(
        protected AcervoService $acervoService,
        protected AcervoPdf $acervoPdf,
    ) {}

    /**
     * Descarga el PDF oficial del Anexo 03 (acervo agrupado por año).
     */
    public function pdf(Request $request): StreamedResponse
    {
        $dependenciaId = (int) $request->input('dependencia_id');
        abort_unless($dependenciaId > 0, 422, 'Debe especificar dependencia_id.');
        $this->autorizarDependencia($request->user(), $dependenciaId);

        return $this->acervoPdf->descargar($dependenciaId);
    }

    public function index(Request $request): JsonResponse
    {
        $filtros = $this->acotarFiltrosAlAmbito(
            $request->user(),
            $request->only(['dependencia_id', 'tipo', 'search', 'per_page'])
        );
        $acervo = $this->acervoService->listar($filtros);

        return ApiResponse::paginated($acervo, 'Registros de acervo documental recuperados.');
    }

    public function store(GuardarAcervoRequest $request): JsonResponse
    {
        $registro = $this->acervoService->crear(
            datos: $request->validated(),
            usuario: $request->user()
        );

        return ApiResponse::success($registro, 'Registro de acervo documental guardado con éxito.', 201);
    }

    public function update(GuardarAcervoRequest $request, int $id): JsonResponse
    {
        $registro = $this->acervoService->actualizar($id, $request->validated());

        return ApiResponse::success($registro, 'Registro de acervo actualizado.');
    }

    public function destroy(int $id): JsonResponse
    {
        $this->acervoService->eliminar($id);

        return ApiResponse::success(null, 'Registro de acervo eliminado correctamente.');
    }
}
