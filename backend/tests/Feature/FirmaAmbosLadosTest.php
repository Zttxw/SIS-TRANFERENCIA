<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\CronogramaActividad;
use App\Modules\Transferencia\Models\FirmaSesion;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Modules\Transferencia\Services\FirmaperuAuthService;
use App\Modules\Transferencia\Services\FirmaperuPdfService;
use App\Modules\Transferencia\Services\FirmaperuValidadorService;
use App\Support\Enums\EstadoEntrega;
use App\Support\Enums\OperacionCronograma;
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Mockery\MockInterface;
use Tests\Concerns\PreparaEntregas;
use Tests\TestCase;

/**
 * Firma de ambos lados en orden libre (D-05, D-06): el responsable firma
 * siempre digitalmente; el lado ETTE (coordinador o titular suplente) firma
 * digital o a mano, pero a mano solo antes de cualquier firma digital. Ambas
 * firmas deben quedar en la misma cadena de PDF.
 */
class FirmaAmbosLadosTest extends TestCase
{
    use PreparaEntregas, RefreshDatabase;

    private const PDF = "%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\n%%EOF\n";

    private Dependencia $dep;

    private User $responsable;

    private User $coordinador;

    /** Contenido de los datos del anexo: cambiarlo cambia su huella. */
    private string $datos = self::PDF;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesPermisosSeeder::class);
        Storage::fake('local');
        config()->set('firmaperu.public_url', 'https://backend.example');
        $this->mock(FirmaperuAuthService::class, fn (MockInterface $mock) => $mock->shouldReceive('obtenerJwtToken')->andReturn('jwt-prueba'));
        $this->mock(FirmaperuPdfService::class, function (MockInterface $mock): void {
            $mock->makePartial();
            $mock->shouldReceive('huella')->andReturnUsing(fn (): string => hash('sha256', $this->datos));
            $mock->shouldReceive('capturar')->andReturn(['pdf' => self::PDF, 'huella' => hash('sha256', self::PDF)]);
        });
        $this->mock(FirmaperuValidadorService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('tieneConfiguracion')->andReturnTrue();
            $mock->shouldReceive('validar')->andReturn(['integridad_verificada' => true]);
        });

        $proceso = ProcesoTransferencia::factory()->create();
        $this->dep = Dependencia::factory()->create(['proceso_transferencia_id' => $proceso->id]);
        $this->entregaEn($this->dep);
        $this->coordinador = $this->usuario(Rol::DELEGADO_ETTE, $this->dep->id);
        $this->responsable = $this->usuario(Rol::RESPONSABLE_CENTRO_COSTO, $this->dep->id);
        $this->postJson('/api/firmaperu/generar-borrador', ['tipo_documento' => 'anexo03', 'dependencia_id' => $this->dep->id])->assertCreated();
    }

    private function usuario(Rol $rol, ?int $dependenciaId): User
    {
        $usuario = User::factory()->create(['dni' => fake()->unique()->numerify('########'), 'activo' => true]);
        AsignacionRol::factory()->rol($rol)->create(['user_id' => $usuario->id,
            'proceso_transferencia_id' => $this->dep->proceso_transferencia_id, 'dependencia_id' => $dependenciaId]);
        Sanctum::actingAs($usuario);

        return $usuario;
    }

    /** @param array<string, string> $extra */
    private function firmarDigital(User $firmante, array $extra = []): FirmaSesion
    {
        Sanctum::actingAs($firmante);
        $preparacion = $this->postJson('/api/firmaperu/preparar', ['tipo_documento' => 'anexo03',
            'dependencia_id' => $this->dep->id, ...$extra])->assertCreated()->json('data');
        $parametros = json_decode(base64_decode($this->post('/api/firmaperu/param',
            ['param_token' => $preparacion['param_token']])->assertOk()->getContent()), true);
        $this->post(parse_url($parametros['uploadDocumentSigned'], PHP_URL_PATH), ['signed_file' => UploadedFile::fake()
            ->createWithContent('firmado.pdf', self::PDF.'firma-'.$firmante->dni)])->assertOk();

        return FirmaSesion::findOrFail($preparacion['sesion_id']);
    }

    private function subirManuscrita(User $firmante, ?string $motivo = null): TestResponse
    {
        Sanctum::actingAs($firmante);

        return $this->postJson('/api/firmaperu/subir-manual', ['tipo_documento' => 'anexo03', 'dependencia_id' => $this->dep->id,
            'motivo_suplencia' => $motivo, 'signed_file' => UploadedFile::fake()->createWithContent('escaneo.pdf', self::PDF.'firma-a-mano')]);
    }

    private function estado(): TestResponse
    {
        Sanctum::actingAs($this->responsable);

        return $this->getJson('/api/firmaperu/estado/anexo03/'.$this->dep->id)->assertOk();
    }

    public function test_ette_manuscrita_primero_y_el_responsable_firma_digital_sobre_el_escaneo(): void
    {
        $id = $this->subirManuscrita($this->coordinador)->assertCreated()->assertJsonPath('data.estado', 'firmada')->json('data.sesion_id');
        $this->assertDatabaseHas('firmas_anexo', ['firma_sesion_id' => $id, 'lado' => 'ette', 'estado' => 'firmada']);
        $this->estado()->assertJsonPath('data.completo', false)->assertJsonPath('data.ette.origen', 'manuscrita')
            ->assertJsonPath('data.hay_firma_digital', false);

        $final = $this->firmarDigital($this->responsable);

        $this->assertSame($id, $final->documento_previo_id);
        $this->assertSame(self::PDF.'firma-a-mano', Storage::disk('local')->get($final->pdf_path));
        $this->estado()->assertJsonPath('data.completo', true)->assertJsonPath('data.documento_id', $final->id)
            ->assertJsonPath('data.entidad.origen', 'digital');
    }

    public function test_ette_digital_primero_y_luego_el_responsable(): void
    {
        $ette = $this->firmarDigital($this->coordinador);
        $final = $this->firmarDigital($this->responsable);

        $this->assertSame($ette->id, $final->documento_previo_id);
        $this->estado()->assertJsonPath('data.completo', true);
    }

    public function test_responsable_primero_y_el_ette_firma_digital_encima(): void
    {
        $entidad = $this->firmarDigital($this->responsable);
        $final = $this->firmarDigital($this->coordinador);

        $this->assertSame($entidad->id, $final->documento_previo_id);
        $this->estado()->assertJsonPath('data.completo', true)->assertJsonPath('data.ette.en_calidad_de', 'coordinador');
    }

    public function test_con_una_firma_digital_se_rechaza_la_manuscrita(): void
    {
        $this->firmarDigital($this->responsable);

        $this->subirManuscrita($this->coordinador)->assertConflict()
            ->assertJsonPath('message', 'Ya existe una firma digital; la firma del coordinador debe ser digital para no invalidarla.');
        $this->assertDatabaseMissing('firma_sesiones', ['origen' => 'manual']);
    }

    public function test_el_titular_ette_firma_en_suplencia_solo_con_motivo(): void
    {
        $titular = $this->usuario(Rol::ETTE, null);

        $this->subirManuscrita($titular)->assertUnprocessable()->assertJsonValidationErrors('motivo_suplencia');
        $id = $this->subirManuscrita($titular, 'Coordinador de licencia')->assertCreated()->json('data.sesion_id');

        $this->assertDatabaseHas('firmas_anexo', ['firma_sesion_id' => $id, 'lado' => 'ette',
            'en_calidad_de' => 'titular_suplente', 'motivo_suplencia' => 'Coordinador de licencia']);
        $this->firmarDigital($this->responsable);
        $this->estado()->assertJsonPath('data.completo', true)->assertJsonPath('data.ette.en_calidad_de', 'titular_suplente');
    }

    public function test_el_responsable_no_sube_firma_manuscrita(): void
    {
        $this->subirManuscrita($this->responsable)->assertForbidden();
    }

    public function test_no_se_firma_antes_de_que_el_coordinador_acepte_la_entrega(): void
    {
        $this->entregaEn($this->dep, EstadoEntrega::EN_REVISION);

        $this->subirManuscrita($this->coordinador)->assertConflict();
        Sanctum::actingAs($this->responsable);
        $this->postJson('/api/firmaperu/preparar', ['tipo_documento' => 'anexo03', 'dependencia_id' => $this->dep->id])->assertConflict();
        $this->assertDatabaseCount('firma_sesiones', 0);
    }

    public function test_vencido_el_plazo_del_acta_no_se_firma(): void
    {
        CronogramaActividad::factory()->vencida()->paraOperacion(OperacionCronograma::ACTA)->create([
            'proceso_transferencia_id' => $this->dep->proceso_transferencia_id,
        ]);

        $this->subirManuscrita($this->coordinador)->assertConflict()->assertJsonPath('errors.cronograma.accion', 'firmar');
        Sanctum::actingAs($this->responsable);
        $this->postJson('/api/firmaperu/preparar', ['tipo_documento' => 'anexo03', 'dependencia_id' => $this->dep->id])
            ->assertConflict()->assertJsonPath('errors.cronograma.accion', 'firmar');
        $this->assertDatabaseCount('firma_sesiones', 0);
    }

    public function test_el_coordinador_no_firma_un_cc_ajeno(): void
    {
        $ajena = Dependencia::factory()->create(['proceso_transferencia_id' => $this->dep->proceso_transferencia_id]);
        Sanctum::actingAs($this->coordinador);

        $this->postJson('/api/firmaperu/subir-manual', ['tipo_documento' => 'anexo03', 'dependencia_id' => $ajena->id,
            'signed_file' => UploadedFile::fake()->createWithContent('escaneo.pdf', self::PDF)])->assertForbidden();
    }

    public function test_si_cambian_los_datos_se_invalidan_ambas_firmas(): void
    {
        $this->subirManuscrita($this->coordinador)->assertCreated();
        $this->firmarDigital($this->responsable);
        $this->estado()->assertJsonPath('data.completo', true);

        $this->datos = 'datos-cambiados';

        $this->estado()->assertJsonPath('data.completo', false)->assertJsonPath('data.vigente', false)
            ->assertJsonPath('data.entidad', null)->assertJsonPath('data.ette', null);
    }
}
