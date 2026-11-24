<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Transferencia\Models\ActaTransferencia;
use App\Modules\Transferencia\Services\ActaPdf;
use App\Modules\Transferencia\Services\ActaTransferenciaService;
use App\Modules\Transferencia\Services\CondicionesActa;
use App\Modules\Transferencia\Services\FirmantesDocumento;
use App\Support\Concerns\AutorizaAmbito;
use App\Support\Enums\CondicionAnexoActa;
use App\Support\Enums\Permiso;
use App\Support\Http\ApiResponse;
use App\Support\Services\ContextoTransferencia;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Acta de Transferencia Administrativa y Entrega de Cargo (Anexo 07). La emite
 * el personal de la entidad (actas.generar); el lado ETTE la consulta una vez
 * emitida. Los datos se completan en la sesión del responsable, con el
 * coordinador ETTE presente, antes de firmarla.
 */
class ActaController extends Controller
{
    use AutorizaAmbito;

    public function __construct(
        private readonly ActaTransferenciaService $actas,
        private readonly FirmantesDocumento $firmantes,
    ) {}

    public function show(Request $request): JsonResponse
    {
        $this->firmantes->exigirConsultaDeActas($request->user());
        $dependenciaId = $this->dependenciaAutorizada($request);

        if ($request->user()->tienePermiso(Permiso::GenerarActas)) {
            $acta = $this->actas->obtener($dependenciaId, $request->user());
        } else {
            $this->firmantes->exigirIntervieneEnActa($request->user(), $dependenciaId);
            $acta = ActaTransferencia::where('proceso_transferencia_id', app(ContextoTransferencia::class)->procesoActivoId())
                ->where('dependencia_id', $dependenciaId)->firstOrFail()
                ->load(['dependencia.padre:id,codigo,nombre', 'evidencias.subidoPor', 'generadaPor']);
        }

        return ApiResponse::success($this->actas->paraConsulta($acta), 'Acta de transferencia obtenida.');
    }

    /** Fecha, hora, lugar, condición de cada documento y observaciones (RF-62, RF-63, RF-66). */
    public function update(Request $request): JsonResponse
    {
        $dependenciaId = $this->dependenciaAutorizada($request);
        $this->firmantes->exigirPuedeGenerar($request->user(), 'anexo07', $dependenciaId);

        $datos = $request->validate([
            'fecha_acta' => ['sometimes', 'required', 'date'],
            'lugar' => ['sometimes', 'required', 'string', 'max:200'],
            'hora' => ['sometimes', 'nullable', 'date_format:H:i,H:i:s'],
            'otros_documentos' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'observaciones' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'condiciones' => ['sometimes', 'array:'.implode(',', array_keys(CondicionesActa::ITEMS))],
            'condiciones.*' => ['array:condicion,observacion'],
            'condiciones.*.condicion' => ['sometimes', 'nullable', Rule::enum(CondicionAnexoActa::class)],
            'condiciones.*.observacion' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ]);

        $acta = $this->actas->actualizar($dependenciaId, $datos, $request->user());

        return ApiResponse::success($this->actas->paraConsulta($acta), 'Datos del acta guardados.');
    }

    /** PDF oficial del Acta, que se emite y suscribe antes de remitir. */
    public function pdf(Request $request, ActaPdf $actaPdf): StreamedResponse
    {
        $this->firmantes->exigirConsultaDeActas($request->user());
        $dependenciaId = $this->dependenciaAutorizada($request);
        if (! $request->user()->tienePermiso(Permiso::GenerarActas)) {
            $this->firmantes->exigirIntervieneEnActa($request->user(), $dependenciaId);
        }

        return $actaPdf->descargar($dependenciaId, $request->user());
    }

    private function dependenciaAutorizada(Request $request): int
    {
        $dependenciaId = (int) $request->input('dependencia_id');
        abort_unless($dependenciaId > 0, 422, 'Debe especificar dependencia_id.');
        $this->autorizarDependencia($request->user(), $dependenciaId);

        return $dependenciaId;
    }
}
