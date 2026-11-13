<?php

declare(strict_types=1);

namespace App\Modules\Acervo\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Acervo\Models\AcervoDocumental;
use App\Modules\Acervo\Requests\GuardarAcervoRequest;
use App\Modules\Acervo\Services\AcervoPdf;
use App\Modules\Acervo\Services\AcervoService;
use App\Modules\Acervo\Services\AcervoSgdService;
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

    /**
     * Documentos individuales del SGD que respaldan una fila-resumen de acervo
     * digital. Consulta en vivo (solo lectura), paginada y con búsqueda por asunto.
     */
    public function documentosSgd(Request $request, int $id): JsonResponse
    {
        $acervo = AcervoDocumental::findOrFail($id);
        $this->autorizarDependencia($request->user(), (int) $acervo->dependencia_id);

        $busqueda = trim((string) $request->query('search', ''));
        $page = max(1, (int) $request->query('page', 1));
        $perPage = min(50, max(1, (int) $request->query('per_page', 15)));

        $resultado = AcervoSgdService::desdeConfig()
            ->documentos($acervo, $busqueda !== '' ? $busqueda : null, $page, $perPage);

        return ApiResponse::success($resultado, 'Documentos del SGD recuperados.');
    }

    /**
     * Streaming del PDF principal de un documento del SGD (inline). El `emi` se
     * valida contra la fila-resumen para que no sirva documentos fuera de ámbito.
     */
    public function documentoSgdPdf(Request $request, int $id, string $emi): StreamedResponse
    {
        $acervo = AcervoDocumental::findOrFail($id);
        $this->autorizarDependencia($request->user(), (int) $acervo->dependencia_id);

        return AcervoSgdService::desdeConfig()->streamPdf($acervo, $emi);
    }
}
