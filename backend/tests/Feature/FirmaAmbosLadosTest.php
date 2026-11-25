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
use App\Support\Enums\LadoFirma;
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
 * Firma de ambos lados en orden libre (D-05, D-06), operada desde la sesión del
 * responsable del CC: él firma por la entidad y el coordinador ETTE presente (o
 * el titular que lo suple) firma con su propio certificado, digital o a mano;
 * a mano solo antes de cualquier firma digital. Firmar es aprobar. Ambas firmas
 * deben quedar en la misma cadena de PDF.
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
        $this->postJson('/api/firmaperu/generar-borrador', ['tipo_documento' => 'anexo03a', 'dependencia_id' => $this->dep->id])->assertCreated();
    }

    private function usuario(Rol $rol, ?int $dependenciaId): User
    {
        $usuario = User::factory()->create(['dni' => fake()->unique()->numerify('########'), 'activo' => true]);
        AsignacionRol::factory()->rol($rol)->create(['user_id' => $usuario->id,
            'proceso_transferencia_id' => $this->dep->proceso_transferencia_id, 'dependencia_id' => $dependenciaId]);
        Sanctum::actingAs($usuario);

        return $usuario;
    }

    private function preparar(LadoFirma $lado, ?User $operador = null): TestResponse
    {
        Sanctum::actingAs($operador ?? $this->responsable);

        return $this->postJson('/api/firmaperu/preparar', ['tipo_documento' => 'anexo03a',
            'dependencia_id' => $this->dep->id, 'lado' => $lado->value]);
    }

    /**
     * Abre Firma Perú con los parámetros de la sesión y sube el PDF firmado.
     *
     * @return array<string, mixed> parámetros que recibió el applet
     */
    private function completarFirma(string $paramToken, string $firma): array
    {
        $parametros = json_decode(base64_decode($this->post('/api/firmaperu/param',
            ['param_token' => $paramToken])->assertOk()->getContent()), true);
        $this->post(parse_url($parametros['uploadDocumentSigned'], PHP_URL_PATH), ['signed_file' => UploadedFile::fake()
            ->createWithContent('firmado.pdf', self::PDF.'firma-'.$firma)]);

        return $parametros;
    }

    private function firmarDigital(LadoFirma $lado): FirmaSesion
    {
        $preparacion = $this->preparar($lado)->assertCreated()->json('data');
        $this->completarFirma($preparacion['param_token'], $lado->value);

        return FirmaSesion::findOrFail($preparacion['sesion_id']);
    }

    private function subirManuscrita(?User $operador = null): TestResponse
    {
        Sanctum::actingAs($operador ?? $this->responsable);

        return $this->postJson('/api/firmaperu/subir-manual', ['tipo_documento' => 'anexo03a', 'dependencia_id' => $this->dep->id,
            'signed_file' => UploadedFile::fake()->createWithContent('escaneo.pdf', self::PDF.'firma-a-mano')]);
    }

    private function estado(): TestResponse
    {
        Sanctum::actingAs($this->responsable);

        return $this->getJson('/api/firmaperu/estado/anexo03a/'.$this->dep->id)->assertOk();
    }

    public function test_el_coordinador_firma_en_la_sesion_del_responsable_con_su_certificado(): void
    {
        $preparacion = $this->preparar(LadoFirma::ETTE)->assertCreated()->json('data');
        $parametros = $this->completarFirma($preparacion['param_token'], 'coordinador');

        $this->assertStringContainsString($this->coordinador->dni, $parametros['certificateFilter']);
        $this->assertStringNotContainsString($this->responsable->dni, $parametros['certificateFilter']);
        $this->assertDatabaseHas('firma_sesiones', ['id' => $preparacion['sesion_id'], 'estado' => 'firmada',
            'usuario_id' => $this->coordinador->id, 'operador_id' => $this->responsable->id,
            'firmante_dni' => $this->coordinador->dni]);
        $this->assertDatabaseHas('firmas_anexo', ['firma_sesion_id' => $preparacion['sesion_id'], 'lado' => 'ette',
            'firmante_id' => $this->coordinador->id, 'en_calidad_de' => 'coordinador']);

        $final = $this->firmarDigital(LadoFirma::ENTIDAD);

        $this->assertSame($preparacion['sesion_id'], $final->documento_previo_id);
        $this->assertSame($this->responsable->id, $final->usuario_id);
        $this->estado()->assertJsonPath('data.completo', true)->assertJsonPath('data.opera_firmas', true)
            ->assertJsonPath('data.firmante_ette.nombre', $this->coordinador->name);
    }

    public function test_ette_manuscrita_primero_y_el_responsable_firma_digital_sobre_el_escaneo(): void
    {
        $id = $this->subirManuscrita()->assertCreated()->assertJsonPath('data.estado', 'firmada')->json('data.sesion_id');
        $this->assertDatabaseHas('firma_sesiones', ['id' => $id, 'usuario_id' => $this->coordinador->id,
            'operador_id' => $this->responsable->id]);
        $this->assertDatabaseHas('firmas_anexo', ['firma_sesion_id' => $id, 'lado' => 'ette', 'estado' => 'firmada']);
        $this->estado()->assertJsonPath('data.completo', false)->assertJsonPath('data.ette.origen', 'manuscrita')
            ->assertJsonPath('data.hay_firma_digital', false);

        $final = $this->firmarDigital(LadoFirma::ENTIDAD);

        $this->assertSame($id, $final->documento_previo_id);
        $this->assertSame(self::PDF.'firma-a-mano', Storage::disk('local')->get($final->pdf_path));
        $this->estado()->assertJsonPath('data.completo', true)->assertJsonPath('data.documento_id', $final->id)
            ->assertJsonPath('data.entidad.origen', 'digital');
    }

    public function test_responsable_primero_y_el_ette_firma_digital_encima(): void
    {
        $entidad = $this->firmarDigital(LadoFirma::ENTIDAD);
        $final = $this->firmarDigital(LadoFirma::ETTE);

        $this->assertSame($entidad->id, $final->documento_previo_id);
        $this->estado()->assertJsonPath('data.completo', true)->assertJsonPath('data.ette.en_calidad_de', 'coordinador');
    }

    public function test_con_una_firma_digital_se_rechaza_la_manuscrita(): void
    {
        $this->firmarDigital(LadoFirma::ENTIDAD);

        $this->subirManuscrita()->assertConflict()
            ->assertJsonPath('message', 'Ya existe una firma digital; la firma del coordinador debe ser digital para no invalidarla.');
        $this->assertDatabaseMissing('firma_sesiones', ['origen' => 'manual']);
    }

    public function test_el_titular_designado_en_suplencia_firma_con_su_certificado(): void
    {
        $titular = $this->usuario(Rol::ETTE, null);
        Sanctum::actingAs($this->responsable);
        $this->putJson('/api/transferencia/suplencia-ette', ['dependencia_id' => $this->dep->id,
            'titular_id' => $titular->id, 'motivo_suplencia' => 'Coordinador de licencia'])->assertOk();

        $preparacion = $this->preparar(LadoFirma::ETTE)->assertCreated()->json('data');
        $parametros = $this->completarFirma($preparacion['param_token'], 'titular');

        $this->assertStringContainsString($titular->dni, $parametros['certificateFilter']);
        $this->assertDatabaseHas('firmas_anexo', ['firma_sesion_id' => $preparacion['sesion_id'], 'lado' => 'ette',
            'firmante_id' => $titular->id, 'en_calidad_de' => 'titular_suplente', 'motivo_suplencia' => 'Coordinador de licencia']);
        $this->firmarDigital(LadoFirma::ENTIDAD);
        $this->estado()->assertJsonPath('data.completo', true)->assertJsonPath('data.ette.en_calidad_de', 'titular_suplente');
    }

    public function test_con_firma_ette_vigente_ya_no_se_cambia_el_firmante(): void
    {
        $titular = $this->usuario(Rol::ETTE, null);
        $this->firmarDigital(LadoFirma::ETTE);

        Sanctum::actingAs($this->responsable);
        $this->putJson('/api/transferencia/suplencia-ette', ['dependencia_id' => $this->dep->id,
            'titular_id' => $titular->id, 'motivo_suplencia' => 'Licencia'])->assertConflict();
    }

    public function test_si_cambia_el_firmante_entre_preparar_y_firmar_se_rechaza(): void
    {
        $titular = $this->usuario(Rol::ETTE, null);
        $preparacion = $this->preparar(LadoFirma::ETTE)->assertCreated()->json('data');
        $this->putJson('/api/transferencia/suplencia-ette', ['dependencia_id' => $this->dep->id,
            'titular_id' => $titular->id, 'motivo_suplencia' => 'Licencia'])->assertOk();

        $this->completarFirma($preparacion['param_token'], 'coordinador');

        $this->assertDatabaseHas('firma_sesiones', ['id' => $preparacion['sesion_id'], 'estado' => 'rechazada']);
        $this->assertDatabaseCount('firmas_anexo', 0);
    }

    public function test_el_coordinador_no_firma_desde_su_cuenta(): void
    {
        $this->preparar(LadoFirma::ETTE, $this->coordinador)->assertForbidden();
        $this->subirManuscrita($this->coordinador)->assertForbidden();
        $this->assertDatabaseCount('firma_sesiones', 0);
    }

    public function test_el_responsable_del_cc_padre_no_opera_las_firmas_del_hijo(): void
    {
        $hijo = Dependencia::factory()->create(['proceso_transferencia_id' => $this->dep->proceso_transferencia_id,
            'parent_id' => $this->dep->id]);
        $this->entregaEn($hijo);
        Sanctum::actingAs($this->responsable);

        $this->postJson('/api/firmaperu/preparar', ['tipo_documento' => 'anexo03a', 'dependencia_id' => $hijo->id,
            'lado' => 'ette'])->assertForbidden();
    }

    public function test_el_firmante_ette_necesita_un_dni_valido(): void
    {
        $this->coordinador->update(['dni' => null]);

        $this->preparar(LadoFirma::ETTE)->assertUnprocessable();
    }

    public function test_no_se_firma_antes_de_cerrar_la_entrega(): void
    {
        $this->entregaEn($this->dep, EstadoEntrega::BORRADOR);

        $this->subirManuscrita()->assertConflict();
        $this->preparar(LadoFirma::ENTIDAD)->assertConflict();
        $this->assertDatabaseCount('firma_sesiones', 0);
    }

    public function test_vencido_el_plazo_del_acta_no_se_firma(): void
    {
        CronogramaActividad::factory()->vencida()->paraOperacion(OperacionCronograma::ACTA)->create([
            'proceso_transferencia_id' => $this->dep->proceso_transferencia_id,
        ]);

        $this->subirManuscrita()->assertConflict()->assertJsonPath('errors.cronograma.accion', 'firmar');
        $this->preparar(LadoFirma::ENTIDAD)->assertConflict()->assertJsonPath('errors.cronograma.accion', 'firmar');
        $this->assertDatabaseCount('firma_sesiones', 0);
    }

    public function test_si_cambian_los_datos_se_invalidan_ambas_firmas(): void
    {
        $this->subirManuscrita()->assertCreated();
        $this->firmarDigital(LadoFirma::ENTIDAD);
        $this->estado()->assertJsonPath('data.completo', true);

        $this->datos = 'datos-cambiados';

        $this->estado()->assertJsonPath('data.completo', false)->assertJsonPath('data.vigente', false)
            ->assertJsonPath('data.entidad', null)->assertJsonPath('data.ette', null);
    }
}
