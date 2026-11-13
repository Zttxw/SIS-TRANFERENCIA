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
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Mockery\MockInterface;
use Tests\TestCase;

/**
 * Subida manual del delegado ETTE (GAP 1 del portal del delegado): el delegado
 * firma/sella a mano el PDF del anexo y lo sube como constancia de su firma
 * OPCIONAL, sin applet ni verificación criptográfica.
 */
class FirmaperuSubirManualTest extends TestCase
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
        $this->mock(FirmaperuPdfService::class, function (MockInterface $mock): void {
            $mock->makePartial();
            $mock->shouldReceive('generar')->andReturn(self::PDF);
            $mock->shouldReceive('huella')->andReturn(hash('sha256', self::PDF));
            $mock->shouldReceive('capturar')->andReturn(['pdf' => self::PDF, 'huella' => hash('sha256', self::PDF)]);
        });
    }

    /** @return array{proceso: ProcesoTransferencia, dep: Dependencia, delegado: User, encargado: User} */
    private function escenario(): array
    {
        $proceso = ProcesoTransferencia::factory()->create();
        $dep = Dependencia::factory()->create(['proceso_transferencia_id' => $proceso->id]);

        // El responsable genera el PDF vigente del anexo (lo que el delegado firmará a mano).
        $encargado = User::factory()->create(['dni' => '87654321', 'activo' => true]);
        AsignacionRol::factory()->rol(Rol::RESPONSABLE_CENTRO_COSTO)->create([
            'user_id' => $encargado->id, 'proceso_transferencia_id' => $proceso->id, 'dependencia_id' => $dep->id,
        ]);
        Sanctum::actingAs($encargado);
        $this->postJson('/api/firmaperu/generar-borrador', ['tipo_documento' => 'anexo03', 'dependencia_id' => $dep->id])->assertCreated();

        $delegado = User::factory()->create(['dni' => '12345678', 'activo' => true]);
        AsignacionRol::factory()->rol(Rol::DELEGADO_ETTE)->create([
            'user_id' => $delegado->id, 'proceso_transferencia_id' => $proceso->id, 'dependencia_id' => $dep->id,
        ]);

        return compact('proceso', 'dep', 'delegado', 'encargado');
    }

    private function pdfFake(string $contenido = self::PDF): UploadedFile
    {
        return UploadedFile::fake()->createWithContent('firmado-a-mano.pdf', $contenido.'firma-manuscrita');
    }

    public function test_delegado_sube_firma_manual_como_constancia_pendiente_de_validacion(): void
    {
        ['dep' => $dep, 'delegado' => $delegado] = $this->escenario();
        Sanctum::actingAs($delegado);

        $resp = $this->postJson('/api/firmaperu/subir-manual', [
            'tipo_documento' => 'anexo03', 'dependencia_id' => $dep->id, 'signed_file' => $this->pdfFake(),
        ])->assertCreated()->assertJsonPath('data.estado', 'pendiente_validacion');

        $id = $resp->json('data.sesion_id');
        $this->assertDatabaseHas('firma_sesiones', [
            'id' => $id, 'estado' => 'pendiente_validacion', 'origen' => 'manual',
            'caracter' => 'opcional', 'usuario_id' => $delegado->id,
        ]);

        // Queda como recepción visible y descargable, no como firma verificada.
        $this->getJson("/api/firmaperu/estado/anexo03/{$dep->id}")->assertOk()
            ->assertJsonPath('data.firmado', false)
            ->assertJsonPath('data.pendiente_validacion', true)
            ->assertJsonPath('data.sesion_pendiente_id', $id);
        $this->get("/api/firmaperu/documentos/{$id}/recibido")->assertOk()->assertDownload('ANEXO03-recibido-sin-verificar.pdf');
    }

    public function test_el_ambito_impide_subir_a_otra_dependencia(): void
    {
        ['proceso' => $proceso, 'delegado' => $delegado] = $this->escenario();
        $ajena = Dependencia::factory()->create(['proceso_transferencia_id' => $proceso->id]);
        Sanctum::actingAs($delegado);

        $this->postJson('/api/firmaperu/subir-manual', [
            'tipo_documento' => 'anexo03', 'dependencia_id' => $ajena->id, 'signed_file' => $this->pdfFake(),
        ])->assertForbidden();
        $this->assertDatabaseCount('firma_sesiones', 0);
    }

    public function test_requiere_pdf_generado_vigente(): void
    {
        $proceso = ProcesoTransferencia::factory()->create();
        $dep = Dependencia::factory()->create(['proceso_transferencia_id' => $proceso->id]);
        $delegado = User::factory()->create(['dni' => '12345678', 'activo' => true]);
        AsignacionRol::factory()->rol(Rol::DELEGADO_ETTE)->create([
            'user_id' => $delegado->id, 'proceso_transferencia_id' => $proceso->id, 'dependencia_id' => $dep->id,
        ]);
        Sanctum::actingAs($delegado);

        // Sin PDF generado del anexo, no hay nada firmable a mano.
        $this->postJson('/api/firmaperu/subir-manual', [
            'tipo_documento' => 'anexo03', 'dependencia_id' => $dep->id, 'signed_file' => $this->pdfFake(),
        ])->assertStatus(409);
        $this->assertDatabaseCount('firma_sesiones', 0);
    }

    public function test_un_responsable_no_usa_la_subida_manual_opcional(): void
    {
        ['dep' => $dep, 'encargado' => $encargado] = $this->escenario();
        // El responsable tiene firma OBLIGATORIA: la subida manual (opcional) no es su vía.
        Sanctum::actingAs($encargado);

        $this->postJson('/api/firmaperu/subir-manual', [
            'tipo_documento' => 'anexo03', 'dependencia_id' => $dep->id, 'signed_file' => $this->pdfFake(),
        ])->assertForbidden();
    }

    public function test_valida_archivo_pdf(): void
    {
        ['dep' => $dep, 'delegado' => $delegado] = $this->escenario();
        Sanctum::actingAs($delegado);

        $this->postJson('/api/firmaperu/subir-manual', [
            'tipo_documento' => 'anexo03', 'dependencia_id' => $dep->id,
            'signed_file' => UploadedFile::fake()->createWithContent('no.txt', 'no es pdf'),
        ])->assertUnprocessable()->assertJsonValidationErrors('signed_file');
    }
}
