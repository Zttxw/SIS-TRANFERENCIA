<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\FirmaSesion;
use App\Modules\Transferencia\Services\FirmaperuRegistroService;
use App\Modules\Transferencia\Services\FirmaperuSesionService;
use App\Support\Concerns\AutorizaAmbito;
use App\Support\Http\ApiResponse;
use App\Support\Services\ContextoTransferencia;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FirmaperuController extends Controller
{
    use AutorizaAmbito;

    private const TIPOS = 'anexo01,anexo02,anexo03,anexo04,anexo05,anexo06,anexo07,acta';

    public function __construct(private readonly FirmaperuSesionService $sesiones, private readonly FirmaperuRegistroService $registro) {}

    public function preparar(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'tipo_documento' => 'required|string|in:'.self::TIPOS,
            'dependencia_id' => 'required|integer|exists:dependencias,id',
            'documento_previo_id' => 'nullable|uuid',
        ]);
        $dependenciaId = (int) $datos['dependencia_id'];
        $usuario = $request->user();
        $this->autorizarDependencia($usuario, $dependenciaId);
        $tipo = $datos['tipo_documento'] === 'acta' ? 'anexo07' : $datos['tipo_documento'];
        $this->registro->caracter($usuario, $tipo, $dependenciaId);
        $procesoId = app(ContextoTransferencia::class)->procesoActivoId();
        abort_unless(Dependencia::whereKey($dependenciaId)->where('proceso_transferencia_id', $procesoId)->exists(),
            409, 'La dependencia no pertenece al proceso activo.');

        return ApiResponse::success($this->sesiones->preparar($usuario, $tipo, $dependenciaId,
            $datos['documento_previo_id'] ?? null), 'Sesión de firma preparada.', 201);
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

    public function sesion(Request $request, string $id): JsonResponse
    {
        $sesion = FirmaSesion::findOrFail($id);
        $this->autorizarDependencia($request->user(), $sesion->dependencia_id);
        $estado = in_array($sesion->estado, ['pendiente', 'emitida'], true) && $sesion->expirada()
            ? 'expirada' : $sesion->estado;

        return ApiResponse::success(['sesion_id' => $sesion->id, 'tipo_documento' => $sesion->tipo_documento,
            'dependencia_id' => $sesion->dependencia_id, 'estado' => $estado,
            'expires_at' => $sesion->expires_at->toIso8601String(),
            'documento_id' => $estado === 'firmada' ? $sesion->id : null,
            'version' => $sesion->documento?->version,
            'vigente' => $estado === 'firmada' && $this->registro->vigente($sesion),
            'firmado_en' => $sesion->firmado_en?->toIso8601String(), 'mensaje' => $sesion->mensaje]);
    }

    public function estado(Request $request, string $tipo, int $dependenciaId): JsonResponse
    {
        abort_unless(in_array($tipo, explode(',', self::TIPOS), true), 422, 'Tipo de documento inválido.');
        $this->autorizarDependencia($request->user(), $dependenciaId);
        $sesion = FirmaSesion::where('tipo_documento', $tipo === 'acta' ? 'anexo07' : $tipo)
            ->where('dependencia_id', $dependenciaId)
            ->where('proceso_transferencia_id', app(ContextoTransferencia::class)->procesoActivoId())
            ->where('estado', 'firmada')->orderByRaw('CASE WHEN documento_firma_id IS NULL THEN 1 ELSE 0 END')
            ->orderByDesc('documento_firma_id')->latest('firmado_en')->latest('created_at')->orderByDesc('id')->first();

        $pendiente = FirmaSesion::where('tipo_documento', $tipo === 'acta' ? 'anexo07' : $tipo)
            ->where('dependencia_id', $dependenciaId)
            ->where('proceso_transferencia_id', app(ContextoTransferencia::class)->procesoActivoId())
            ->where('estado', 'pendiente_validacion')->latest('created_at')->orderByDesc('id')->first();

        return ApiResponse::success(['firmado' => $sesion !== null, 'documento_id' => $sesion?->id,
            'version' => $sesion?->documento?->version,
            'vigente' => $sesion !== null && $this->registro->vigente($sesion),
            'firmado_en' => $sesion?->firmado_en?->toIso8601String(),
            'pendiente_validacion' => $pendiente !== null, 'sesion_pendiente_id' => $pendiente?->id]);
    }

    public function descargar(Request $request, string $id): StreamedResponse
    {
        return $this->descargarEstado($request, $id, 'firmada', 'firmado');
    }

    public function descargarRecibido(Request $request, string $id): StreamedResponse
    {
        return $this->descargarEstado($request, $id, 'pendiente_validacion', 'recibido-sin-verificar');
    }

    private function descargarEstado(Request $request, string $id, string $estado, string $sufijo): StreamedResponse
    {
        $sesion = FirmaSesion::whereKey($id)->where('estado', $estado)->firstOrFail();
        $this->autorizarDependencia($request->user(), $sesion->dependencia_id);
        abort_unless(Storage::disk('local')->exists($sesion->firmado_path), 404);
        abort_unless(hash_equals($sesion->firmado_sha256, hash('sha256', Storage::disk('local')->get($sesion->firmado_path))),
            409, 'El PDF conservado no coincide con su huella de integridad.');

        return Storage::disk('local')->download($sesion->firmado_path, strtoupper($sesion->tipo_documento).'-'.$sufijo.'.pdf',
            ['Content-Type' => 'application/pdf', 'Cache-Control' => 'no-store']);
    }
}
