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
use App\Support\Enums\EstadoEntrega;
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Mockery\MockInterface;
use Tests\Concerns\PreparaEntregas;
use Tests\TestCase;

/**
 * Firma institucional del Anexo 01 (fase 6): al cierre, cuando el ETTE recibió
 * todas las entregas de los CC que envían al ETTS, firman digitalmente el ETTS
 * (lado entidad) y un titular ETTE (lado ETTE), en orden libre.
 */
class FirmaAnexo01CierreTest extends TestCase
{
    use PreparaEntregas, RefreshDatabase;

    private const PDF = "%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\n%%EOF\n";

    private ProcesoTransferencia $proceso;

    private Dependencia $raiz;

    private User $etts;

    private User $titular;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesPermisosSeeder::class);
        Storage::fake('local');
        config()->set('firmaperu.public_url', 'https://backend.example');
        $this->mock(FirmaperuAuthService::class, fn (MockInterface $mock) => $mock->shouldReceive('obtenerJwtToken')->andReturn('jwt-prueba'));
        $this->mock(FirmaperuPdfService::class, function (MockInterface $mock): void {
            $mock->makePartial();
            $mock->shouldReceive('huella')->andReturn(hash('sha256', self::PDF));
            $mock->shouldReceive('capturar')->andReturn(['pdf' => self::PDF, 'huella' => hash('sha256', self::PDF)]);
        });
        $this->mock(FirmaperuValidadorService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('tieneConfiguracion')->andReturnTrue();
            $mock->shouldReceive('validar')->andReturn(['integridad_verificada' => true]);
        });

        $this->proceso = ProcesoTransferencia::factory()->create();
        $this->raiz = Dependencia::factory()->create(['proceso_transferencia_id' => $this->proceso->id]);
        $this->etts = $this->usuario(Rol::ETTS);
        $this->titular = $this->usuario(Rol::ETTE);
    }

    private function usuario(Rol $rol, ?int $dependenciaId = null): User
    {
        $usuario = User::factory()->create(['dni' => fake()->unique()->numerify('########'), 'activo' => true]);
        AsignacionRol::factory()->rol($rol)->create(['user_id' => $usuario->id,
            'proceso_transferencia_id' => $this->proceso->id, 'dependencia_id' => $dependenciaId]);

        return $usuario;
    }

    private function cerrarCadena(): void
    {
        $this->entregaEn($this->raiz, EstadoEntrega::RECIBIDA_ETTE);
        Sanctum::actingAs($this->etts);
        $this->postJson('/api/firmaperu/anexo01/generar')->assertCreated();
    }

    private function firmar(User $firmante): FirmaSesion
    {
        Sanctum::actingAs($firmante);
        $preparacion = $this->postJson('/api/firmaperu/anexo01/preparar')->assertCreated()->json('data');
        $parametros = json_decode(base64_decode($this->post('/api/firmaperu/param',
            ['param_token' => $preparacion['param_token']])->assertOk()->getContent()), true);
        $this->post(parse_url($parametros['uploadDocumentSigned'], PHP_URL_PATH), ['signed_file' => UploadedFile::fake()
            ->createWithContent('firmado.pdf', self::PDF.'firma-'.$firmante->dni)])->assertOk();

        return FirmaSesion::findOrFail($preparacion['sesion_id']);
    }

    public function test_no_se_genera_ni_firma_antes_de_que_el_ette_reciba_todo(): void
    {
        $this->entregaEn($this->raiz, EstadoEntrega::REMITIDA_ETTE);
        Sanctum::actingAs($this->etts);

        $this->postJson('/api/firmaperu/anexo01/generar')->assertConflict();
        $this->postJson('/api/firmaperu/anexo01/preparar')->assertConflict();
        $this->getJson('/api/firmaperu/anexo01/estado')->assertOk()->assertJsonPath('data.firma_habilitada', false);
    }

    public function test_el_etts_y_el_titular_ette_firman_en_una_misma_cadena(): void
    {
        $this->cerrarCadena();

        $ette = $this->firmar($this->titular);
        $final = $this->firmar($this->etts);

        $this->assertNull($final->dependencia_id);
        $this->assertSame($ette->id, $final->documento_previo_id);
        $this->assertDatabaseHas('firmas_anexo', ['firma_sesion_id' => $ette->id, 'lado' => 'ette', 'en_calidad_de' => 'titular']);
        $this->getJson('/api/firmaperu/anexo01/estado')->assertOk()
            ->assertJsonPath('data.completo', true)
            ->assertJsonPath('data.mi_lado.lado', 'entidad');
        $this->get('/api/firmaperu/anexo01/pdf')->assertOk()->assertHeader('content-type', 'application/pdf');
        $this->getJson("/api/firmaperu/sesiones/{$final->id}")->assertOk()->assertJsonPath('data.vigente', true);
    }

    public function test_solo_el_etts_genera_el_anexo_01(): void
    {
        $this->entregaEn($this->raiz, EstadoEntrega::RECIBIDA_ETTE);
        Sanctum::actingAs($this->titular);

        $this->postJson('/api/firmaperu/anexo01/generar')->assertForbidden();
    }

    public function test_un_responsable_de_cc_no_firma_ni_ve_la_sesion_institucional(): void
    {
        $this->cerrarCadena();
        $sesion = $this->firmar($this->etts);
        $responsable = $this->usuario(Rol::RESPONSABLE_CENTRO_COSTO, $this->raiz->id);
        Sanctum::actingAs($responsable);

        $this->postJson('/api/firmaperu/anexo01/preparar')->assertForbidden();
        $this->getJson("/api/firmaperu/sesiones/{$sesion->id}")->assertForbidden();
    }

    public function test_el_anexo_01_ya_no_se_firma_por_centro_de_costo(): void
    {
        $responsable = $this->usuario(Rol::RESPONSABLE_CENTRO_COSTO, $this->raiz->id);
        $this->entregaEn($this->raiz);
        Sanctum::actingAs($responsable);

        $this->postJson('/api/firmaperu/generar-borrador', ['tipo_documento' => 'anexo01', 'dependencia_id' => $this->raiz->id])
            ->assertUnprocessable();
        $this->postJson('/api/firmaperu/preparar', ['lado' => 'entidad', 'tipo_documento' => 'anexo01', 'dependencia_id' => $this->raiz->id])
            ->assertUnprocessable();
    }
}
