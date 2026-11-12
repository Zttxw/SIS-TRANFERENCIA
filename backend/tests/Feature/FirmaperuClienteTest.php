<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class FirmaperuClienteTest extends TestCase
{
    private const ORIGEN = 'https://resources.firmaperu.gob.pe/app/clickonce/clienteweb/';

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        Http::preventStrayRequests();
    }

    public function test_entrega_manifiesto_sin_modificar_firma_y_con_tipo_clickonce(): void
    {
        $contenido = "<?xml version=\"1.0\"?>\r\n<assembly><Signature>firma-original</Signature></assembly>";
        Http::fake([self::ORIGEN.'FirmaPeruWeb.application' => Http::response($contenido, 200, ['Content-Type' => 'binary/octet-stream'])]);

        $r = $this->get('/api/firmaperu/cliente/FirmaPeruWeb.application?port=48596', ['Authorization' => 'Bearer no-reenviar']);

        $r->assertOk()->assertHeader('Content-Type', 'application/x-ms-application')
            ->assertHeader('Content-Disposition', 'inline; filename="FirmaPeruWeb.application"');
        $this->assertSame($contenido, $r->getContent());
        Http::assertSent(fn (Request $request): bool => $request->url() === self::ORIGEN.'FirmaPeruWeb.application'
            && ! $request->hasHeader('Authorization'));
    }

    #[DataProvider('archivosDependientes')]
    public function test_resuelve_dependencias_relativas_y_conserva_sus_bytes(string $archivo, string $tipo): void
    {
        $ruta = 'Application Files/FirmaPeruWeb_1_1_0_2/'.$archivo;
        $rutaHttp = implode('/', array_map('rawurlencode', explode('/', $ruta)));
        $contenido = "archivo-oficial\0\xFF\r\n";
        Http::fake([self::ORIGEN.$rutaHttp => Http::response($contenido)]);

        $r = $this->get('/api/firmaperu/cliente/'.$rutaHttp);

        $r->assertOk()->assertHeader('Content-Type', $tipo);
        $this->assertSame($contenido, $r->getContent());
        Http::assertSentCount(1);
    }

    public static function archivosDependientes(): array
    {
        return [
            'manifiesto de aplicacion' => ['FirmaPeruWeb.exe.manifest', 'application/x-ms-manifest'],
            'ejecutable' => ['FirmaPeruWeb.exe', 'application/octet-stream'],
            'biblioteca' => ['Utils.dll', 'application/octet-stream'],
            'java' => ['firmaperuclienteweb.jar', 'application/octet-stream'],
            'archivo x64' => ['x64/7z.dll', 'application/octet-stream'],
        ];
    }

    public function test_reutiliza_cache_y_actualiza_manifiesto_de_inicio_al_vencer(): void
    {
        $this->freezeTime();
        Http::fake([self::ORIGEN.'FirmaPeruWeb.application' => Http::sequence()->push('version1')->push('version2')]);
        $this->get('/api/firmaperu/cliente/FirmaPeruWeb.application')->assertOk();
        $this->get('/api/firmaperu/cliente/FirmaPeruWeb.application')->assertOk();
        Http::assertSentCount(1);

        $this->travel(6)->minutes();

        $r = $this->get('/api/firmaperu/cliente/FirmaPeruWeb.application')->assertOk();
        $this->assertSame('version2', $r->getContent());
        Http::assertSentCount(2);
    }

    #[DataProvider('rutasProhibidas')]
    public function test_rechaza_rutas_fuera_del_paquete_sin_contactar_al_proveedor(string $archivo): void
    {
        Http::fake();

        $this->get('/api/firmaperu/cliente/'.$archivo)->assertNotFound();

        Http::assertNothingSent();
    }

    public static function rutasProhibidas(): array
    {
        return [
            'credenciales' => ['fwAuthorization.json'],
            'otra aplicacion' => ['Otra.application'],
            'fuera de version' => ['Application%20Files/Utils.dll'],
            'archivo privado' => ['Application%20Files/FirmaPeruWeb_1_1_0_2/secret.env'],
            'traversal' => ['Application%20Files/FirmaPeruWeb_1_1_0_2/..%2FUtils.dll'],
            'origen externo' => ['https%3A%2F%2Fexample.com%2Fmalware.exe'],
        ];
    }

    public function test_rechaza_redireccion_del_proveedor_en_lugar_de_seguir_otro_origen(): void
    {
        Http::fake([self::ORIGEN.'FirmaPeruWeb.application' => Http::response('', 302, ['Location' => 'https://otro.example/archivo'])]);

        $this->get('/api/firmaperu/cliente/FirmaPeruWeb.application')->assertStatus(502);

        Http::assertSentCount(1);
    }

    public function test_fallo_de_conexion_no_publica_respuesta_como_manifiesto(): void
    {
        Http::fake([self::ORIGEN.'FirmaPeruWeb.application' => Http::failedConnection()]);

        $this->get('/api/firmaperu/cliente/FirmaPeruWeb.application')->assertStatus(502);
        Storage::disk('local')->assertDirectoryEmpty('firmaperu-cliente-cache');
    }
}
