<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Acervo\Models\AcervoDocumental;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\ActaTransferencia;
use App\Modules\Transferencia\Models\Entrega;
use App\Modules\Transferencia\Models\FirmaAnexo;
use App\Modules\Transferencia\Models\FirmaSesion;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Modules\Transferencia\Services\FirmaperuAuthService;
use App\Modules\Transferencia\Services\FirmaperuRegistroService;
use App\Modules\Transferencia\Services\FirmaperuSesionService;
use App\Modules\Transferencia\Services\FirmaperuValidadorService;
use App\Modules\Transferencia\Services\ObservacionService;
use App\Support\Enums\CaracterFirma;
use App\Support\Enums\EstadoEntrega;
use App\Support\Enums\EstadoFirma;
use App\Support\Enums\Rol;
use App\Support\Services\PdfService;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Mockery\MockInterface;
use Tests\TestCase;

class FirmaperuFlujoInstitucionalTest extends TestCase
{
    use RefreshDatabase;

    private Dependencia $dep;

    private User $responsable;

    private bool $hayConfianza = true;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesPermisosSeeder::class);
        Storage::fake('local');
        config()->set('firmaperu.public_url', 'https://backend.example');
        $proceso = ProcesoTransferencia::factory()->create(['exige_firma_acta' => true]);
        $this->dep = Dependencia::factory()->create(['proceso_transferencia_id' => $proceso->id]);
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

    private function preparar(string $tipo = 'anexo07', ?string $previo = null): array
    {
        $preparacion = $this->postJson('/api/firmaperu/preparar', ['tipo_documento' => $tipo,
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

    private function remitir(): TestResponse
    {
        return $this->postJson('/api/transferencia/remitir', ['dependencia_id' => $this->dep->id]);
    }

    public function test_firma_verificada_registra_acta_y_habilita_remision_sin_duplicar_el_hecho(): void
    {
        $this->remitir()->assertConflict();
        $sesion = $this->recibir($this->preparar());
        $acta = ActaTransferencia::where('dependencia_id', $this->dep->id)->firstOrFail();
        $this->assertDatabaseHas('firmas_anexo', ['firma_sesion_id' => $sesion->id, 'firmable_id' => $acta->id,
            'firmable_type' => $acta->getMorphClass(), 'version' => 1, 'estado' => 'firmada',
            'caracter' => 'obligatoria', 'firmante_id' => $this->responsable->id, 'hash_pdf' => $sesion->firmado_sha256]);
        $this->assertSame('suscrita', $acta->estado);
        app(FirmaperuRegistroService::class)->registrar($sesion);
        $this->assertDatabaseCount('firmas_anexo', 1);
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

    public function test_firma_opcional_ette_y_su_ambito_no_sustituyen_al_responsable(): void
    {
        $primera = $this->recibir($this->preparar());
        $this->usuario(Rol::DELEGADO_ETTE);
        $this->getJson('/api/transferencia/acta?dependencia_id='.$this->dep->id)->assertOk();
        $segunda = $this->recibir($this->preparar('anexo07', $primera->id));
        $this->assertDatabaseHas('firmas_anexo', ['firma_sesion_id' => $segunda->id, 'estado' => 'firmada', 'caracter' => 'opcional']);
        $this->assertDatabaseCount('firmas_anexo', 2);
        $otra = Dependencia::factory()->create(['proceso_transferencia_id' => $this->dep->proceso_transferencia_id]);
        $this->postJson('/api/firmaperu/preparar', ['tipo_documento' => 'anexo07', 'dependencia_id' => $otra->id])->assertForbidden();
        FirmaAnexo::where('firma_sesion_id', $primera->id)->update(['estado' => 'cancelada']);
        Sanctum::actingAs($this->responsable);
        $this->remitir()->assertConflict();
    }

    public function test_cambio_del_contenido_del_paquete_invalida_el_acta_y_exige_nueva_version(): void
    {
        $serie = AcervoDocumental::create(['dependencia_id' => $this->dep->id,
            'proceso_transferencia_id' => $this->dep->proceso_transferencia_id,
            'tipo' => 'fisico', 'serie_documental' => 'Serie nueva', 'anio' => 2026, 'cantidad_unidades' => 1]);
        $primera = $this->recibir($this->preparar());
        $serie->update(['serie_documental' => 'Contenido corregido, con la misma presencia de anexos']);
        $this->remitir()->assertConflict();
        $this->postJson('/api/firmaperu/preparar', ['tipo_documento' => 'anexo07', 'dependencia_id' => $this->dep->id,
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
            'tipo' => 'fisico', 'serie_documental' => 'Serie nueva', 'anio' => 2026, 'cantidad_unidades' => 1]);
        $sesion = $this->recibir($preparacion);
        $this->assertSame('firmada', $sesion->estado);
        $this->assertDatabaseHas('firmas_anexo', ['firma_sesion_id' => $sesion->id, 'estado' => 'cancelada']);
        $this->getJson('/api/firmaperu/sesiones/'.$sesion->id)->assertOk()->assertJsonPath('data.vigente', false);
        $this->get('/api/firmaperu/documentos/'.$sesion->id.'/descargar')->assertOk();
        $this->remitir()->assertConflict();
    }

    public function test_observacion_versiona_antes_de_re_firmar_y_no_otra_vez_al_remitir(): void
    {
        $primera = $this->recibir($this->preparar());
        $this->remitir()->assertOk();
        $entrega = Entrega::where('dependencia_id', $this->dep->id)->firstOrFail();
        $entrega->forceFill(['estado' => EstadoEntrega::OBSERVADA, 'version_acta_correccion' => null])->save();
        $this->remitir()->assertConflict();
        $acta = ActaTransferencia::where('dependencia_id', $this->dep->id)->firstOrFail();
        $this->assertSame(2, $acta->version);
        $this->remitir()->assertConflict();
        $this->assertSame(2, $acta->fresh()->version);
        $segunda = $this->recibir($this->preparar());
        $this->assertSame(2, $segunda->documento->version);
        $this->assertSame(EstadoFirma::CANCELADA, FirmaAnexo::where('firma_sesion_id', $primera->id)->firstOrFail()->estado);
        $this->remitir()->assertOk();
        $this->assertSame(2, $acta->fresh()->version);
    }

    public function test_anexo_agregado_registra_su_documento_y_version_sin_inventar_un_acta(): void
    {
        $sesion = $this->recibir($this->preparar('anexo03'));
        $this->assertDatabaseHas('firmas_anexo', ['firma_sesion_id' => $sesion->id,
            'firmable_type' => $sesion->documento->getMorphClass(), 'firmable_id' => $sesion->documento_firma_id,
            'version' => 1, 'caracter' => CaracterFirma::OBLIGATORIA->value]);
        $this->assertDatabaseCount('actas_transferencia', 0);
        $this->remitir()->assertConflict();
    }

    public function test_cerrar_ultima_observacion_no_elude_la_nueva_firma_obligatoria(): void
    {
        $this->recibir($this->preparar());
        $this->remitir()->assertOk();
        $entrega = Entrega::where('dependencia_id', $this->dep->id)->firstOrFail();
        $entrega->forceFill(['estado' => EstadoEntrega::OBSERVADA, 'version_acta_correccion' => null])->save();
        $serie = AcervoDocumental::create(['dependencia_id' => $this->dep->id,
            'proceso_transferencia_id' => $this->dep->proceso_transferencia_id,
            'tipo' => 'fisico', 'serie_documental' => 'Serie corregida', 'anio' => 2026, 'cantidad_unidades' => 1]);
        $observaciones = app(ObservacionService::class);
        $observacion = $observaciones->registrar($serie, $this->responsable, 'Completar información.');
        $observaciones->subsanar($observacion, $this->responsable, 'Información completada.');
        $this->assertSame(EstadoEntrega::OBSERVADA, $entrega->fresh()->estado);
        $this->remitir()->assertConflict();
        $this->recibir($this->preparar());
        $this->remitir()->assertOk();
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
            'tipo' => 'fisico', 'serie_documental' => 'Contenido actual', 'anio' => 2026, 'cantidad_unidades' => 1]);
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
