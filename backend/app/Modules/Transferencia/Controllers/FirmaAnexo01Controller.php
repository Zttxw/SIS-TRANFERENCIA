<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Transferencia\Models\FirmaSesion;
use App\Modules\Transferencia\Services\CadenaFirmas;
use App\Modules\Transferencia\Services\FirmantesDocumento;
use App\Modules\Transferencia\Services\FirmaperuPdfService;
use App\Modules\Transferencia\Services\FirmaperuSesionService;
use App\Modules\Transferencia\Services\SuscripcionEntrega;
use App\Support\Http\ApiResponse;
use App\Support\Services\ContextoTransferencia;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;

/**
 * Firma institucional del Anexo 01 al cierre del proceso (fase 6): el ETTS
 * (lado entidad) y un titular ETTE (lado ETTE) firman digitalmente, en orden
 * libre, la relación de centros de costo cuando el ETTE ya recibió todas las
 * entregas. El documento no pertenece a un CC (`dependencia_id` NULL); el resto
 * del flujo de Firma Perú (parámetros, descarga, subida y validación) es el
 * mismo que el de los anexos 02 al 07.
 */
class FirmaAnexo01Controller extends Controller
{
    private const TIPO = 'anexo01';

    public function __construct(
        private readonly CadenaFirmas $cadena,
        private readonly FirmantesDocumento $firmantes,
        private readonly FirmaperuPdfService $pdf,
        private readonly SuscripcionEntrega $suscripcion,
        private readonly ContextoTransferencia $contexto,
    ) {}

    public function estado(Request $request): JsonResponse
    {
        $usuario = $request->user();
        $procesoId = $this->contexto->procesoActivoId();
        $cadena = $this->cadena->estado($procesoId, null, self::TIPO, $usuario);
        $generado = $this->cadena->generado($procesoId, null, self::TIPO);
        $miLado = $this->firmantes->ladoPotencial($usuario, null);

        return ApiResponse::success([
            'firma_habilitada' => $this->suscripcion->firmaHabilitada(null),
            'pdf_generado_vigente' => $this->pdf->generadoVigente($generado, self::TIPO, null, $usuario),
            'generado_en' => $generado?->generado_en?->toIso8601String(),
            'completo' => $cadena['completo'],
            'sesion_final_id' => $cadena['sesion_final_id'],
            'entidad' => $cadena['entidad'],
            'ette' => $cadena['ette'],
            'mi_lado' => $miLado ? ['lado' => $miLado['lado']->value, 'en_calidad_de' => $miLado['en_calidad_de']?->value] : null,
        ], 'Estado de firma del Anexo 01.');
    }

    /** Genera el PDF definitivo con el catálogo vigente (lo hace el ETTS). */
    public function generar(Request $request): JsonResponse
    {
        $usuario = $request->user();
        $lado = $this->firmantes->ladoPotencial($usuario, null);
        abort_unless($lado !== null && $lado['lado']->value === 'entidad', 403, 'El Anexo 01 lo genera el ETTS.');
        $this->suscripcion->exigirFirmaHabilitada(null);

        $generado = $this->pdf->generarBorrador(self::TIPO, null, $usuario);

        return ApiResponse::success(['generado_en' => $generado->generado_en->toIso8601String()],
            'Anexo 01 generado para su firma.', 201);
    }

    public function preparar(Request $request, FirmaperuSesionService $sesiones): JsonResponse
    {
        return ApiResponse::success($sesiones->preparar($request->user(), self::TIPO, null),
            'Sesión de firma del Anexo 01 preparada.', 201);
    }

    /** PDF del Anexo 01: el firmado más completo o, si aún no hay firmas, el generado. */
    public function pdf(Request $request): Response
    {
        $usuario = $request->user();
        $procesoId = $this->contexto->procesoActivoId();
        $cadena = $this->cadena->estado($procesoId, null, self::TIPO, $usuario);
        $ruta = $cadena['firmado_path'];
        if ($ruta === null) {
            $generado = $this->cadena->generado($procesoId, null, self::TIPO);
            abort_unless($this->pdf->generadoVigente($generado, self::TIPO, null, $usuario), 404, 'El Anexo 01 aún no se genera.');
            $ruta = $generado->pdf_path;
        }

        return response(Storage::disk('local')->get($ruta), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="Anexo-01-'.($cadena['completo'] ? 'firmado' : 'generado').'.pdf"',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    /** ¿El usuario interviene en la firma institucional? (ETTS o titular ETTE). */
    public static function puedeVerSesion(Request $request, FirmaSesion $sesion): bool
    {
        return $sesion->dependencia_id === null
            && app(FirmantesDocumento::class)->ladoPotencial($request->user(), null) !== null;
    }
}
