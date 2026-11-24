<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Acervo\Models\AcervoDocumental;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\ActaTransferencia;
use App\Modules\Transferencia\Models\FirmaAnexo;
use App\Modules\Transferencia\Models\FirmaSesion;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Modules\Transferencia\Services\CadenaFirmas;
use App\Modules\Transferencia\Services\FirmaperuAuthService;
use App\Modules\Transferencia\Services\FirmaperuRegistroService;
use App\Modules\Transferencia\Services\FirmaperuSesionService;
use App\Modules\Transferencia\Services\FirmaperuValidadorService;
use App\Modules\Transferencia\Services\SuscripcionEntrega;
use App\Support\Enums\Rol;
use App\Support\Services\PdfService;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Mockery\MockInterface;
use Tests\Concerns\PreparaEntregas;
use Tests\TestCase;

class FirmaperuFlujoInstitucionalTest extends TestCase
{
    use PreparaEntregas, RefreshDatabase;

    private Dependencia $dep;

    private User $responsable;

    private User $coordinador;

    private bool $hayConfianza = true;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesPermisosSeeder::class);
        Storage::fake('local');
        config()->set('firmaperu.public_url', 'https://backend.example');
        $proceso = ProcesoTransferencia::factory()->create();
        $this->dep = Dependencia::factory()->create(['proceso_transferencia_id' => $proceso->id]);
        $this->entregaEn($this->dep);
        $this->coordinador = $this->usuario(Rol::DELEGADO_ETTE);
        $this->responsable = $this->usuario(Rol::RESPONSABLE_CENTRO_COSTO);
        $this->mock(FirmaperuAuthService::class, fn (MockInterface $mock) => $mock->shouldReceive('obtenerJwtToken')->andReturn('jwt-prueba'));
        $this->mock(PdfService::class, fn (MockInterface $mock) => $mock->shouldReceive('binario')->andReturn("%PDF-1.7\n%%EOF\n"));
        $this->mock(FirmaperuValidadorService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('comprobarConfiguracion')->andReturnNull();
            $mock->shouldReceive('tieneConfiguracion')->andReturnUsing(fn (): bool => $this->hayConfianza);
            $mock->shouldReceive('validar')->andReturn(['integridad_verificada' => true, 'cadena_verificada' => true]);
        });
    }

    private function usuario(Rol $rol): User
    {
        $usuario = User::factory()->create(['dni' => fake()->unique()->numerify('########'), 'activo' => true]);
        AsignacionRol::factory()->rol($rol)->create(['user_id' => $usuario->id,
            'proceso_transferencia_id' => $this->dep->proceso_transferencia_id, 'dependencia_id' => $this->dep->id]);
        Sanctum::actingAs($usuario);

        return $usuario;
    }

    /** Prepara la firma en la sesión del responsable; el lado ETTE lo firma el coordinador presente. */
    private function preparar(string $tipo = 'anexo07', ?string $previo = null, string $lado = 'entidad'): array
    {
        Sanctum::actingAs($this->responsable);
        if (! $previo && $lado === 'entidad') {
            $this->postJson('/api/firmaperu/generar-borrador', ['tipo_documento' => $tipo, 'dependencia_id' => $this->dep->id])->assertCreated();
        }
        $preparacion = $this->postJson('/api/firmaperu/preparar', ['lado' => $lado, 'tipo_documento' => $tipo,
            'dependencia_id' => $this->dep->id, 'documento_previo_id' => $previo])->assertCreated()->json('data');
        $r = $this->post('/api/firmaperu/param', ['param_token' => $preparacion['param_token']])->assertOk();

        return [$preparacion['sesion_id'], json_decode(base64_decode($r->getContent()), true)['uploadDocumentSigned']];
    }

    private function recibir(array $preparacion): FirmaSesion
    {
        [$id, $url] = $preparacion;
        $this->post(parse_url($url, PHP_URL_PATH), ['signed_file' => UploadedFile::fake()->createWithContent('firmado.pdf', "%PDF-1.7\nfirmado\n%%EOF\n")])->assertOk();

        return FirmaSesion::findOrFail($id);
    }

    /** Completa las firmas faltantes de ambos lados (en el acta, solo la ETTE) y remite. */
    private function remitir(): TestResponse
    {
        if (FirmaSesion::where('tipo_documento', 'anexo07')->where('dependencia_id', $this->dep->id)->where('estado', 'firmada')->exists()) {
            $documentos = app(SuscripcionEntrega::class)->requisitosRemision($this->dep->id, $this->responsable)['documentos'];
            foreach ($documentos as $tipo => $estado) {
                foreach (['entidad', 'ette'] as $lado) {
                    // El acta solo se completa con la firma ETTE sobre la del responsable vigente.
                    $acta = $tipo === 'anexo07' && ($lado === 'entidad' || $estado['entidad'] === null);
                    if ($estado[$lado] === null && ! $acta) {
                        $this->recibir($this->preparar($tipo, lado: $lado));
                    }
                }
            }
        }
        Sanctum::actingAs($this->responsable);

        return $this->postJson('/api/transferencia/remitir', ['dependencia_id' => $this->dep->id]);
    }

    public function test_firma_verificada_registra_acta_y_habilita_remision_sin_duplicar_el_hecho(): void
    {
        $this->remitir()->assertConflict();
        $sesion = $this->recibir($this->preparar());
        $acta = ActaTransferencia::where('dependencia_id', $this->dep->id)->firstOrFail();
        $this->assertDatabaseHas('firmas_anexo', ['firma_sesion_id' => $sesion->id, 'firmable_id' => $acta->id,
            'firmable_type' => $acta->getMorphClass(), 'version' => 1, 'estado' => 'firmada',
            'lado' => 'entidad', 'firmante_id' => $this->responsable->id, 'hash_pdf' => $sesion->firmado_sha256]);
        $this->assertSame('generada', $acta->estado, 'Con un solo lado el acta no queda suscrita.');
        app(FirmaperuRegistroService::class)->registrar($sesion);
        $this->assertDatabaseCount('firmas_anexo', 1);

        $ette = $this->recibir($this->preparar(lado: 'ette'));
        $this->assertSame($sesion->id, $ette->documento_previo_id, 'La firma ETTE se agrega sobre el PDF ya firmado.');
        $this->assertDatabaseHas('firmas_anexo', ['firma_sesion_id' => $ette->id, 'lado' => 'ette', 'en_calidad_de' => 'coordinador']);
        $this->assertSame('suscrita', $acta->fresh()->estado);
        $this->assertSame($ette->firmado_path, $acta->fresh()->ruta_pdf_suscrito);

        $this->remitir()->assertOk();
    }

    public function test_recibido_pendiente_no_habilita_remision_hasta_verificacion_diferida(): void
    {
        $this->hayConfianza = false;
        $sesion = $this->recibir($this->preparar());
        $this->assertSame('pendiente_validacion', $sesion->estado);
        $this->assertDatabaseCount('firmas_anexo', 0);
        $this->remitir()->assertConflict();
        $this->hayConfianza = true;
        app(FirmaperuSesionService::class)->validarPendiente($sesion->id);
        $this->assertDatabaseHas('firmas_anexo', ['firma_sesion_id' => $sesion->id, 'estado' => 'firmada']);
        $this->remitir()->assertOk();
    }

    public function test_un_solo_lado_no_basta_y_el_responsable_solo_opera_su_cc(): void
    {
        $primera = $this->recibir($this->preparar());
        $segunda = $this->recibir($this->preparar(lado: 'ette'));
        $this->assertDatabaseHas('firmas_anexo', ['firma_sesion_id' => $segunda->id, 'estado' => 'firmada', 'lado' => 'ette',
            'firmante_id' => $this->coordinador->id]);
        $otra = Dependencia::factory()->create(['proceso_transferencia_id' => $this->dep->proceso_transferencia_id]);
        $this->postJson('/api/firmaperu/preparar', ['lado' => 'ette', 'tipo_documento' => 'anexo07', 'dependencia_id' => $otra->id])->assertForbidden();

        FirmaAnexo::where('firma_sesion_id', $primera->id)->update(['estado' => 'cancelada']);
        $estado = app(CadenaFirmas::class)->estado($this->dep->proceso_transferencia_id, $this->dep->id, 'anexo07', $this->responsable);
        $this->assertFalse($estado['completo']);
        $this->assertNull($estado['entidad']);
        Sanctum::actingAs($this->responsable);
        $this->postJson('/api/transferencia/remitir', ['dependencia_id' => $this->dep->id])->assertConflict();
    }

    public function test_cambio_del_contenido_del_paquete_invalida_el_acta_y_exige_nueva_version(): void
    {
        $serie = AcervoDocumental::create(['dependencia_id' => $this->dep->id,
            'proceso_transferencia_id' => $this->dep->proceso_transferencia_id,
            'tipo' => 'fisico', 'serie_documental' => 'Serie nueva', 'anio' => 2026, 'folios' => 1]);
        $primera = $this->recibir($this->preparar());
        $serie->update(['serie_documental' => 'Contenido corregido, con la misma presencia de anexos']);
        $this->remitir()->assertConflict();
        $this->postJson('/api/firmaperu/preparar', ['lado' => 'entidad', 'tipo_documento' => 'anexo07', 'dependencia_id' => $this->dep->id,
            'documento_previo_id' => $primera->id])->assertConflict();
        $segunda = $this->recibir($this->preparar());
        $this->assertSame(2, $segunda->documento->version);
        $this->assertDatabaseHas('firmas_anexo', ['firma_sesion_id' => $primera->id, 'estado' => 'cancelada']);
        $this->remitir()->assertOk();
    }

    public function test_pdf_tardio_se_conserva_historico_y_no_habilita_remision(): void
    {
        $preparacion = $this->preparar();
        AcervoDocumental::create(['dependencia_id' => $this->dep->id,
            'proceso_transferencia_id' => $this->dep->proceso_transferencia_id,
            'tipo' => 'fisico', 'serie_documental' => 'Serie nueva', 'anio' => 2026, 'folios' => 1]);
        $sesion = $this->recibir($preparacion);
        $this->assertSame('firmada', $sesion->estado);
        $this->assertDatabaseHas('firmas_anexo', ['firma_sesion_id' => $sesion->id, 'estado' => 'cancelada']);
        $this->getJson('/api/firmaperu/sesiones/'.$sesion->id)->assertOk()->assertJsonPath('data.vigente', false);
        $this->get('/api/firmaperu/documentos/'.$sesion->id.'/descargar')->assertOk();
        $this->remitir()->assertConflict();
    }

    public function test_anexo_agregado_registra_su_documento_y_version_sin_inventar_un_acta(): void
    {
        $sesion = $this->recibir($this->preparar('anexo03'));
        $this->assertDatabaseHas('firmas_anexo', ['firma_sesion_id' => $sesion->id,
            'firmable_type' => $sesion->documento->getMorphClass(), 'firmable_id' => $sesion->documento_firma_id,
            'version' => 1, 'lado' => 'entidad']);
        $this->assertDatabaseCount('actas_transferencia', 0);
        $this->remitir()->assertConflict();
    }

    public function test_el_paso_del_tiempo_no_crea_otra_version_del_mismo_anexo(): void
    {
        $primera = $this->recibir($this->preparar('anexo03'));
        $this->travel(1)->hours();
        $segunda = $this->recibir($this->preparar('anexo03', $primera->id));
        $this->assertSame($primera->documento_firma_id, $segunda->documento_firma_id);
        $this->assertSame(1, $segunda->documento->version);
    }

    public function test_recibir_una_version_antigua_despues_no_oculta_el_pdf_vigente(): void
    {
        $primera = $this->preparar('anexo03');
        AcervoDocumental::create(['dependencia_id' => $this->dep->id,
            'proceso_transferencia_id' => $this->dep->proceso_transferencia_id,
            'tipo' => 'fisico', 'serie_documental' => 'Contenido actual', 'anio' => 2026, 'folios' => 1]);
        $vigente = $this->recibir($this->preparar('anexo03'));
        $this->travel(1)->minutes();
        $this->recibir($primera);
        $this->getJson('/api/firmaperu/estado/anexo03/'.$this->dep->id)->assertOk()
            ->assertJsonPath('data.documento_id', $vigente->id)->assertJsonPath('data.vigente', true)
            ->assertJsonPath('data.version', 2);
    }

    public function test_firma_tardia_de_proceso_cerrado_no_crea_acta_en_el_proceso_nuevo(): void
    {
        $preparacion = $this->preparar();
        ProcesoTransferencia::findOrFail($this->dep->proceso_transferencia_id)->update(['estado' => 'cerrado']);
        $nuevo = ProcesoTransferencia::factory()->create();
        $sesion = $this->recibir($preparacion);
        $this->assertDatabaseHas('firmas_anexo', ['firma_sesion_id' => $sesion->id, 'estado' => 'cancelada']);
        $this->assertDatabaseMissing('actas_transferencia', ['proceso_transferencia_id' => $nuevo->id, 'dependencia_id' => $this->dep->id]);
        $this->getJson('/api/firmaperu/sesiones/'.$sesion->id)->assertOk()->assertJsonPath('data.vigente', false);
    }
}
