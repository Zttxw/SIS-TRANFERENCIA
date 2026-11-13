<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Services;

use App\Models\User;
use App\Modules\Transferencia\Models\FirmaBorrador;
use App\Modules\Transferencia\Models\FirmaSesion;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

class FirmaperuSesionService
{
    public function __construct(
        private readonly FirmaperuAuthService $auth,
        private readonly FirmaperuPdfService $pdf,
        private readonly FirmaperuValidadorService $validador,
        private readonly FirmaperuRegistroService $registro,
    ) {}

    /** @return array<string, mixed> */
    public function preparar(User $usuario, string $tipo, int $dependenciaId, ?string $previoId = null): array
    {
        abort_unless(preg_match('/^\d{8}$/', (string) $usuario->dni), 422, 'La cuenta debe tener un DNI válido para firmar.');
        $this->jwt();
        $procesoId = ProcesoTransferencia::where('estado', 'abierto')->value('id');
        abort_unless($procesoId, 409, 'No existe un proceso de transferencia abierto.');
        $caracter = $this->registro->caracter($usuario, $tipo, $dependenciaId);
        $documento = $this->registro->documento($usuario, $tipo, $dependenciaId);
        $previo = $previoId ? FirmaSesion::whereKey($previoId)
            ->where('dependencia_id', $dependenciaId)->where('tipo_documento', $tipo)
            ->where('proceso_transferencia_id', $procesoId)->where('estado', 'firmada')->firstOrFail() : null;

        if ($previo) {
            $generado = FirmaBorrador::where('proceso_transferencia_id', $procesoId)
                ->where('dependencia_id', $dependenciaId)->where('tipo_documento', $tipo)->first();
            abort_unless($this->pdf->generadoVigente($generado, $tipo, $dependenciaId, $usuario)
                && $this->registro->provieneDelGenerado($previo, $generado), 409,
                'El PDF anterior no corresponde al PDF generado actual. Firme el documento generado.');
            abort_unless($previo->documento_firma_id === $documento->id && $this->registro->vigente($previo),
                409, 'El PDF anterior corresponde a otra versión. Firme los datos actuales.');
            abort_unless(Storage::disk('local')->exists($previo->firmado_path), 409, 'El documento firmado anterior no está disponible.');
            $contenido = Storage::disk('local')->get($previo->firmado_path);
            abort_unless(hash_equals($previo->firmado_sha256, hash('sha256', $contenido)), 409, 'El PDF firmado anterior no coincide con su huella.');
        } else {
            $borrador = FirmaBorrador::where('proceso_transferencia_id', $procesoId)
                ->where('dependencia_id', $dependenciaId)->where('tipo_documento', $tipo)->first();
            abort_unless($this->pdf->generadoVigente($borrador, $tipo, $dependenciaId, $usuario), 409,
                'Genere y revise el PDF actualizado en «PDF y firma» antes de firmar.');
            if ($borrador) {
                abort_unless($borrador->contenido_sha256 !== null
                    && hash_equals($documento->contenido_sha256, $borrador->contenido_sha256), 409,
                    'Los datos cambiaron o el borrador es anterior a esta actualización. Regenere y revise el PDF antes de firmar.');
                abort_unless(Storage::disk('local')->exists($borrador->pdf_path), 409, 'Regenere el PDF borrador antes de firmar.');
                $contenido = Storage::disk('local')->get($borrador->pdf_path);
                abort_unless(hash_equals($borrador->pdf_sha256, hash('sha256', $contenido)), 409,
                    'El PDF borrador no coincide con su huella. Regenérelo antes de firmar.');
            }
        }

        $id = (string) Str::uuid7();
        $token = Str::random(64);
        $ruta = 'firmaperu/'.$id.'/original.pdf';
        $paramUrl = $this->url('param');
        abort_unless(Storage::disk('local')->put($ruta, $contenido), 503, 'No se pudo conservar el PDF original.');
        try {
            $sesion = FirmaSesion::create([
                'id' => $id,
                'proceso_transferencia_id' => $procesoId,
                'dependencia_id' => $dependenciaId,
                'usuario_id' => $usuario->id,
                'firmante_dni' => $usuario->dni,
                'documento_previo_id' => $previo?->id,
                'tipo_documento' => $tipo,
                'documento_firma_id' => $documento->id,
                'caracter' => $caracter->value,
                'estado' => 'pendiente',
                'param_token_hash' => hash('sha256', $token),
                'pdf_path' => $ruta,
                'original_sha256' => hash('sha256', $contenido),
                'expires_at' => now()->addMinutes(max(1, min(60, (int) config('firmaperu.session_minutes')))),
            ]);
        } catch (Throwable $exception) {
            Storage::disk('local')->delete($ruta);
            throw $exception;
        }

        return ['sesion_id' => $id, 'param_token' => $token, 'param_url' => $paramUrl,
            'document_extension' => 'pdf', 'expires_at' => $sesion->expires_at->toIso8601String()];
    }

