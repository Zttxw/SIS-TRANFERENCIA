<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\Observacion;
use App\Modules\Transferencia\Requests\RegistrarObservacionRequest;
use App\Modules\Transferencia\Services\FirmantesDocumento;
use App\Modules\Transferencia\Services\ObservacionService;
use App\Support\Concerns\AutorizaAmbito;
use App\Support\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Observaciones del coordinador ETTE (D-07): constancia sin subsanación. Las
 * registra y retira el responsable del CC en su sesión, durante la revisión
 * presencial, a nombre del firmante ETTE designado; el ámbito se verifica contra
 * el CC de la observación.
 */
class ObservacionController extends Controller
{
    use AutorizaAmbito;

    public function __construct(
        protected ObservacionService $observaciones,
        protected FirmantesDocumento $firmantes,
    ) {}

    /**
     * Lista observaciones acotadas al ámbito del usuario.
     */
    public function index(Request $request): JsonResponse
    {
        $filtros = $this->acotarFiltrosAlAmbito(
            $request->user(),
            $request->only(['dependencia_id', 'anexo', 'estado', 'per_page'])
        );

        return ApiResponse::paginated($this->observaciones->listar($filtros), 'Observaciones recuperadas.');
    }

    /**
     * Registra una observación del coordinador ETTE (o titular suplente) sobre
     * una fila o sobre el anexo completo del CC.
     */
    public function store(RegistrarObservacionRequest $request): JsonResponse
    {
        $datos = $request->validated();

        $observable = isset($datos['observable_id'])
            ? $this->observaciones->resolverObservable($datos['anexo'], (int) $datos['observable_id'])
            : null;
        $dependencia = Dependencia::findOrFail((int) ($observable?->dependencia_id ?? $datos['dependencia_id']));

        $this->autorizarDependencia($request->user(), $dependencia->id);
        $this->firmantes->exigirOperador($request->user(), $dependencia->id);

        $observacion = $this->observaciones->registrar(
            dependencia: $dependencia,
            anexo: $datos['anexo'],
            observable: $observable,
            operador: $request->user(),
            descripcion: $datos['descripcion'],
        );

        return ApiResponse::success($observacion, 'Observación registrada.', 201);
    }

    /**
     * Retira una observación mientras la entrega sigue en revisión.
     */
    public function retirar(Request $request, int $id): JsonResponse
    {
        $observacion = $this->cargarEnAmbito($request, $id);
        $this->firmantes->exigirOperador($request->user(), $observacion->dependencia_id);

        return ApiResponse::success($this->observaciones->retirar($observacion, $request->user()), 'Observación retirada.');
    }

    /**
     * Carga la observación y verifica que su CC esté en el ámbito.
     */
    private function cargarEnAmbito(Request $request, int $id): Observacion
    {
        $observacion = Observacion::with('observable')->findOrFail($id);
        abort_if($observacion->dependencia_id === null, 404);
        $this->autorizarDependencia($request->user(), $observacion->dependencia_id);

        return $observacion;
    }
}
