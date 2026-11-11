<?php

declare(strict_types=1);

namespace App\Modules\Transferencia\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class FirmaperuAuthService
{
    public function obtenerJwtToken(): string
    {
        $credenciales = $this->credenciales();
        $clave = $this->claveCache($credenciales);
        $cache = Cache::get($clave);

        if (is_string($cache) && $this->segundosVigentes($cache) > 0) {
            return $cache;
        }

        try {
            $respuesta = Http::asForm()
                ->connectTimeout(5)
                ->timeout(15)
                ->withoutRedirecting()
                ->post($credenciales['token_url'], [
                    'client_id' => $credenciales['client_id'],
                    'client_secret' => $credenciales['client_secret'],
                ]);
        } catch (ConnectionException) {
            throw new RuntimeException('No se pudo conectar con Firma Perú. Intente nuevamente.');
        }

        if (! $respuesta->successful()) {
            throw new RuntimeException('Firma Perú rechazó la autenticación (HTTP '.$respuesta->status().').');
        }

        $datos = $respuesta->json();
        $token = is_array($datos) ? ($datos['token'] ?? null) : ($datos ?? trim($respuesta->body()));

        if (! is_string($token) || $this->segundosVigentes($token) <= 0) {
            throw new RuntimeException('Firma Perú devolvió un token inválido o próximo a vencer.');
        }

        Cache::put($clave, $token, $this->segundosVigentes($token));

        return $token;
    }

    public function invalidarCache(): void
    {
        Cache::forget($this->claveCache($this->credenciales()));
    }

    /** @return array{client_id: string, client_secret: string, token_url: string} */
    private function credenciales(): array
    {
        $credenciales = [
            'client_id' => (string) config('firmaperu.client_id'),
            'client_secret' => (string) config('firmaperu.client_secret'),
            'token_url' => (string) config('firmaperu.token_url'),
        ];

        foreach ($credenciales as $valor) {
            if (trim($valor) === '') {
                throw new RuntimeException('Falta configurar las credenciales institucionales de Firma Perú.');
            }
        }

        if (! filter_var($credenciales['token_url'], FILTER_VALIDATE_URL)
            || parse_url($credenciales['token_url'], PHP_URL_SCHEME) !== 'https') {
            throw new RuntimeException('La URL de autenticación de Firma Perú debe usar HTTPS.');
        }

        return $credenciales;
    }

    /** @param array{client_id: string, client_secret: string, token_url: string} $credenciales */
    private function claveCache(array $credenciales): string
    {
        return 'firmaperu:jwt:'.hash('sha256', json_encode($credenciales, JSON_THROW_ON_ERROR));
    }

    /**
     * Lee exp solo para programar la renovación; no verifica la firma del JWT.
     * El token se obtiene exclusivamente del servidor institucional mediante TLS.
     */
    private function segundosVigentes(string $token): int
    {
        $partes = explode('.', $token);
        if (count($partes) !== 3 || $partes[0] === '' || $partes[2] === '') {
            return 0;
        }

        $payload = strtr($partes[1], '-_', '+/');
        $payload .= str_repeat('=', (4 - strlen($payload) % 4) % 4);
        $contenido = base64_decode($payload, true);
        $claims = $contenido === false ? null : json_decode($contenido, true);
        $expira = is_array($claims) ? ($claims['exp'] ?? null) : null;

        return is_int($expira) ? max(0, $expira - now()->timestamp - 30) : 0;
    }
}
