<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\FirmaBorrador;
use App\Modules\Transferencia\Models\FirmaSesion;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Modules\Transferencia\Services\FirmaperuAuthService;
use App\Modules\Transferencia\Services\FirmaperuPdfService;
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Mockery\MockInterface;
use Tests\TestCase;

class FirmaperuBorradorTest extends TestCase
{
    use RefreshDatabase;

    private const PDF = "%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\n%%EOF\n";

    private string $huella = 'contenido-original';

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesPermisosSeeder::class);
        Storage::fake('local');
        $this->mock(FirmaperuPdfService::class, function (MockInterface $mock): void {
            // Solo mockeamos la generación del binario; generarBorrador se ejerce real.
            $mock->makePartial();
            $mock->shouldReceive('generar')->andReturn(self::PDF);
            $mock->shouldReceive('capturar')->andReturnUsing(fn (): array => ['pdf' => self::PDF, 'huella' => hash('sha256', $this->huella)]);
            $mock->shouldReceive('huella')->andReturnUsing(fn (): string => hash('sha256', $this->huella));
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

    public function test_genera_borrador_sobrescribible_y_lo_reporta_en_estado(): void
    {
        $dep = $this->iniciarUsuario();

        $this->getJson('/api/firmaperu/estado/anexo03/'.$dep->id)
            ->assertOk()->assertJsonPath('data.borrador_generado', false)
            ->assertJsonPath('data.borrador_generado_en', null);

        $this->postJson('/api/firmaperu/generar-borrador', ['tipo_documento' => 'anexo03', 'dependencia_id' => $dep->id])
            ->assertCreated()->assertJsonPath('data.borrador_generado', true);

        $this->assertDatabaseCount('firma_borradores', 1);
        $borrador = FirmaBorrador::firstOrFail();
        Storage::disk('local')->assertExists($borrador->pdf_path);

        $this->getJson('/api/firmaperu/estado/anexo03/'.$dep->id)
            ->assertOk()->assertJsonPath('data.borrador_generado', true)
            ->assertJsonPath('data.version', null);

        // Re-generar sobrescribe: sigue siendo una sola fila, no versiona.
        $this->postJson('/api/firmaperu/generar-borrador', ['tipo_documento' => 'anexo03', 'dependencia_id' => $dep->id])
            ->assertCreated();
        $this->assertDatabaseCount('firma_borradores', 1);
        $this->assertDatabaseCount('documentos_firma', 0);
    }

    public function test_acta_requiere_permiso_actas_generar(): void
    {
        $dep = $this->iniciarUsuario(Rol::SERVIDOR);

        $this->postJson('/api/firmaperu/generar-borrador', ['tipo_documento' => 'anexo07', 'dependencia_id' => $dep->id])
            ->assertForbidden();
        $this->assertDatabaseCount('firma_borradores', 0);
    }

    public function test_ambito_impide_generar_borrador_de_otra_oficina(): void
    {
        $dep = $this->iniciarUsuario();
        $ajena = Dependencia::factory()->create(['proceso_transferencia_id' => $dep->proceso_transferencia_id]);

        $this->postJson('/api/firmaperu/generar-borrador', ['tipo_documento' => 'anexo03', 'dependencia_id' => $ajena->id])
            ->assertForbidden();
        $this->assertDatabaseCount('firma_borradores', 0);
    }

    public function test_valida_tipo_de_documento(): void
    {
        $dep = $this->iniciarUsuario();

        $this->postJson('/api/firmaperu/generar-borrador', ['tipo_documento' => 'inexistente', 'dependencia_id' => $dep->id])
            ->assertUnprocessable()->assertJsonValidationErrors('tipo_documento');
    }

    public function test_previsualizar_carga_el_borrador_persistido_si_existe(): void
    {
        $dep = $this->iniciarUsuario();

        // Sin borrador: previsualizar genera al vuelo.
        $this->get('/api/firmaperu/previsualizar?tipo_documento=anexo03&dependencia_id='.$dep->id)
            ->assertOk()->assertHeader('Content-Type', 'application/pdf')
            ->assertHeader('Content-Disposition', 'inline; filename="Previsualizacion-anexo03.pdf"');

        // Con borrador: previsualizar sirve el archivo persistido (nombre Borrador-*).
        $this->postJson('/api/firmaperu/generar-borrador', ['tipo_documento' => 'anexo03', 'dependencia_id' => $dep->id])
            ->assertCreated();
        $this->get('/api/firmaperu/previsualizar?tipo_documento=anexo03&dependencia_id='.$dep->id)
            ->assertOk()->assertHeader('Content-Type', 'application/pdf')
            ->assertHeader('Content-Disposition', 'inline; filename="Borrador-anexo03.pdf"');
    }

    public function test_firma_el_mismo_pdf_del_borrador_revisado(): void
    {
        $dep = $this->iniciarUsuario();
        config(['firmaperu.public_url' => 'https://transferencia.example']);
        $this->mock(FirmaperuAuthService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('obtenerJwtToken')->andReturn('jwt-de-prueba');
        });
        $datos = ['tipo_documento' => 'anexo03', 'dependencia_id' => $dep->id];
        $this->postJson('/api/firmaperu/generar-borrador', $datos)->assertCreated();
        $this->postJson('/api/firmaperu/preparar', $datos)->assertCreated();
        $sesion = FirmaSesion::firstOrFail();
        $this->assertSame(self::PDF, Storage::disk('local')->get($sesion->pdf_path));

        $this->huella = 'contenido-corregido';
        $this->postJson('/api/firmaperu/preparar', $datos)->assertConflict();
        $this->assertDatabaseCount('firma_sesiones', 1);
    }
}
