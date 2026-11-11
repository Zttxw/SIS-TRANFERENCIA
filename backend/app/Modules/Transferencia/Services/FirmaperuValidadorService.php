<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Services;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\Process\Exception\ExceptionInterface;
use Symfony\Component\Process\Process;

class FirmaperuValidadorService
{
    public function tieneConfiguracion(): bool
    {
        $bundle = config('firmaperu.ca_bundle');

        return is_string($bundle) && is_file($bundle) && is_readable($bundle);
    }

    public function comprobarConfiguracion(): void
    {
        abort_unless($this->tieneConfiguracion(), 503,
            'Configure FIRMAPERU_CA_BUNDLE con las autoridades de confianza institucionales.');
    }

    /**
     * Verifica la revisión incremental, CMS, cadena de confianza e identidad.
     * La consulta de revocación OCSP/CRL y el perfil LTV requieren un servicio adicional.
     *
     * @return array<string, mixed>
     */
    public function validar(string $original, string $firmado, string $dni): array
    {
        $this->comprobarConfiguracion();
        if (! str_starts_with($firmado, '%PDF-') || ! str_starts_with($firmado, $original)
            || strlen($firmado) <= strlen($original)) {
            $this->rechazar('El PDF recibido no conserva la revisión original enviada a firmar.');
        }

        preg_match_all('/\/ByteRange\s*\[\s*0\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/', $firmado, $rangos, PREG_SET_ORDER);
        $rango = end($rangos);
        if (! $rango || ! preg_match('/\/SubFilter\s*\/(?:ETSI\.CAdES\.detached|adbe\.pkcs7\.detached)\b/', $firmado)) {
            $this->rechazar('No se encontró una firma PAdES compatible en el PDF.');
        }

        $inicioHueco = (int) $rango[1];
        $finHueco = (int) $rango[2];
        $longitudFinal = (int) $rango[3];
        if ($inicioHueco < strlen($original) || $finHueco <= $inicioHueco
            || $finHueco > strlen($firmado) || $longitudFinal !== strlen($firmado) - $finHueco) {
            $this->rechazar('La firma no cubre la totalidad de la revisión recibida.');
        }

        $hueco = substr($firmado, $inicioHueco, $finHueco - $inicioHueco);
        if (! preg_match('/\A<([\da-fA-F\s]+)>\z/', $hueco, $contenido)) {
            $this->rechazar('El contenedor de firma del PDF es inválido.');
        }
        $hex = preg_replace('/\s+/', '', $contenido[1]);
        if (strlen($hex) % 2 !== 0) {
            $this->rechazar('El contenedor de firma del PDF es inválido.');
        }

        $directorio = sys_get_temp_dir().'/firmaperu-'.Str::uuid();
        File::makeDirectory($directorio, 0700);
        try {
            File::put($directorio.'/firma.der', hex2bin($hex));
            File::put($directorio.'/contenido.bin', substr($firmado, 0, $inicioHueco).substr($firmado, $finHueco));
            $proceso = new Process([
                (string) config('firmaperu.openssl_binary', 'openssl'),
                'cms', '-verify', '-binary', '-inform', 'DER',
                '-in', $directorio.'/firma.der', '-content', $directorio.'/contenido.bin',
                '-CAfile', (string) config('firmaperu.ca_bundle'), '-purpose', 'any',
                '-signer', $directorio.'/firmantes.pem', '-out', $directorio.'/verificado.bin',
            ]);
            try {
                $proceso->setTimeout(30)->run();
            } catch (ExceptionInterface) {
                abort(503, 'No se pudo ejecutar la verificación criptográfica del PDF.');
            }
            if (! $proceso->isSuccessful()) {
                $this->rechazar('La firma es inválida o su certificado no pertenece a una autoridad de confianza configurada.');
            }

            $certificado = openssl_x509_read(File::get($directorio.'/firmantes.pem'));
            $datos = $certificado ? openssl_x509_parse($certificado) : false;
            $sujeto = is_array($datos) ? ($datos['subject'] ?? []) : [];
            $identidad = implode(' ', array_filter($sujeto, 'is_string'));
            if (! preg_match('/^\d{8}$/', $dni)
                || ! preg_match('/(?<!\d)'.preg_quote($dni, '/').'(?!\d)/', $identidad)) {
                $this->rechazar('El certificado del firmante no corresponde al DNI de quien inició la firma.');
            }

            return [
                'firmante_dni' => $dni,
                'firmante_nombre' => $sujeto['CN'] ?? '',
                'certificado_sha256' => openssl_x509_fingerprint($certificado, 'sha256'),
                'integridad_verificada' => true,
                'cadena_verificada' => true,
                'revocacion' => 'no_comprobada',
            ];
        } finally {
            File::deleteDirectory($directorio);
        }
    }

    private function rechazar(string $mensaje): never
    {
        throw ValidationException::withMessages(['signed_file' => [$mensaje]]);
    }
}
