<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Modules\Transferencia\Services\FirmaperuValidadorService;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\Process\Process;
use Tests\TestCase;

class FirmaperuValidadorTest extends TestCase
{
    private string $directorio;

    protected function setUp(): void
    {
        parent::setUp();
        $this->directorio = sys_get_temp_dir().'/prueba-firma-'.Str::uuid();
        File::makeDirectory($this->directorio, 0700);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->directorio);
        parent::tearDown();
    }

    /** Crea una firma CMS real con certificado efímero; no es una firma institucional. */
    private function documento(): array
    {
        $clave = openssl_pkey_new(['private_key_bits' => 2048]);
        $csr = openssl_csr_new(['commonName' => 'FIRMANTE DNI 12345678'], $clave, ['digest_alg' => 'sha256']);
        $certificado = openssl_csr_sign($csr, null, $clave, 1, ['digest_alg' => 'sha256']);
        openssl_pkey_export_to_file($clave, $this->directorio.'/clave.pem');
        openssl_x509_export_to_file($certificado, $this->directorio.'/certificado.pem');
        config()->set('firmaperu.ca_bundle', $this->directorio.'/certificado.pem');
        config()->set('firmaperu.openssl_binary', 'openssl');
        $original = "%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\n%%EOF\n";
        $contenido = $original.'2 0 obj << /Type /Sig /SubFilter /adbe.pkcs7.detached /Reason (PRUEBA) /ByteRange [0 '.str_repeat('0', 20).' '.str_repeat('0', 20).' '.str_repeat('0', 20).'] /Contents <'.str_repeat('0', 16384)."> >> endobj\n%%EOF\n";
        $inicio = strpos($contenido, '<', strpos($contenido, '/Contents'));
        $fin = $inicio + 16386;
        $rango = sprintf('/ByteRange [0 %020d %020d %020d]', $inicio, $fin, strlen($contenido) - $fin);
        $contenido = preg_replace('/\/ByteRange\s*\[[^]]+\]/', $rango, $contenido);
        File::put($this->directorio.'/contenido.bin', substr($contenido, 0, $inicio).substr($contenido, $fin));
        $proceso = new Process(['openssl', 'cms', '-sign', '-binary', '-in', $this->directorio.'/contenido.bin',
            '-signer', $this->directorio.'/certificado.pem', '-inkey', $this->directorio.'/clave.pem',
            '-outform', 'DER', '-out', $this->directorio.'/firma.der']);
        $proceso->mustRun();
        $hex = bin2hex(File::get($this->directorio.'/firma.der'));
        $contenido = substr_replace($contenido, str_pad($hex, 16384, '0'), $inicio + 1, 16384);

        return [$original, $contenido];
    }

    public function test_verifica_cms_real_cadena_e_identidad(): void
    {
        [$original, $firmado] = $this->documento();

        $resultado = app(FirmaperuValidadorService::class)->validar($original, $firmado, '12345678');

        $this->assertTrue($resultado['integridad_verificada']);
        $this->assertTrue($resultado['cadena_verificada']);
        $this->assertSame('12345678', $resultado['firmante_dni']);
        $this->assertSame('no_comprobada', $resultado['revocacion']);
    }

    public function test_rechaza_alteracion_de_bytes_firmados(): void
    {
        [$original, $firmado] = $this->documento();
        $alterado = str_replace('/Reason (PRUEBA)', '/Reason (CAMBIO)', $firmado);
        $this->expectException(ValidationException::class);

        app(FirmaperuValidadorService::class)->validar($original, $alterado, '12345678');
    }

    public function test_rechaza_certificado_de_otro_dni(): void
    {
        [$original, $firmado] = $this->documento();
        $this->expectException(ValidationException::class);

        app(FirmaperuValidadorService::class)->validar($original, $firmado, '87654321');
    }

    public function test_rechaza_contenido_anadido_fuera_de_la_firma(): void
    {
        [$original, $firmado] = $this->documento();
        $this->expectException(ValidationException::class);

        app(FirmaperuValidadorService::class)->validar($original, $firmado.'datos sin firmar', '12345678');
    }

    public function test_rechaza_pdf_distinto_del_original_y_pdf_sin_firma(): void
    {
        [$original] = $this->documento();
        $this->expectException(ValidationException::class);

        app(FirmaperuValidadorService::class)->validar($original, '%PDF-1.7 documento ajeno', '12345678');
    }

    public function test_rechaza_original_devuelto_sin_firma(): void
    {
        [$original] = $this->documento();
        $this->expectException(ValidationException::class);

        app(FirmaperuValidadorService::class)->validar($original, $original."\n", '12345678');
    }

    public function test_rechaza_certificado_fuera_del_bundle_de_confianza(): void
    {
        [$original, $firmado] = $this->documento();
        $otraClave = openssl_pkey_new(['private_key_bits' => 2048]);
        $otraSolicitud = openssl_csr_new(['commonName' => 'Otra autoridad de prueba'], $otraClave);
        $otraAutoridad = openssl_csr_sign($otraSolicitud, null, $otraClave, 1);
        openssl_x509_export_to_file($otraAutoridad, $this->directorio.'/otra-ca.pem');
        config()->set('firmaperu.ca_bundle', $this->directorio.'/otra-ca.pem');
        $this->expectException(ValidationException::class);

        app(FirmaperuValidadorService::class)->validar($original, $firmado, '12345678');
    }

    public function test_exige_bundle_de_confianza_para_operar(): void
    {
        config()->set('firmaperu.ca_bundle', null);

        try {
            app(FirmaperuValidadorService::class)->comprobarConfiguracion();
            $this->fail('Debe requerir las autoridades de confianza.');
        } catch (HttpException $exception) {
            $this->assertSame(503, $exception->getStatusCode());
        }
    }
}
