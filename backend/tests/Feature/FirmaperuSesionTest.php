<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\FirmaSesion;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Modules\Transferencia\Services\FirmaperuAuthService;
use App\Modules\Transferencia\Services\FirmaperuPdfService;
use App\Modules\Transferencia\Services\FirmaperuValidadorService;
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\Sanctum;
use Mockery\MockInterface;
use Tests\TestCase;

class FirmaperuSesionTest extends TestCase
{
    use RefreshDatabase;

    private const PDF = "%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\n%%EOF\n";

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesPermisosSeeder::class);
        Storage::fake('local');
        config()->set('firmaperu.public_url', 'https://backend.example');
        $this->mock(FirmaperuAuthService::class, fn (MockInterface $mock) => $mock->shouldReceive('obtenerJwtToken')->andReturn('jwt-prueba'));
        $this->mock(FirmaperuPdfService::class, fn (MockInterface $mock) => $mock->shouldReceive('generar')->andReturn(self::PDF));
        $this->mock(FirmaperuValidadorService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('comprobarConfiguracion')->andReturnNull();
            $mock->shouldReceive('tieneConfiguracion')->andReturnTrue();
            $mock->shouldReceive('validar')->andReturn(['integridad_verificada' => true]);
        });
    }

    private function iniciarUsuario(Rol $rol = Rol::SERVIDOR): Dependencia
    {
        $proceso = ProcesoTransferencia::factory()->create();
        $dep = Dependencia::factory()->create(['proceso_transferencia_id' => $proceso->id]);
        $usuario = User::factory()->create(['dni' => '12345678', 'activo' => true]);
        AsignacionRol::factory()->rol($rol)->create(['user_id' => $usuario->id,
            'proceso_transferencia_id' => $proceso->id, 'dependencia_id' => $dep->id]);
        Sanctum::actingAs($usuario);

        return $dep;
    }

    private function preparar(Dependencia $dep, ?string $previo = null): array
    {
        return $this->postJson('/api/firmaperu/preparar', ['tipo_documento' => 'anexo03',
            'dependencia_id' => $dep->id, 'documento_previo_id' => $previo])->assertCreated()->json('data');
    }

    private function emitir(array $preparacion): array
    {
        $r = $this->post('/api/firmaperu/param', ['param_token' => $preparacion['param_token']])->assertOk();

        return json_decode(base64_decode($r->getContent()), true, flags: JSON_THROW_ON_ERROR);
    }

    private function subir(array $parametros): string
    {
        return parse_url($parametros['uploadDocumentSigned'], PHP_URL_PATH);
    }

    public function test_exige_autenticacion_para_preparar_y_descargar(): void
    {
        $this->postJson('/api/firmaperu/preparar', [])->assertUnauthorized();
        $this->getJson('/api/firmaperu/documentos/12345678-1234-4234-8234-123456789012/descargar')->assertUnauthorized();
        $this->assertDatabaseCount('firma_sesiones', 0);
    }

    public function test_prepara_emite_recibe_y_descarga_sin_perder_original(): void
    {
        $dep = $this->iniciarUsuario();
        $preparacion = $this->preparar($dep);
        $sesion = FirmaSesion::findOrFail($preparacion['sesion_id']);
        $this->assertSame(hash('sha256', $preparacion['param_token']), $sesion->param_token_hash);
        $this->assertSame('12345678', $sesion->firmante_dni);
        $parametros = $this->emitir($preparacion);
        $this->assertNotSame(basename($parametros['documentToSign']), basename($parametros['uploadDocumentSigned']));
        $this->get(parse_url($parametros['documentToSign'], PHP_URL_PATH))->assertOk()->assertDownload('documento.pdf');

        $this->post($this->subir($parametros), ['signed_file' => UploadedFile::fake()->createWithContent('firmado.pdf', self::PDF.'firmado')])
            ->assertOk()->assertJsonPath('data.estado', 'firmada');

        $this->assertDatabaseHas('firma_sesiones', ['id' => $sesion->id, 'estado' => 'firmada']);
        Storage::disk('local')->assertExists($sesion->pdf_path);
        $this->getJson('/api/firmaperu/sesiones/'.$sesion->id)->assertOk()->assertJsonPath('data.documento_id', $sesion->id)
            ->assertJsonMissingPath('data.param_token_hash')->assertJsonMissingPath('data.pdf_path');
        $this->getJson('/api/firmaperu/estado/anexo03/'.$dep->id)->assertOk()->assertJsonPath('data.firmado', true);
        $this->get('/api/firmaperu/documentos/'.$sesion->id.'/descargar')->assertOk()->assertDownload('ANEXO03-firmado.pdf');
    }

    public function test_parametros_y_subida_no_permiten_reutilizar_token(): void
    {
        $dep = $this->iniciarUsuario();
        $preparacion = $this->preparar($dep);
        $parametros = $this->emitir($preparacion);
        $this->post('/api/firmaperu/param', ['param_token' => $preparacion['param_token']])->assertConflict();
        $this->post($this->subir($parametros), ['signed_file' => UploadedFile::fake()->createWithContent('firmado.pdf', self::PDF)])->assertOk();

        $this->post($this->subir($parametros), ['signed_file' => UploadedFile::fake()->createWithContent('firmado.pdf', self::PDF)])->assertConflict();

        $this->assertDatabaseCount('firma_sesiones', 1);
    }

    public function test_token_expirado_no_entrega_documento_ni_recibe_archivo(): void
    {
        $dep = $this->iniciarUsuario();
        $preparacion = $this->preparar($dep);
        $parametros = $this->emitir($preparacion);
        $this->travel(16)->minutes();

        $this->get(parse_url($parametros['documentToSign'], PHP_URL_PATH))->assertGone();
        $this->post($this->subir($parametros), ['signed_file' => UploadedFile::fake()->createWithContent('firmado.pdf', self::PDF)])->assertGone();
        $this->getJson('/api/firmaperu/sesiones/'.$preparacion['sesion_id'])->assertJsonPath('data.estado', 'expirada');
        $this->assertDatabaseHas('firma_sesiones', ['id' => $preparacion['sesion_id'], 'firmado_path' => null]);
    }

    public function test_ambito_impide_preparar_consultar_y_descargar_otra_oficina(): void
    {
        $dep = $this->iniciarUsuario();
        $ajena = Dependencia::factory()->create(['proceso_transferencia_id' => $dep->proceso_transferencia_id]);
        $sesion = FirmaSesion::factory()->create(['proceso_transferencia_id' => $dep->proceso_transferencia_id,
            'dependencia_id' => $ajena->id, 'estado' => 'firmada']);

        $this->postJson('/api/firmaperu/preparar', ['tipo_documento' => 'anexo03', 'dependencia_id' => $ajena->id])->assertForbidden();
        $this->getJson('/api/firmaperu/sesiones/'.$sesion->id)->assertForbidden();
        $this->getJson('/api/firmaperu/estado/anexo03/'.$ajena->id)->assertForbidden();
        $this->getJson('/api/firmaperu/documentos/'.$sesion->id.'/descargar')->assertForbidden();
    }

    public function test_servidor_no_puede_preparar_acta_sin_permiso(): void
    {
        $dep = $this->iniciarUsuario();

        $this->postJson('/api/firmaperu/preparar', ['tipo_documento' => 'anexo07', 'dependencia_id' => $dep->id])->assertForbidden();
        $this->assertDatabaseCount('firma_sesiones', 0);
    }

    public function test_usuario_sin_permiso_no_puede_iniciar_firmas(): void
    {
        $dep = $this->iniciarUsuario(Rol::ADMINISTRADOR);

        $this->postJson('/api/firmaperu/preparar', ['tipo_documento' => 'anexo03', 'dependencia_id' => $dep->id])->assertForbidden();
        $this->assertDatabaseCount('firma_sesiones', 0);
    }

    public function test_valida_tipo_de_documento_y_archivo_antes_de_procesarlos(): void
    {
        $dep = $this->iniciarUsuario();
        $this->postJson('/api/firmaperu/preparar', ['tipo_documento' => 'inexistente', 'dependencia_id' => $dep->id])
            ->assertUnprocessable()->assertJsonValidationErrors('tipo_documento');
        $preparacion = $this->preparar($dep);
        $parametros = $this->emitir($preparacion);

        $this->postJson($this->subir($parametros), ['signed_file' => UploadedFile::fake()->createWithContent('archivo.txt', 'no es pdf')])
            ->assertUnprocessable()->assertJsonValidationErrors('signed_file');
        $this->assertDatabaseHas('firma_sesiones', ['id' => $preparacion['sesion_id'], 'estado' => 'emitida']);
    }

    public function test_rechazo_criptografico_no_publica_un_pdf_firmado(): void
    {
        $dep = $this->iniciarUsuario();
        $preparacion = $this->preparar($dep);
        $parametros = $this->emitir($preparacion);
        $this->mock(FirmaperuValidadorService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('tieneConfiguracion')->andReturnTrue();
            $mock->shouldReceive('validar')->andThrow(ValidationException::withMessages(['signed_file' => ['Firma inválida.']]));
        });

        $this->postJson($this->subir($parametros), ['signed_file' => UploadedFile::fake()->createWithContent('firmado.pdf', self::PDF)])
            ->assertUnprocessable();

        $this->getJson('/api/firmaperu/sesiones/'.$preparacion['sesion_id'])->assertJsonPath('data.estado', 'rechazada');
        $this->getJson('/api/firmaperu/estado/anexo03/'.$dep->id)->assertJsonPath('data.firmado', false);
        $this->getJson('/api/firmaperu/documentos/'.$preparacion['sesion_id'].'/descargar')->assertNotFound();
        Storage::disk('local')->assertMissing('firmaperu/'.$preparacion['sesion_id'].'/firmado.pdf');
    }

    public function test_agregar_firma_utiliza_bytes_del_pdf_anterior(): void
    {
        $dep = $this->iniciarUsuario();
        $preparacion = $this->preparar($dep);
        $parametros = $this->emitir($preparacion);
        $firmado = self::PDF.'firma-anterior';
        $this->post($this->subir($parametros), ['signed_file' => UploadedFile::fake()->createWithContent('firmado.pdf', $firmado)])->assertOk();

        $segunda = $this->preparar($dep, $preparacion['sesion_id']);

        $sesion = FirmaSesion::findOrFail($segunda['sesion_id']);
        $this->assertSame($preparacion['sesion_id'], $sesion->documento_previo_id);
        $this->assertSame($firmado, Storage::disk('local')->get($sesion->pdf_path));
        $this->assertDatabaseCount('firma_sesiones', 2);
    }

    public function test_estado_no_reutiliza_firma_de_un_proceso_anterior(): void
    {
        $dep = $this->iniciarUsuario();
        $anterior = ProcesoTransferencia::factory()->cerrado()->create();
        FirmaSesion::factory()->create(['proceso_transferencia_id' => $anterior->id,
            'dependencia_id' => $dep->id, 'estado' => 'firmada']);

        $this->getJson('/api/firmaperu/estado/anexo03/'.$dep->id)->assertOk()->assertJsonPath('data.firmado', false);
    }

    public function test_no_descarga_archivo_firmado_alterado_en_almacenamiento(): void
    {
        $dep = $this->iniciarUsuario();
        $preparacion = $this->preparar($dep);
        $parametros = $this->emitir($preparacion);
        $this->post($this->subir($parametros), ['signed_file' => UploadedFile::fake()->createWithContent('firmado.pdf', self::PDF)])->assertOk();
        $sesion = FirmaSesion::findOrFail($preparacion['sesion_id']);
        Storage::disk('local')->put($sesion->firmado_path, 'archivo alterado');

        $this->getJson('/api/firmaperu/documentos/'.$sesion->id.'/descargar')->assertConflict();
    }

    public function test_no_acepta_firma_si_cuenta_fue_desactivada_durante_la_sesion(): void
    {
        $dep = $this->iniciarUsuario();
        $preparacion = $this->preparar($dep);
        $parametros = $this->emitir($preparacion);
        $sesion = FirmaSesion::findOrFail($preparacion['sesion_id']);
        User::whereKey($sesion->usuario_id)->update(['activo' => false]);

        $this->postJson($this->subir($parametros), ['signed_file' => UploadedFile::fake()->createWithContent('firmado.pdf', self::PDF)])
            ->assertForbidden();
        $this->assertDatabaseHas('firma_sesiones', ['id' => $sesion->id, 'firmado_path' => null]);
    }

    public function test_sin_bundle_permite_iniciar_y_conserva_recepcion_sin_declarar_firma_verificada(): void
    {
        $dep = $this->iniciarUsuario();
        $this->mock(FirmaperuValidadorService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('tieneConfiguracion')->once()->andReturnFalse();
            $mock->shouldNotReceive('comprobarConfiguracion');
            $mock->shouldNotReceive('validar');
        });
        $preparacion = $this->preparar($dep);
        $parametros = $this->emitir($preparacion);

        $this->post($this->subir($parametros), ['signed_file' => UploadedFile::fake()->createWithContent('firmado.pdf', self::PDF)])
            ->assertOk()->assertJsonPath('data.estado', 'pendiente_validacion');

        $id = $preparacion['sesion_id'];
        $this->getJson('/api/firmaperu/sesiones/'.$id)->assertJsonPath('data.estado', 'pendiente_validacion')->assertJsonPath('data.documento_id', null);
        $this->getJson('/api/firmaperu/estado/anexo03/'.$dep->id)->assertJsonPath('data.firmado', false)
            ->assertJsonPath('data.pendiente_validacion', true)->assertJsonPath('data.sesion_pendiente_id', $id);
        $this->get('/api/firmaperu/documentos/'.$id.'/recibido')->assertOk()->assertDownload('ANEXO03-recibido-sin-verificar.pdf');
        $this->getJson('/api/firmaperu/documentos/'.$id.'/descargar')->assertNotFound();
        $this->post($this->subir($parametros), ['signed_file' => UploadedFile::fake()->createWithContent('firmado.pdf', self::PDF)])->assertConflict();

        $this->mock(FirmaperuValidadorService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('comprobarConfiguracion')->andReturnNull();
            $mock->shouldReceive('validar')->once()->andReturn(['integridad_verificada' => true, 'cadena_verificada' => true]);
        });
        $this->artisan('firmaperu:validar-pendientes', ['--id' => $id])->assertSuccessful();
        $this->assertDatabaseHas('firma_sesiones', ['id' => $id, 'estado' => 'firmada', 'mensaje' => null]);
        $this->get('/api/firmaperu/documentos/'.$id.'/descargar')->assertOk()->assertDownload('ANEXO03-firmado.pdf');
    }

    public function test_descarga_de_recibidos_pendientes_respeta_ambito(): void
    {
        $dep = $this->iniciarUsuario();
        $otra = Dependencia::factory()->create(['proceso_transferencia_id' => $dep->proceso_transferencia_id]);
        $sesion = FirmaSesion::factory()->create(['proceso_transferencia_id' => $dep->proceso_transferencia_id,
            'dependencia_id' => $otra->id, 'estado' => 'pendiente_validacion']);

        $this->getJson('/api/firmaperu/documentos/'.$sesion->id.'/recibido')->assertForbidden();
    }

    public function test_verificacion_diferida_rechaza_firma_invalida_sin_publicarla_como_verificada(): void
    {
        $dep = $this->iniciarUsuario();
        $ruta = 'firmaperu/prueba/recibido.pdf';
        Storage::disk('local')->put($ruta, self::PDF);
        Storage::disk('local')->put('firmaperu/prueba/original.pdf', self::PDF);
        $sesion = FirmaSesion::factory()->create(['proceso_transferencia_id' => $dep->proceso_transferencia_id,
            'dependencia_id' => $dep->id, 'estado' => 'pendiente_validacion', 'firmado_path' => $ruta,
            'original_sha256' => hash('sha256', self::PDF), 'firmado_sha256' => hash('sha256', self::PDF)]);
        $this->mock(FirmaperuValidadorService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('comprobarConfiguracion')->andReturnNull();
            $mock->shouldReceive('validar')->once()->andThrow(ValidationException::withMessages(['signed_file' => ['Firma inválida.']]));
        });

        $this->artisan('firmaperu:validar-pendientes', ['--id' => $sesion->id])->assertFailed();

        $this->assertDatabaseHas('firma_sesiones', ['id' => $sesion->id, 'estado' => 'rechazada', 'firmado_en' => null]);
        $this->getJson('/api/firmaperu/documentos/'.$sesion->id.'/descargar')->assertNotFound();
    }
}
