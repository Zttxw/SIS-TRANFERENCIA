<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Auth\Services\CoordinacionEtte;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\FirmaBorrador;
use App\Modules\Transferencia\Models\FirmaSesion;
use App\Modules\Transferencia\Services\CadenaFirmas;
use App\Modules\Transferencia\Services\FirmaManuscritaService;
use App\Modules\Transferencia\Services\FirmantesDocumento;
use App\Modules\Transferencia\Services\FirmaperuPdfService;
use App\Modules\Transferencia\Services\FirmaperuRegistroService;
use App\Modules\Transferencia\Services\FirmaperuSesionService;
use App\Modules\Transferencia\Services\SuscripcionEntrega;
use App\Support\Concerns\AutorizaAmbito;
use App\Support\Enums\LadoFirma;
use App\Support\Http\ApiResponse;
use App\Support\Services\ContextoTransferencia;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FirmaperuController extends Controller
{
    use AutorizaAmbito;

    private const TIPOS = 'anexo01,anexo02,anexo03a,anexo03b,anexo04,anexo05,anexo06,anexo07,acta';

    public function __construct(
        private readonly FirmaperuSesionService $sesiones,
        private readonly FirmaperuRegistroService $registro,
        private readonly FirmantesDocumento $firmantes,
        private readonly CadenaFirmas $cadena,
        private readonly SuscripcionEntrega $suscripcion,
    ) {}

    public function preparar(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'tipo_documento' => 'required|string|in:'.self::TIPOS,
            'dependencia_id' => 'required|integer|exists:dependencias,id,es_centro_costo,1',
            'documento_previo_id' => 'nullable|uuid',
            'lado' => ['required', Rule::enum(LadoFirma::class)],
        ]);
        $dependenciaId = (int) $datos['dependencia_id'];
        $usuario = $request->user();
        $this->autorizarDependencia($usuario, $dependenciaId);
        $tipo = $datos['tipo_documento'] === 'acta' ? 'anexo07' : $datos['tipo_documento'];
        $procesoId = app(ContextoTransferencia::class)->procesoActivoId();
        abort_unless(Dependencia::whereKey($dependenciaId)->where('proceso_transferencia_id', $procesoId)->exists(),
            409, 'La dependencia no pertenece al proceso activo.');

        return ApiResponse::success($this->sesiones->preparar($usuario, $tipo, $dependenciaId,
            LadoFirma::from($datos['lado']), $datos['documento_previo_id'] ?? null), 'Sesión de firma preparada.', 201);
    }

    public function previsualizar(Request $request, FirmaperuPdfService $pdf): Response
    {
        $datos = $request->validate([
            'tipo_documento' => 'required|string|in:'.self::TIPOS,
            'dependencia_id' => 'required|integer|exists:dependencias,id,es_centro_costo,1',
            'solo_generado' => 'sometimes|boolean',
        ]);
        $dependenciaId = (int) $datos['dependencia_id'];
        $this->autorizarDependencia($request->user(), $dependenciaId);
        $procesoId = app(ContextoTransferencia::class)->procesoActivoId();
        abort_unless(Dependencia::whereKey($dependenciaId)->where('proceso_transferencia_id', $procesoId)->exists(), 409);
        $tipo = $datos['tipo_documento'] === 'acta' ? 'anexo07' : $datos['tipo_documento'];
        if (! $request->boolean('solo_generado') && in_array($datos['tipo_documento'], ['acta', 'anexo07'], true)) {
            $this->firmantes->exigirIntervieneEnActa($request->user(), $dependenciaId);
        }

        // Si existe el PDF borrador persistido (y su huella coincide), se muestra
        // ese archivo exacto. Si no, se genera al vuelo con los datos actuales.
        $borrador = FirmaBorrador::where('tipo_documento', $tipo)
            ->where('dependencia_id', $dependenciaId)->where('proceso_transferencia_id', $procesoId)->first();
        if ($borrador && $pdf->generadoVigente($borrador, $tipo, $dependenciaId, $request->user())) {
            $contenido = Storage::disk('local')->get($borrador->pdf_path);
            if (hash_equals($borrador->pdf_sha256, hash('sha256', $contenido))) {
                return response($contenido, 200, [
                    'Content-Type' => 'application/pdf',
                    'Content-Disposition' => 'inline; filename="Generado-'.$tipo.'.pdf"',
                    'Cache-Control' => 'private, no-store',
                ]);
            }
        }

        abort_if($request->boolean('solo_generado'), 404, 'Esta dependencia todavía no tiene un PDF generado vigente para este anexo.');

        return response($pdf->generar($datos['tipo_documento'], $dependenciaId, $request->user()), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="Previsualizacion-'.$datos['tipo_documento'].'.pdf"',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    public function generarBorrador(Request $request, FirmaperuPdfService $pdf): JsonResponse
    {
        $datos = $request->validate([
            'tipo_documento' => 'required|string|in:'.self::TIPOS,
            'dependencia_id' => 'required|integer|exists:dependencias,id,es_centro_costo,1',
        ]);
        $dependenciaId = (int) $datos['dependencia_id'];
        $usuario = $request->user();
        $this->autorizarDependencia($usuario, $dependenciaId);
        $tipo = $datos['tipo_documento'] === 'acta' ? 'anexo07' : $datos['tipo_documento'];
        abort_if($tipo === 'anexo01', 422, 'El Anexo 01 se genera y firma al cierre del proceso, desde la bandeja del ETTS.');
        $this->firmantes->exigirPuedeGenerar($usuario, $tipo, $dependenciaId);
        $procesoId = app(ContextoTransferencia::class)->procesoActivoId();
        abort_unless(Dependencia::whereKey($dependenciaId)->where('proceso_transferencia_id', $procesoId)->exists(),
            409, 'La dependencia no pertenece al proceso activo.');

        if ($tipo === 'anexo07') {
            $this->registro->documento($usuario, $tipo, $dependenciaId);
        }
        $borrador = $pdf->generarBorrador($tipo, $dependenciaId, $usuario);

        return ApiResponse::success([
            'borrador_generado' => true,
            'borrador_generado_en' => $borrador->generado_en->toIso8601String(),
        ], 'PDF definitivo generado y guardado.', 201);
    }

    public function requisitosRemision(Request $request, int $dependenciaId): JsonResponse
    {
        $this->autorizarDependencia($request->user(), $dependenciaId);
        abort_unless(Dependencia::whereKey($dependenciaId)
            ->where('proceso_transferencia_id', app(ContextoTransferencia::class)->procesoActivoId())->exists(), 409);

        $requisitos = $this->suscripcion->requisitosRemision($dependenciaId, $request->user());
        foreach ($requisitos['documentos'] as $tipo => $documento) {
            unset($requisitos['documentos'][$tipo]['firmado_path']);
        }

        return ApiResponse::success($requisitos);
    }

    public function param(Request $request): Response
    {
        $datos = $request->validate(['param_token' => 'required|string|size:64']);

        return response($this->sesiones->parametros($datos['param_token']), 200,
            ['Content-Type' => 'text/plain', 'Cache-Control' => 'no-store']);
    }

    public function documento(string $token): StreamedResponse
    {
        $sesion = $this->sesiones->documentoTemporal($token);
        abort_unless(Storage::disk('local')->exists($sesion->pdf_path), 404);

        return Storage::disk('local')->download($sesion->pdf_path, 'documento.pdf',
            ['Content-Type' => 'application/pdf', 'Cache-Control' => 'no-store']);
    }

    public function subir(Request $request, string $token): JsonResponse
    {
        $request->validate(['signed_file' => ['required', 'file', 'mimes:pdf',
            'max:'.(int) config('firmaperu.max_upload_kb', 20480)]]);
        $sesion = $this->sesiones->recibir($token, $request->file('signed_file'));

        return ApiResponse::success(['sesion_id' => $sesion->id, 'estado' => $sesion->estado],
            $sesion->estado === 'firmada' ? 'PDF firmado recibido y comprobado.' : 'PDF recibido. Verificación pendiente.');
    }

    /**
     * Firma manuscrita del lado ETTE (D-06 a): el responsable sube el escaneo
     * del PDF generado que el coordinador firmó a mano. Queda como base de la
     * cadena; el responsable firma digitalmente encima.
     */
    public function subirManual(Request $request, FirmaManuscritaService $manuscrita): JsonResponse
    {
        $datos = $request->validate([
            'tipo_documento' => 'required|string|in:'.self::TIPOS,
            'dependencia_id' => 'required|integer|exists:dependencias,id,es_centro_costo,1',
            'signed_file' => ['required', 'file', 'mimes:pdf', 'max:'.(int) config('firmaperu.max_upload_kb', 20480)],
        ]);
        $dependenciaId = (int) $datos['dependencia_id'];
        $this->autorizarDependencia($request->user(), $dependenciaId);
        $tipo = $datos['tipo_documento'] === 'acta' ? 'anexo07' : $datos['tipo_documento'];
        abort_unless(Dependencia::whereKey($dependenciaId)
            ->where('proceso_transferencia_id', app(ContextoTransferencia::class)->procesoActivoId())->exists(),
            409, 'La dependencia no pertenece al proceso activo.');

        $sesion = $manuscrita->recibir($request->user(), $tipo, $dependenciaId, $request->file('signed_file'));

        return ApiResponse::success(['sesion_id' => $sesion->id, 'estado' => $sesion->estado],
            'Firma manuscrita del lado ETTE registrada.', 201);
    }

    public function sesion(Request $request, string $id): JsonResponse
    {
        $sesion = FirmaSesion::findOrFail($id);
        $this->autorizarSesion($request, $sesion);
        $estado = in_array($sesion->estado, ['pendiente', 'emitida'], true) && $sesion->expirada()
            ? 'expirada' : $sesion->estado;

        return ApiResponse::success(['sesion_id' => $sesion->id, 'tipo_documento' => $sesion->tipo_documento,
            'dependencia_id' => $sesion->dependencia_id, 'estado' => $estado,
            'expires_at' => $sesion->expires_at->toIso8601String(),
            'documento_id' => $estado === 'firmada' ? $sesion->id : null,
            'version' => $sesion->documento?->version,
            'vigente' => $estado === 'firmada' && $this->cadena->vigente($sesion),
            'firmado_en' => $sesion->firmado_en?->toIso8601String(), 'mensaje' => $sesion->mensaje]);
    }

    /**
     * Estado de firma del documento: la cadena vigente con la firma de cada
     * lado, si el usuario opera las firmas (responsable del CC), quién firma por
     * el lado ETTE y si la firma está habilitada.
     */
    public function estado(Request $request, string $tipo, int $dependenciaId): JsonResponse
    {
        abort_unless(in_array($tipo, explode(',', self::TIPOS), true), 422, 'Tipo de documento inválido.');
        $this->autorizarDependencia($request->user(), $dependenciaId);
        $tipo = $tipo === 'acta' ? 'anexo07' : $tipo;
        $usuario = $request->user();
        $procesoId = app(ContextoTransferencia::class)->procesoActivoId();
        $sesiones = FirmaSesion::where('tipo_documento', $tipo)->where('dependencia_id', $dependenciaId)
            ->where('proceso_transferencia_id', $procesoId);

        $cadena = $this->cadena->estado($procesoId, $dependenciaId, $tipo, $usuario);
        // Sin cadena vigente se informa la última firma conservada (histórica).
        $sesion = $cadena['sesion_final_id'] ? FirmaSesion::find($cadena['sesion_final_id'])
            : (clone $sesiones)->where('estado', 'firmada')->orderByRaw('CASE WHEN documento_firma_id IS NULL THEN 1 ELSE 0 END')
                ->orderByDesc('documento_firma_id')->latest('firmado_en')->latest('created_at')->orderByDesc('id')->first();
        $pendiente = (clone $sesiones)->where('estado', 'pendiente_validacion')->latest('created_at')->orderByDesc('id')->first();
        $borrador = $this->cadena->generado($procesoId, $dependenciaId, $tipo);
        $ette = app(CoordinacionEtte::class)->firmanteDe($dependenciaId);

        // ¿El usuario ya suscribió este documento? Se compara con el DNI del
        // certificado verificado (firmante_dni), que es el hecho de firma real.
        $dni = (string) $usuario->dni;
        $firmeYo = $dni !== '' && (clone $sesiones)->where('estado', 'firmada')->where('firmante_dni', $dni)->exists();

        return ApiResponse::success(['firmado' => $sesion !== null, 'documento_id' => $sesion?->id,
            'firme_yo' => $firmeYo,
            'version' => $sesion?->documento?->version,
            'vigente' => $cadena['sesion_final_id'] !== null,
            'completo' => $cadena['completo'],
            'entidad' => $cadena['entidad'],
            'ette' => $cadena['ette'],
            'hay_firma_digital' => $cadena['hay_firma_digital'],
            'opera_firmas' => $this->firmantes->opera($usuario, $dependenciaId),
            'firmante_ette' => $ette ? ['nombre' => $ette['usuario']->name, 'dni' => $ette['usuario']->dni,
                'en_calidad_de' => $ette['en_calidad_de']->value, 'motivo_suplencia' => $ette['motivo_suplencia']] : null,
            'firma_habilitada' => $this->suscripcion->firmaHabilitada($dependenciaId),
            'firmado_en' => $sesion?->firmado_en?->toIso8601String(),
            'pendiente_validacion' => $pendiente !== null, 'sesion_pendiente_id' => $pendiente?->id,
            'borrador_generado' => $borrador !== null,
            'pdf_generado_vigente' => app(FirmaperuPdfService::class)->generadoVigente($borrador, $tipo, $dependenciaId, $usuario),
            'borrador_generado_en' => $borrador?->generado_en?->toIso8601String()]);
    }

    public function descargar(Request $request, string $id): StreamedResponse
    {
        return $this->descargarEstado($request, $id, 'firmada', 'firmado');
    }

    public function descargarRecibido(Request $request, string $id): StreamedResponse
    {
        return $this->descargarEstado($request, $id, 'pendiente_validacion', 'recibido-sin-verificar');
    }

    /** Sirve el PDF firmado embebido (inline) para visualizarlo en el visor, sin descargarlo. */
    public function verFirmado(Request $request, string $id): Response
    {
        $sesion = FirmaSesion::whereKey($id)->where('estado', 'firmada')->firstOrFail();
        $this->autorizarSesion($request, $sesion);
        $contenido = $this->contenidoFirmadoVerificado($sesion);

        return response($contenido, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.strtoupper($sesion->tipo_documento).'-firmado.pdf"',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    private function descargarEstado(Request $request, string $id, string $estado, string $sufijo): StreamedResponse
    {
        $sesion = FirmaSesion::whereKey($id)->where('estado', $estado)->firstOrFail();
        $this->autorizarSesion($request, $sesion);
        $this->contenidoFirmadoVerificado($sesion);

        return Storage::disk('local')->download($sesion->firmado_path, strtoupper($sesion->tipo_documento).'-'.$sufijo.'.pdf',
            ['Content-Type' => 'application/pdf', 'Cache-Control' => 'no-store']);
    }

    /** La sesión del CC exige su ámbito; la del Anexo 01 institucional, ser ETTS o titular ETTE. */
    private function autorizarSesion(Request $request, FirmaSesion $sesion): void
    {
        if ($sesion->dependencia_id === null) {
            abort_unless(FirmaAnexo01Controller::puedeVerSesion($request, $sesion), 403);

            return;
        }
        $this->autorizarDependencia($request->user(), $sesion->dependencia_id);
    }

    /** Lee el PDF conservado tras comprobar existencia e integridad de su huella. */
    private function contenidoFirmadoVerificado(FirmaSesion $sesion): string
    {
        abort_unless(Storage::disk('local')->exists($sesion->firmado_path), 404);
        $contenido = Storage::disk('local')->get($sesion->firmado_path);
        abort_unless(hash_equals($sesion->firmado_sha256, hash('sha256', $contenido)),
            409, 'El PDF conservado no coincide con su huella de integridad.');

        return $contenido;
    }
}
