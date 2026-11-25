<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Acervo\Models\AcervoDocumental;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Gestion\Models\InformeGestion;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\Entrega;
use App\Modules\Transferencia\Models\Observacion;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Modules\Transferencia\Services\SuscripcionEntrega;
use App\Support\Enums\CalidadEtte;
use App\Support\Enums\EstadoEntrega;
use App\Support\Enums\EstadoObservacion;
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Mockery\MockInterface;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Concerns\PreparaEntregas;
use Tests\TestCase;

/**
 * Observaciones del coordinador ETTE (D-07): constancia sin subsanación. Las
 * registra el responsable del CC en su sesión, durante la revisión presencial,
 * a nombre del coordinador; se admiten sobre una fila o el anexo completo
 * mientras la entrega está en revisión y el acta sin firmas, y no cambian su
 * estado.
 */
class ObservacionesTest extends TestCase
{
    use PreparaEntregas, RefreshDatabase;

    private ProcesoTransferencia $proceso;

    private Dependencia $padre;

    private Dependencia $hija;

    private User $coordinador;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesPermisosSeeder::class);
        $this->proceso = ProcesoTransferencia::factory()->create();
        $this->padre = Dependencia::factory()->create([
            'proceso_transferencia_id' => $this->proceso->id,
            'nivel' => 2,
        ]);
        $this->hija = Dependencia::factory()->hijaDe($this->padre)->create();
        $this->coordinador = $this->usuarioCon(Rol::DELEGADO_ETTE, $this->hija);
    }

    private function usuarioCon(Rol $rol, ?Dependencia $dependencia): User
    {
        $usuario = User::factory()->create();
        AsignacionRol::factory()->rol($rol)->create([
            'user_id' => $usuario->id,
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $dependencia?->id,
        ]);

        return $usuario;
    }

    private function actuarComo(Rol $rol, ?Dependencia $dependencia): User
    {
        $usuario = $this->usuarioCon($rol, $dependencia);
        Sanctum::actingAs($usuario);

        return $usuario;
    }

    private function informeDe(Dependencia $dep): InformeGestion
    {
        return InformeGestion::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $dep->id,
            'funciones' => [['n' => 1, 'descripcion' => 'Funciones de prueba del centro de costo.']],
            'logros_items' => [['n' => 1, 'actividad' => 'Logros de prueba del periodo evaluado.']],
            'estado' => 'borrador',
        ]);
    }

    private function observacionDe(Dependencia $dep): Observacion
    {
        return Observacion::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $dep->id,
            'anexo' => 'gestion',
            'autor_id' => $this->coordinador->id,
            'descripcion' => 'El informe no detalla los pendientes.',
            'estado' => EstadoObservacion::REGISTRADA,
        ]);
    }

    /** @return array<string, string> */
    private function payloadAnexo(): array
    {
        return ['anexo' => 'gestion', 'dependencia_id' => $this->hija->id, 'descripcion' => 'El informe no detalla los pendientes.'];
    }

    public function test_el_responsable_registra_la_observacion_del_coordinador_sobre_una_fila(): void
    {
        $informe = $this->informeDe($this->hija);
        $this->entregaEn($this->hija, EstadoEntrega::EN_REVISION);
        $responsable = $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->hija);

        $this->postJson('/api/observaciones', [
            'anexo' => 'gestion',
            'observable_id' => $informe->id,
            'descripcion' => 'El informe no detalla los asuntos pendientes.',
        ])->assertCreated()
            ->assertJsonPath('data.estado', EstadoObservacion::REGISTRADA->value);

        $this->assertDatabaseHas('observaciones', [
            'observable_type' => InformeGestion::class,
            'observable_id' => $informe->id,
            'dependencia_id' => $this->hija->id,
            'anexo' => 'gestion',
            'autor_id' => $this->coordinador->id,
            'registrada_por_id' => $responsable->id,
            'en_calidad_de' => CalidadEtte::COORDINADOR->value,
        ]);
        $this->assertSame(EstadoEntrega::EN_REVISION, Entrega::where('dependencia_id', $this->hija->id)->value('estado'));
    }

    public function test_se_observa_el_anexo_completo(): void
    {
        $this->entregaEn($this->hija, EstadoEntrega::EN_REVISION);
        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->hija);

        $this->postJson('/api/observaciones', [
            'anexo' => 'acervo_fisico',
            'dependencia_id' => $this->hija->id,
            'descripcion' => 'No se registró el archivo de gestión.',
        ])->assertCreated()->assertJsonPath('data.observable_id', null);

        $this->assertDatabaseHas('observaciones', ['dependencia_id' => $this->hija->id, 'anexo' => 'acervo_fisico', 'observable_id' => null]);
    }

    public function test_la_serie_del_acervo_se_observa_solo_desde_su_anexo_03a_o_03b(): void
    {
        $serieSgd = AcervoDocumental::create([
            'proceso_transferencia_id' => $this->proceso->id, 'dependencia_id' => $this->hija->id,
            'tipo' => 'digital', 'serie_documental' => 'Informe recibidos', 'anio' => 2026, 'numero_documentos' => 4, 'fuente' => 'sgd',
        ]);
        $this->entregaEn($this->hija, EstadoEntrega::EN_REVISION);
        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->hija);
        $observar = fn (string $anexo) => $this->postJson('/api/observaciones', [
            'anexo' => $anexo, 'observable_id' => $serieSgd->id, 'descripcion' => 'Faltan documentos del año.',
        ]);

        $observar('acervo_fisico')->assertNotFound();
        $observar('acervo_digital')->assertCreated();

        $this->assertDatabaseHas('observaciones', ['observable_id' => $serieSgd->id, 'anexo' => 'acervo_digital']);
        $this->assertDatabaseCount('observaciones', 1);
    }

    /** @return array<string, array{0: ?EstadoEntrega}> */
    public static function estadosNoObservables(): array
    {
        return [
            'sin cerrar' => [null],
            'borrador' => [EstadoEntrega::BORRADOR],
            'acta suscrita' => [EstadoEntrega::ACTA_SUSCRITA],
            'remitida' => [EstadoEntrega::REMITIDA],
        ];
    }

    #[DataProvider('estadosNoObservables')]
    public function test_solo_se_observa_una_entrega_en_revision(?EstadoEntrega $estado): void
    {
        if ($estado !== null) {
            $this->entregaEn($this->hija, $estado);
        }
        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->hija);

        $this->postJson('/api/observaciones', $this->payloadAnexo())->assertConflict();

        $this->assertDatabaseCount('observaciones', 0);
    }

    public function test_con_el_acta_firmada_ya_no_se_observa(): void
    {
        $this->entregaEn($this->hija, EstadoEntrega::EN_REVISION);
        $this->partialMock(SuscripcionEntrega::class, fn (MockInterface $mock) => $mock
            ->shouldReceive('requisitosRemision')->andReturn(['documentos' => [
                'anexo07' => ['entidad' => ['firmante' => 'Responsable'], 'ette' => null],
            ]]));
        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->hija);

        $this->postJson('/api/observaciones', $this->payloadAnexo())->assertConflict()
            ->assertJsonPath('message', 'El acta ya tiene firmas: las observaciones del coordinador quedaron fijadas en ella.');
    }

    public function test_el_responsable_del_cc_padre_no_observa_a_sus_hijos(): void
    {
        $this->entregaEn($this->hija, EstadoEntrega::EN_REVISION);
        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->padre);

        $this->postJson('/api/observaciones', $this->payloadAnexo())->assertForbidden();
    }

    public function test_coordinador_y_servidor_no_registran_desde_su_cuenta(): void
    {
        $this->entregaEn($this->hija, EstadoEntrega::EN_REVISION);

        $this->actuarComo(Rol::SERVIDOR, $this->hija);
        $this->postJson('/api/observaciones', $this->payloadAnexo())->assertForbidden();

        Sanctum::actingAs($this->coordinador);
        $this->postJson('/api/observaciones', $this->payloadAnexo())->assertForbidden();
    }

    public function test_el_responsable_retira_la_observacion_durante_la_revision(): void
    {
        $this->entregaEn($this->hija, EstadoEntrega::EN_REVISION);
        $observacion = $this->observacionDe($this->hija);

        Sanctum::actingAs($this->coordinador);
        $this->postJson("/api/observaciones/{$observacion->id}/retirar")->assertForbidden();

        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->hija);
        $this->postJson("/api/observaciones/{$observacion->id}/retirar")
            ->assertOk()->assertJsonPath('data.estado', EstadoObservacion::RETIRADA->value);
    }

    public function test_suscrita_el_acta_la_observacion_queda_como_constancia(): void
    {
        $this->entregaEn($this->hija, EstadoEntrega::ACTA_SUSCRITA);
        $observacion = $this->observacionDe($this->hija);
        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->hija);

        $this->postJson("/api/observaciones/{$observacion->id}/retirar")->assertConflict();

        $this->assertSame(EstadoObservacion::REGISTRADA, $observacion->fresh()->estado);
    }

    public function test_listado_de_observaciones_se_acota_al_ambito(): void
    {
        $otraRama = Dependencia::factory()->create([
            'proceso_transferencia_id' => $this->proceso->id,
            'nivel' => 2,
        ]);
        $this->observacionDe($this->hija);
        $this->observacionDe($otraRama);

        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->hija);
        $respuesta = $this->getJson('/api/observaciones')->assertOk();

        $this->assertSame([$this->hija->id], array_column($respuesta->json('data'), 'dependencia_id'));
    }
}