    public function parametros(string $token): string
    {
        $sesion = FirmaSesion::where('param_token_hash', hash('sha256', $token))->firstOrFail();
        $this->exigirVigente($sesion, 'pendiente');
        $jwt = $this->jwt();

        return DB::transaction(function () use ($sesion, $jwt): string {
            $sesion = FirmaSesion::whereKey($sesion->id)->lockForUpdate()->firstOrFail();
            $this->exigirVigente($sesion, 'pendiente');
            $descarga = Str::random(64);
            $subida = Str::random(64);
            $parametros = [
                'signatureFormat' => 'PAdES', 'signatureLevel' => 'B', 'signaturePackaging' => 'enveloped',
                'documentToSign' => $this->url('documento/'.$descarga),
                'certificateFilter' => '.*(?<![0-9])'.$sesion->firmante_dni.'(?![0-9]).*',
                'webTsa' => '', 'userTsa' => '', 'passwordTsa' => '',
                'theme' => 'claro', 'visiblePosition' => true, 'contactInfo' => $sesion->id,
                'signatureReason' => 'Suscripción del '.strtoupper($sesion->tipo_documento),
                'bachtOperation' => false, 'oneByOne' => true, 'signatureStyle' => 4,
                'imageToStamp' => '', 'stampTextSize' => 12, 'stampWordWrap' => 37,
                'role' => '', 'stampPage' => 1, 'positionx' => 60, 'positiony' => 70,
                'uploadDocumentSigned' => $this->url('subir-firmado/'.$subida),
                'certificationSignature' => false, 'token' => $jwt,
            ];
            $sesion->update(['estado' => 'emitida', 'document_token_hash' => hash('sha256', $descarga),
                'upload_token_hash' => hash('sha256', $subida)]);

            return base64_encode(json_encode($parametros, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
        });
    }

    public function documentoTemporal(string $token): FirmaSesion
    {
        $sesion = FirmaSesion::where('document_token_hash', hash('sha256', $token))->firstOrFail();
        $this->exigirVigente($sesion, 'emitida');

        return $sesion;
    }

    public function recibir(string $token, UploadedFile $archivo): FirmaSesion
    {
        $sesion = DB::transaction(function () use ($token): FirmaSesion {
            $sesion = FirmaSesion::where('upload_token_hash', hash('sha256', $token))->lockForUpdate()->firstOrFail();
            $this->exigirVigente($sesion, 'emitida');
            $sesion->update(['estado' => 'validando', 'mensaje' => null]);

            return $sesion;
        });

        $ruta = 'firmaperu/'.$sesion->id.'/firmado.pdf';
        try {
            $original = Storage::disk('local')->get($sesion->pdf_path);
            abort_unless(hash_equals($sesion->original_sha256, hash('sha256', $original)), 409, 'El original conservado no coincide con su huella.');
            $firmado = $archivo->getContent();
            $usuario = User::findOrFail($sesion->usuario_id);
            abort_unless($usuario->activo, 403, 'La cuenta que inició la firma está inactiva.');
            $this->registro->caracter($usuario, $sesion->tipo_documento, $sesion->dependencia_id);
            if (! $this->validador->tieneConfiguracion()) {
                abort_unless(Storage::disk('local')->put($ruta, $firmado), 503, 'No se pudo conservar el PDF recibido.');
                $sesion->update(['estado' => 'pendiente_validacion', 'firmado_path' => $ruta,
                    'firmado_sha256' => hash('sha256', $firmado),
                    'mensaje' => 'PDF recibido. La verificación del certificado está pendiente de configuración institucional.',
                    'detalles' => ['recibido_en' => now()->toIso8601String(), 'integridad_verificada' => false,
                        'cadena_verificada' => false]]);

                return $sesion;
            }
            $detalles = $this->validador->validar($original, $firmado, $sesion->firmante_dni);
            $this->registro->exigirFirmanteAsignado($sesion);
            abort_unless(Storage::disk('local')->put($ruta, $firmado), 503, 'No se pudo conservar el PDF firmado.');
            DB::transaction(function () use ($sesion, $ruta, $firmado, $detalles): void {
                $sesion->update(['estado' => 'firmada', 'firmado_path' => $ruta,
                    'firmado_sha256' => hash('sha256', $firmado), 'firmado_en' => now(), 'detalles' => $detalles]);
                $this->registro->registrar($sesion);
            });
        } catch (ValidationException $exception) {
            $sesion->update(['estado' => 'rechazada', 'mensaje' => $exception->errors()['signed_file'][0] ?? 'Firma rechazada.']);
            throw $exception;
        } catch (Throwable $exception) {
            Storage::disk('local')->delete($ruta);
            $sesion->update(['estado' => 'emitida', 'mensaje' => 'No se pudo procesar el archivo. Puede reintentar mientras la sesión esté vigente.']);
            throw $exception;
        }

        return $sesion;
    }

    public function validarPendiente(string $id): FirmaSesion
    {
        $this->validador->comprobarConfiguracion();
        $sesion = DB::transaction(function () use ($id): FirmaSesion {
            $sesion = FirmaSesion::whereKey($id)->lockForUpdate()->firstOrFail();
            abort_unless($sesion->estado === 'pendiente_validacion', 409, 'La sesión no tiene una validación pendiente.');
            $sesion->update(['estado' => 'validando']);

            return $sesion;
        });
        try {
            $original = Storage::disk('local')->get($sesion->pdf_path);
            $firmado = Storage::disk('local')->get($sesion->firmado_path);
            abort_unless(hash_equals($sesion->original_sha256, hash('sha256', $original))
                && hash_equals($sesion->firmado_sha256, hash('sha256', $firmado)), 409, 'Un archivo conservado no coincide con su huella.');
            $detalles = $this->validador->validar($original, $firmado, $sesion->firmante_dni);
            $this->registro->exigirFirmanteAsignado($sesion);
            DB::transaction(function () use ($sesion, $detalles): void {
                $sesion->update(['estado' => 'firmada', 'firmado_en' => now(), 'mensaje' => null,
                    'detalles' => array_merge($sesion->detalles ?? [], $detalles)]);
                $this->registro->registrar($sesion);
            });
        } catch (ValidationException $exception) {
            $sesion->update(['estado' => 'rechazada', 'mensaje' => $exception->errors()['signed_file'][0] ?? 'Firma rechazada.']);
            throw $exception;
        } catch (Throwable $exception) {
            $sesion->update(['estado' => 'pendiente_validacion']);
            throw $exception;
        }

        return $sesion;
    }

    private function exigirVigente(FirmaSesion $sesion, string $estado): void
    {
        abort_if($sesion->expirada(), 410, 'La sesión de firma expiró. Inicie una nueva firma.');
        abort_unless($sesion->estado === $estado, 409, 'Este token ya fue utilizado o la sesión no permite esta operación.');
    }

    private function jwt(): string
    {
        try {
            return $this->auth->obtenerJwtToken();
        } catch (RuntimeException $exception) {
            abort(503, $exception->getMessage());
        }
    }

    private function url(string $ruta): string
    {
        $base = rtrim((string) config('firmaperu.public_url'), '/');
        abort_unless(filter_var($base, FILTER_VALIDATE_URL)
            && in_array(parse_url($base, PHP_URL_SCHEME), ['http', 'https'], true)
            && ! parse_url($base, PHP_URL_QUERY) && ! parse_url($base, PHP_URL_FRAGMENT),
            503, 'Configure FIRMAPERU_PUBLIC_URL con la URL del backend accesible desde el firmador.');

        return $base.'/api/firmaperu/'.$ruta;
    }
}
