<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Modules\Transferencia\Services\FirmaperuAuthService;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Tests\TestCase;

class FirmaperuAuthTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config()->set([
            'firmaperu.client_id' => 'cliente-prueba',
            'firmaperu.client_secret' => 'secreto-prueba',
            'firmaperu.token_url' => 'https://firma.example/token',
        ]);
        Http::preventStrayRequests();
        $this->freezeTime();
    }

    #[DataProvider('formatosRespuesta')]
    public function test_obtiene_y_reutiliza_token_vigente(string $formato): void
    {
        $token = $this->token(now()->timestamp + 120);
        $cuerpo = match ($formato) {
            'objeto' => ['token' => $token],
            'cadena_json' => json_encode($token, JSON_THROW_ON_ERROR),
            default => $token,
        };
        Http::fake(['https://firma.example/token' => Http::response($cuerpo)]);
        $servicio = app(FirmaperuAuthService::class);

        $this->assertSame($token, $servicio->obtenerJwtToken());
        $this->assertSame($token, $servicio->obtenerJwtToken());
        Http::assertSentCount(1);
        Http::assertSent(fn (Request $request): bool => $request->method() === 'POST'
            && $request->hasHeader('Content-Type', 'application/x-www-form-urlencoded')
            && $request['client_id'] === 'cliente-prueba'
            && $request['client_secret'] === 'secreto-prueba');
    }

    public static function formatosRespuesta(): array
    {
        return ['objeto' => ['objeto'], 'JWT plano' => ['plano'], 'cadena JSON' => ['cadena_json']];
    }

    public function test_renueva_token_antes_de_su_vencimiento(): void
    {
        $primero = $this->token(now()->timestamp + 60);
        $segundo = $this->token(now()->timestamp + 3600);
        Http::fake(['https://firma.example/token' => Http::sequence()->push($primero)->push($segundo)]);
        $servicio = app(FirmaperuAuthService::class);
        $servicio->obtenerJwtToken();

        $this->travel(31)->seconds();

        $this->assertSame($segundo, $servicio->obtenerJwtToken());
        Http::assertSentCount(2);
    }

    public function test_cambiar_credenciales_no_reutiliza_token_anterior(): void
    {
        $primero = $this->token(now()->timestamp + 120);
        $segundo = $this->token(now()->timestamp + 240);
        Http::fake(['https://firma.example/token' => Http::sequence()->push($primero)->push($segundo)]);
        $servicio = app(FirmaperuAuthService::class);
        $servicio->obtenerJwtToken();

        config()->set('firmaperu.client_secret', 'nueva-credencial');

        $this->assertSame($segundo, $servicio->obtenerJwtToken());
        Http::assertSentCount(2);
    }

    public function test_permite_invalidar_token_para_renovacion_forzada(): void
    {
        $primero = $this->token(now()->timestamp + 120);
        $segundo = $this->token(now()->timestamp + 240);
        Http::fake(['https://firma.example/token' => Http::sequence()->push($primero)->push($segundo)]);
        $servicio = app(FirmaperuAuthService::class);
        $servicio->obtenerJwtToken();

        $servicio->invalidarCache();

        $this->assertSame($segundo, $servicio->obtenerJwtToken());
        Http::assertSentCount(2);
    }

    #[DataProvider('configuracionesInvalidas')]
    public function test_no_envia_credenciales_si_configuracion_es_invalida(string $clave, string $valor): void
    {
        config()->set('firmaperu.'.$clave, $valor);
        Http::fake();

        try {
            app(FirmaperuAuthService::class)->obtenerJwtToken();
            $this->fail('Debió rechazar la configuración.');
        } catch (RuntimeException $exception) {
            $this->assertStringNotContainsString('secreto-prueba', $exception->getMessage());
        }

        Http::assertNothingSent();
    }

    public static function configuracionesInvalidas(): array
    {
        return [
            'sin cliente' => ['client_id', ''],
            'sin secreto' => ['client_secret', ''],
            'sin URL' => ['token_url', ''],
            'HTTP sin TLS' => ['token_url', 'http://firma.example/token'],
            'URL inválida' => ['token_url', 'https://'],
        ];
    }

    public function test_error_del_proveedor_no_expone_su_cuerpo_ni_se_cachea(): void
    {
        $token = $this->token(now()->timestamp + 120);
        Http::fake(['https://firma.example/token' => Http::sequence()
            ->push('detalle privado: secreto-prueba', 401)
            ->push($token)]);
        $servicio = app(FirmaperuAuthService::class);

        try {
            $servicio->obtenerJwtToken();
            $this->fail('Debió rechazar la autenticación.');
        } catch (RuntimeException $exception) {
            $this->assertSame('Firma Perú rechazó la autenticación (HTTP 401).', $exception->getMessage());
        }

        $this->assertSame($token, $servicio->obtenerJwtToken());
        Http::assertSentCount(2);
    }

    public function test_error_de_conexion_tiene_mensaje_sin_credenciales(): void
    {
        Http::fake(['https://firma.example/token' => Http::failedConnection('detalle privado: secreto-prueba')]);
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('No se pudo conectar con Firma Perú. Intente nuevamente.');

        app(FirmaperuAuthService::class)->obtenerJwtToken();
    }

    #[DataProvider('tokensInvalidos')]
    public function test_rechaza_token_invalido_o_proximo_a_vencer(string $tipo): void
    {
        $token = match ($tipo) {
            'vencido' => $this->token(now()->timestamp - 1),
            'proximo' => $this->token(now()->timestamp + 30),
            'sin_exp' => 'e30.e30.firma-prueba',
            default => 'respuesta-invalida',
        };
        Http::fake(['https://firma.example/token' => Http::response(['token' => $token])]);
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Firma Perú devolvió un token inválido o próximo a vencer.');

        app(FirmaperuAuthService::class)->obtenerJwtToken();
    }

    public static function tokensInvalidos(): array
    {
        return ['vencido' => ['vencido'], 'margen de renovación' => ['proximo'],
            'sin expiración' => ['sin_exp'], 'malformado' => ['malformado']];
    }

    /** JWT sintético para comprobar renovación; no es una credencial real. */
    private function token(int $expira): string
    {
        return 'e30.'.rtrim(strtr(base64_encode(json_encode(['exp' => $expira], JSON_THROW_ON_ERROR)), '+/', '-_'), '=').'.firma-prueba';
    }
}
