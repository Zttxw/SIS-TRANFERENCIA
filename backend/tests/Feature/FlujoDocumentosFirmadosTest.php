<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Acervo\Models\AcervoDocumental;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\FirmaAnexo;
use App\Modules\Transferencia\Models\FirmaBorrador;
use App\Modules\Transferencia\Models\FirmaSesion;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Modules\Transferencia\Services\FirmaperuAuthService;
use App\Modules\Transferencia\Services\FirmaperuValidadorService;
use App\Support\Enums\Rol;
use App\Support\Services\PdfService;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Mockery\MockInterface;
use Tests\TestCase;

class FlujoDocumentosFirmadosTest extends TestCase
{
    use RefreshDatabase;

    private Dependencia $dep;

    private Dependencia $padre;

    private User $jefe;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesPermisosSeeder::class);
        Storage::fake('local');
        config()->set('firmaperu.public_url', 'https://backend.example');
        $proceso = ProcesoTransferencia::factory()->create();
        $this->padre = Dependencia::factory()->create(['proceso_transferencia_id' => $proceso->id]);
        $this->dep = Dependencia::factory()->hijaDe($this->padre)->create();
        $this->jefe = $this->usuario(Rol::RESPONSABLE_CENTRO_COSTO, $this->dep);
        $this->mock(FirmaperuAuthService::class, fn (MockInterface $mock) => $mock->shouldReceive('obtenerJwtToken')->andReturn('jwt-prueba'));
        $this->mock(PdfService::class, fn (MockInterface $mock) => $mock->shouldReceive('binario')
            ->andReturnUsing(fn ($vista, $datos): string => "%PDF-1.7\n".($datos['contexto']['es_borrador'] ? 'BORRADOR' : 'DEFINITIVO')."\n%%EOF\n"));
        $this->mock(FirmaperuValidadorService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('comprobarConfiguracion')->andReturnNull();
            $mock->shouldReceive('tieneConfiguracion')->andReturnTrue();
            $mock->shouldReceive('validar')->andReturn(['integridad_verificada' => true, 'cadena_verificada' => true]);
        });
    }

    private function usuario(Rol $rol, Dependencia $dep): User
    {
        $user = User::factory()->create(['activo' => true, 'dni' => fake()->unique()->numerify('########')]);
        AsignacionRol::factory()->rol($rol)->create(['user_id' => $user->id,
            'proceso_transferencia_id' => $dep->proceso_transferencia_id, 'dependencia_id' => $dep->id]);
        Sanctum::actingAs($user);

        return $user;
    }

    private function generar(string $tipo): void
    {
        $this->postJson('/api/firmaperu/generar-borrador', ['tipo_documento' => $tipo, 'dependencia_id' => $this->dep->id])->assertCreated();
    }

    private function firmar(string $tipo, bool $generar = true): FirmaSesion
    {
        if ($generar) {
            $this->generar($tipo);
        }
        $preparacion = $this->postJson('/api/firmaperu/preparar', ['tipo_documento' => $tipo,
            'dependencia_id' => $this->dep->id])->assertCreated()->json('data');
        $respuesta = $this->post('/api/firmaperu/param', ['param_token' => $preparacion['param_token']])->assertOk();
        $parametros = json_decode(base64_decode($respuesta->getContent()), true);
        $this->post(parse_url($parametros['uploadDocumentSigned'], PHP_URL_PATH), ['signed_file' => UploadedFile::fake()
            ->createWithContent('firmado.pdf', "%PDF-1.7\nfirmado\n%%EOF\n")])->assertOk();

        return FirmaSesion::findOrFail($preparacion['sesion_id']);
    }

    public function test_visualizacion_es_borrador_y_generacion_guarda_pdf_sin_marca(): void
    {
        $url = '/api/firmaperu/previsualizar?tipo_documento=anexo03&dependencia_id='.$this->dep->id;
        $this->assertStringContainsString('BORRADOR', $this->get($url)->assertOk()->getContent());
        $this->assertDatabaseCount('firma_borradores', 0);
        $this->generar('anexo03');
        $pdf = $this->get($url)->assertOk()->getContent();
        $this->assertStringNotContainsString('BORRADOR', $pdf);
        $this->assertSame(Storage::disk('local')->get(FirmaBorrador::firstOrFail()->pdf_path), $pdf);
        AcervoDocumental::create(['proceso_transferencia_id' => $this->dep->proceso_transferencia_id,
            'dependencia_id' => $this->dep->id, 'tipo' => 'fisico', 'serie_documental' => 'Nueva serie', 'cantidad_unidades' => 1]);
        $this->assertStringContainsString('BORRADOR', $this->get($url)->assertOk()->getContent());
        $this->getJson('/api/firmaperu/estado/anexo03/'.$this->dep->id)->assertOk()->assertJsonPath('data.pdf_generado_vigente', false);
    }

    public function test_no_permite_firmar_sin_generar_ni_remitir_sin_las_seis_firmas(): void
    {
        $this->postJson('/api/firmaperu/preparar', ['tipo_documento' => 'anexo03', 'dependencia_id' => $this->dep->id])->assertConflict();
        $this->postJson('/api/transferencia/remitir', ['dependencia_id' => $this->dep->id])->assertConflict();
        $this->assertDatabaseCount('entregas', 0);
        $this->firmar('anexo07');
        $this->postJson('/api/transferencia/remitir', ['dependencia_id' => $this->dep->id])->assertConflict();
    }

    public function test_seis_firmas_del_jefe_habilitan_remision_sin_exigir_ette_y_una_cancelada_la_bloquea(): void
    {
        $sesiones = [];
        foreach (['anexo02', 'anexo03', 'anexo04', 'anexo05', 'anexo06', 'anexo07'] as $tipo) {
            $sesiones[$tipo] = $this->firmar($tipo);
        }
        $url = '/api/firmaperu/requisitos-remision/'.$this->dep->id;
        $this->getJson($url)->assertOk()->assertJsonPath('data.puede_remitir', true)->assertJsonPath('data.firmados', 6);
        FirmaAnexo::where('firma_sesion_id', $sesiones['anexo03']->id)->update(['estado' => 'cancelada']);
        $this->postJson('/api/transferencia/remitir', ['dependencia_id' => $this->dep->id])->assertConflict();
        FirmaAnexo::where('firma_sesion_id', $sesiones['anexo03']->id)->update(['estado' => 'firmada']);
        AcervoDocumental::create(['proceso_transferencia_id' => $this->dep->proceso_transferencia_id,
            'dependencia_id' => $this->dep->id, 'tipo' => 'fisico', 'serie_documental' => 'Contenido modificado', 'cantidad_unidades' => 1]);
        $this->getJson($url)->assertOk()->assertJsonPath('data.puede_remitir', false)
            ->assertJsonPath('data.pendientes', ['anexo03', 'anexo07']);
        $this->firmar('anexo03');
        $this->firmar('anexo07');
        $this->postJson('/api/transferencia/remitir', ['dependencia_id' => $this->dep->id])->assertOk();
    }

    public function test_padre_consulta_el_pdf_generado_sin_remision_y_otra_oficina_no(): void
    {
        $this->generar('anexo03');
        $ruta = '/api/firmaperu/previsualizar?solo_generado=1&tipo_documento=anexo03&dependencia_id='.$this->dep->id;
        $this->usuario(Rol::RESPONSABLE_CENTRO_COSTO, $this->padre);
        $this->get($ruta)->assertOk();
        $this->get(str_replace('anexo03', 'anexo07', $ruta))->assertNotFound();
        $this->assertDatabaseCount('entregas', 0);
        $this->assertDatabaseCount('actas_transferencia', 0);
        $otra = Dependencia::factory()->create(['proceso_transferencia_id' => $this->dep->proceso_transferencia_id]);
        $this->usuario(Rol::RESPONSABLE_CENTRO_COSTO, $otra);
        $this->getJson($ruta)->assertForbidden();
        $this->getJson('/api/firmaperu/requisitos-remision/'.$this->dep->id)->assertForbidden();
    }

    public function test_estado_reporta_firme_yo_y_sirve_el_pdf_firmado_inline(): void
    {
        $sesion = $this->firmar('anexo03');

        // El jefe que firmó ve firme_yo = true; otro firmante habilitado lo ve en false.
        $this->getJson('/api/firmaperu/estado/anexo03/'.$this->dep->id)
            ->assertOk()->assertJsonPath('data.firmado', true)->assertJsonPath('data.firme_yo', true);

        // El PDF firmado se sirve embebido (inline), no como descarga.
        $respuesta = $this->get('/api/firmaperu/documentos/'.$sesion->id.'/ver')->assertOk();
        $this->assertSame('application/pdf', $respuesta->headers->get('Content-Type'));
        $this->assertStringContainsString('inline', (string) $respuesta->headers->get('Content-Disposition'));
        $this->assertStringContainsString('firmado', $respuesta->getContent());

        $this->usuario(Rol::SERVIDOR, $this->dep);
        $this->getJson('/api/firmaperu/estado/anexo03/'.$this->dep->id)
            ->assertOk()->assertJsonPath('data.firmado', true)->assertJsonPath('data.firme_yo', false);
    }

    public function test_firmas_del_delegado_ette_y_del_servidor_no_sustituyen_la_del_jefe(): void
    {
        $this->generar('anexo03');
        $this->usuario(Rol::DELEGADO_ETTE, $this->dep);
        $sesion = $this->firmar('anexo03', false);
        $this->assertDatabaseHas('firmas_anexo', ['firma_sesion_id' => $sesion->id, 'caracter' => 'opcional']);
        $this->getJson('/api/firmaperu/requisitos-remision/'.$this->dep->id)->assertOk()->assertJsonPath('data.firmados', 0);
        $this->usuario(Rol::SERVIDOR, $this->dep);
        $this->firmar('anexo03');
        $this->getJson('/api/firmaperu/requisitos-remision/'.$this->dep->id)->assertOk()->assertJsonPath('data.firmados', 0);
    }
}
