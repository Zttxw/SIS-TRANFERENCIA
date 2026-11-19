<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Services;

use App\Models\User;
use App\Modules\Transferencia\Models\FirmaSesion;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\LadoFirma;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

/**
 * Firma manuscrita del lado ETTE (D-06 a): el coordinador (o el titular
 * suplente) descarga el PDF generado, lo firma a mano y sube el escaneo. El
 * escaneo queda como base de la cadena y el responsable firma digitalmente
 * encima, lo que lo convalida; no se verifica criptográficamente.
 *
 * Si ya hay una firma digital, la manuscrita la invalidaría: se rechaza y el
 * lado ETTE debe firmar digitalmente (D-06 b).
 */
class FirmaManuscritaService
{
    public function __construct(
        private readonly FirmaperuPdfService $pdf,
        private readonly FirmaperuRegistroService $registro,
        private readonly FirmantesDocumento $firmantes,
        private readonly CadenaFirmas $cadena,
        private readonly SuscripcionEntrega $suscripcion,
    ) {}

    public function recibir(User $usuario, string $tipo, int $dependenciaId, UploadedFile $archivo, ?string $motivoSuplencia = null): FirmaSesion
    {
        abort_unless(preg_match('/^\d{8}$/', (string) $usuario->dni), 422, 'La cuenta debe tener un DNI válido para firmar.');
        $procesoId = ProcesoTransferencia::where('estado', 'abierto')->value('id');
        abort_unless($procesoId, 409, 'No existe un proceso de transferencia abierto.');

        $firmante = $this->firmantes->lado($usuario, $tipo, $dependenciaId, $motivoSuplencia);
        abort_unless($firmante['lado'] === LadoFirma::ETTE, 403,
            'El responsable del centro de costo firma digitalmente con Firma Perú.');
        $this->suscripcion->exigirFirmaHabilitada($dependenciaId);

        $documento = $this->registro->documento($usuario, $tipo, $dependenciaId);
        $generado = $this->cadena->generado($procesoId, $dependenciaId, $tipo);
        abort_unless($this->pdf->generadoVigente($generado, $tipo, $dependenciaId, $usuario), 409,
            'El anexo no tiene un PDF generado vigente para firmar. Pida al responsable que lo genere.');
        abort_if($this->cadena->hayFirmaDigitalVigente($documento), 409,
            'Ya existe una firma digital; la firma del coordinador debe ser digital para no invalidarla.');
        $original = Storage::disk('local')->get($generado->pdf_path);
        abort_unless(hash_equals($generado->pdf_sha256, hash('sha256', $original)), 409,
            'El PDF generado no coincide con su huella.');

        $escaneo = $archivo->getContent();
        $id = (string) Str::uuid7();
        $rutaOriginal = 'firmaperu/'.$id.'/original.pdf';
        $rutaFirmado = 'firmaperu/'.$id.'/firmado.pdf';

        try {
            abort_unless(Storage::disk('local')->put($rutaOriginal, $original)
                && Storage::disk('local')->put($rutaFirmado, $escaneo), 503, 'No se pudo conservar el PDF firmado.');

            return DB::transaction(function () use ($id, $procesoId, $dependenciaId, $usuario, $tipo, $documento,
                $firmante, $original, $escaneo, $rutaOriginal, $rutaFirmado): FirmaSesion {
                $sesion = FirmaSesion::create([
                    'id' => $id,
                    'proceso_transferencia_id' => $procesoId,
                    'dependencia_id' => $dependenciaId,
                    'usuario_id' => $usuario->id,
                    'firmante_dni' => $usuario->dni,
                    'tipo_documento' => $tipo,
                    'documento_firma_id' => $documento->id,
                    'lado' => $firmante['lado'],
                    'en_calidad_de' => $firmante['en_calidad_de'],
                    'motivo_suplencia' => $firmante['motivo_suplencia'],
                    'estado' => 'firmada',
                    'origen' => 'manual',
                    'pdf_path' => $rutaOriginal,
                    'firmado_path' => $rutaFirmado,
                    'original_sha256' => hash('sha256', $original),
                    'firmado_sha256' => hash('sha256', $escaneo),
                    'firmado_en' => now(),
                    'detalles' => ['recibido_en' => now()->toIso8601String(), 'origen' => 'manual',
                        'integridad_verificada' => false, 'cadena_verificada' => false],
                    'expires_at' => now(),
                ]);
                $this->registro->registrar($sesion);

                return $sesion;
            });
        } catch (Throwable $exception) {
            Storage::disk('local')->delete([$rutaOriginal, $rutaFirmado]);
            throw $exception;
        }
    }
}
