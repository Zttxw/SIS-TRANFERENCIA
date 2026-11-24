<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Auth\Services\CoordinacionEtte;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Services\ConsolidacionCentroCosto;
use App\Modules\Transferencia\Services\RevisionEntregaService;
use App\Modules\Transferencia\Services\TransferenciaService;
use App\Support\Concerns\AutorizaAmbito;
use App\Support\Http\ApiResponse;
use App\Support\Services\ContextoTransferencia;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TransferenciaController extends Controller
{
    use AutorizaAmbito;

    public function __construct(
        protected TransferenciaService $transferenciaService,
        protected RevisionEntregaService $revision,
    ) {}

    /**
     * Lista entregas de información acotadas al ámbito del usuario (plan §7.8, E8).
     */
    public function index(Request $request): JsonResponse
    {
        $filtros = $this->acotarFiltrosAlAmbito(
            $request->user(),
            $request->only(['dependencia_id', 'estado', 'per_page'])
        );

        $entregas = $this->transferenciaService->listarEntregas($filtros);

        return ApiResponse::paginated($entregas, 'Entregas recuperadas.');
    }

    /**
     * Tablero operativo global de transferencia para monitoreo gerencial y toma de decisiones.
     */
    public function tablero(Request $request): JsonResponse
    {
        $dependenciaIds = $this->idsDependenciaEnAmbito($request->user());
        $tablero = $this->transferenciaService->obtenerTableroOperativo($dependenciaIds);

        return ApiResponse::success($tablero, 'Tablero operativo recuperado con éxito.');
    }

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
     * Remite la entrega suscrita al CC padre o al ETTS (D-02).
     */
    public function remitir(Request $request): JsonResponse
    {
        $request->validate([
            'comentario' => ['nullable', 'string', 'max:500'],
            'confirmar_sin_hijos' => ['sometimes', 'boolean'],
        ]);
        $dependenciaId = $this->dependenciaAutorizada($request);

        $entrega = $this->transferenciaService->remitirEntrega(
            dependenciaId: $dependenciaId,
            usuario: $request->user(),
            comentario: $request->input('comentario'),
            confirmarSinHijos: $request->boolean('confirmar_sin_hijos'),
        );

        return ApiResponse::success($entrega, $entrega->esHaciaEtts()
            ? 'Entrega remitida al ETTS.'
            : 'Entrega remitida al centro de costo padre.');
    }

    /**
     * El responsable cierra la entrega y la pasa a revisión y firma con el
     * coordinador ETTE (D-07).
     */
    public function presentar(Request $request): JsonResponse
    {
        $dependenciaId = $this->dependenciaAutorizada($request);

        $entrega = $this->revision->presentar($dependenciaId, $request->user());

        return ApiResponse::success($entrega, 'Entrega cerrada para la revisión y firma con el coordinador ETTE.');
    }

    /**
     * Designa (o retira) al titular ETTE que suple al coordinador ausente en la
     * revisión y firma presencial.
     */
    public function suplenciaEtte(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'titular_id' => ['nullable', 'integer'],
            'motivo_suplencia' => ['nullable', 'required_with:titular_id', 'string', 'max:500'],
        ]);
        $dependenciaId = $this->dependenciaAutorizada($request);

        $entrega = $this->revision->designarSuplencia($dependenciaId, $request->user(),
            isset($datos['titular_id']) ? (int) $datos['titular_id'] : null, $datos['motivo_suplencia'] ?? null);

        return ApiResponse::success($entrega, $entrega->titular_suplente_id
            ? 'Titular ETTE designado en suplencia del coordinador.'
            : 'Firma el coordinador ETTE asignado.');
    }

    /** Titulares ETTE activos que pueden suplir al coordinador. */
    public function titularesEtte(CoordinacionEtte $coordinacion, ContextoTransferencia $contexto): JsonResponse
    {
        $titulares = $coordinacion->titulares($contexto->procesoActivoId())
            ->map(fn (User $titular): array => ['id' => $titular->id, 'nombre' => $titular->name, 'dni' => $titular->dni])
            ->values();

        return ApiResponse::success($titulares, 'Titulares ETTE recuperados.');
    }

    /**
     * Consolidado del CC: su subárbol con el estado de cada entrega, su autor y
     * su CC de origen (D-08, RF-43). Solo consulta: el padre no cambia los
     * datos de sus hijos.
     */
    public function consolidado(Request $request, ConsolidacionCentroCosto $consolidacion): JsonResponse
    {
        $dependenciaId = $this->dependenciaAutorizada($request);

        return ApiResponse::success($consolidacion->consolidado(Dependencia::findOrFail($dependenciaId)), 'Consolidado recuperado.');
    }

    /** Valida el CC del payload y que esté en el ámbito del usuario. */
    private function dependenciaAutorizada(Request $request): int
    {
        $request->validate([
            'dependencia_id' => ['required', 'integer', 'exists:dependencias,id,es_centro_costo,1'],
        ]);
        $dependenciaId = (int) $request->input('dependencia_id');
        $this->autorizarDependencia($request->user(), $dependenciaId);

        return $dependenciaId;
    }
}
