<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\Entrega;
use App\Modules\Transferencia\Models\EnvioEtte;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Modules\Transferencia\Services\SuscripcionEntrega;
use App\Support\Enums\EstadoEntrega;
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\PreparaEntregas;
use Tests\TestCase;

/**
 * Fase 6 (D-08, D-12): el CC padre solo consolida y puede remitir sin sus hijos
 * (con advertencia); las entregas que llegan al ETTS siguen la cadena
 * recibida_etts → remitida_ette (por lotes, con constancia) → recibida_ette.
 */
class CadenaEttsEtteTest extends TestCase
{
    use PreparaEntregas, RefreshDatabase;

    private ProcesoTransferencia $proceso;

    private Dependencia $raiz;

    private Dependencia $hijo;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesPermisosSeeder::class);
        $this->partialMock(SuscripcionEntrega::class, function ($mock): void {
            $mock->shouldReceive('requisitosRemision')->andReturn(['puede_remitir' => true, 'firmados' => 6, 'pendientes' => []]);
        });
        $this->proceso = ProcesoTransferencia::factory()->create();
        $this->raiz = Dependencia::factory()->create(['proceso_transferencia_id' => $this->proceso->id, 'codigo' => '07', 'nivel' => 2]);
        $this->hijo = Dependencia::factory()->hijaDe($this->raiz)->create(['codigo' => '07.05']);
    }

    private function actuarComo(Rol $rol, ?Dependencia $dependencia = null): User
    {
        $usuario = User::factory()->create();
        AsignacionRol::factory()->rol($rol)->create([
            'user_id' => $usuario->id,
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $dependencia?->id,
        ]);
        Sanctum::actingAs($usuario);

        return $usuario;
    }

    private function entregaDe(Dependencia $dependencia): Entrega
    {
        return Entrega::where('dependencia_id', $dependencia->id)->firstOrFail();
    }

    /** Deja otra raíz con su entrega en el estado dado, dirigida al ETTS. */
    private function raizEn(EstadoEntrega $estado, string $codigo): Dependencia
    {
        $raiz = Dependencia::factory()->create(['proceso_transferencia_id' => $this->proceso->id, 'codigo' => $codigo, 'nivel' => 2]);
        $this->entregaEn($raiz, $estado);

        return $raiz;
    }

    public function test_el_padre_debe_confirmar_para_remitir_sin_sus_hijos(): void
    {
        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->raiz);
        $this->entregaEn($this->raiz);

        $this->postJson('/api/transferencia/remitir', ['dependencia_id' => $this->raiz->id])
            ->assertConflict()
            ->assertJsonPath('errors.hijos_pendientes.0.codigo', '07.05');
        $this->assertSame(EstadoEntrega::EN_REVISION, $this->entregaDe($this->raiz)->estado);

        $this->postJson('/api/transferencia/remitir', ['dependencia_id' => $this->raiz->id, 'confirmar_sin_hijos' => true])
            ->assertOk();
        $entrega = $this->entregaDe($this->raiz);
        $this->assertSame(EstadoEntrega::REMITIDA, $entrega->estado);
        $this->assertSame('07.05', $entrega->hijos_pendientes_al_remitir[0]['codigo']);
    }

    public function test_el_padre_remite_sin_confirmar_si_sus_hijos_ya_enviaron(): void
    {
        $this->entregaEn($this->hijo, EstadoEntrega::REMITIDA);
        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->raiz);
        $this->entregaEn($this->raiz);

        $this->postJson('/api/transferencia/remitir', ['dependencia_id' => $this->raiz->id])->assertOk();

        $this->assertNull($this->entregaDe($this->raiz)->hijos_pendientes_al_remitir);
    }

    public function test_el_hijo_que_remite_despues_del_padre_queda_como_enviado_tarde(): void
    {
        $this->entregaEn($this->raiz, EstadoEntrega::REMITIDA)->update(['remitida_en' => Carbon::now()->subHour()]);
        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->hijo);
        $this->entregaEn($this->hijo);

        $this->postJson('/api/transferencia/remitir', ['dependencia_id' => $this->hijo->id])->assertOk();

        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->raiz);
        $this->getJson("/api/transferencia/consolidado?dependencia_id={$this->raiz->id}")
            ->assertOk()
            ->assertJsonPath('data.resumen.enviados_tarde', 1)
            ->assertJsonPath('data.centros.1.codigo', '07.05')
            ->assertJsonPath('data.centros.1.enviado_tarde', true);
    }

    public function test_el_consolidado_muestra_el_autor_de_cada_entrega_del_subarbol(): void
    {
        $autor = User::factory()->create(['name' => 'Autora del hijo']);
        $this->entregaEn($this->hijo, EstadoEntrega::REMITIDA)->update(['emisor_id' => $autor->id, 'remitida_en' => now()]);
        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->raiz);

        $this->getJson("/api/transferencia/consolidado?dependencia_id={$this->raiz->id}")
            ->assertOk()
            ->assertJsonPath('data.centros.0.es_propio', true)
            ->assertJsonPath('data.centros.1.remitida_por', 'Autora del hijo')
            ->assertJsonPath('data.centros.1.padre.codigo', '07')
            ->assertJsonPath('data.resumen.remitidos', 1);
    }

    public function test_el_hijo_no_ve_el_consolidado_de_su_padre(): void
    {
        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->hijo);

        $this->getJson("/api/transferencia/consolidado?dependencia_id={$this->raiz->id}")->assertForbidden();
    }

    public function test_cadena_completa_del_etts_al_ette_por_lote(): void
    {
        $this->entregaEn($this->raiz, EstadoEntrega::REMITIDA);
        $otra = $this->raizEn(EstadoEntrega::REMITIDA, '03');
        $ids = [$this->raiz->id, $otra->id];

        $this->actuarComo(Rol::ETTS);
        $this->postJson('/api/transferencia/recibir-etts', ['dependencia_ids' => $ids])->assertOk();
        $this->assertSame(EstadoEntrega::RECIBIDA_ETTS, $this->entregaDe($this->raiz)->estado);

        $this->postJson('/api/transferencia/enviar-ette', ['dependencia_ids' => $ids, 'comentario' => 'Primer lote'])
            ->assertCreated()
            ->assertJsonPath('data.codigo', sprintf('CE-%d-001', now()->year))
            ->assertJsonCount(2, 'data.centros');
        $envio = EnvioEtte::sole();
        $this->assertSame($envio->id, $this->entregaDe($otra)->envio_ette_id);
        $this->assertSame(EstadoEntrega::REMITIDA_ETTE, $this->entregaDe($otra)->estado);

        $this->get("/api/transferencia/envios-ette/{$envio->id}/constancia/pdf")
            ->assertOk()->assertHeader('content-type', 'application/pdf');

        $this->actuarComo(Rol::ETTE);
        $this->postJson('/api/transferencia/recibir-ette', ['dependencia_ids' => [$this->raiz->id]])->assertOk();

        $entrega = $this->entregaDe($this->raiz);
        $this->assertSame(EstadoEntrega::RECIBIDA_ETTE, $entrega->estado);
        $this->assertNotNull($entrega->recibida_ette_en);
        $this->assertSame(EstadoEntrega::REMITIDA_ETTE, $this->entregaDe($otra)->estado);
    }

    public function test_el_segundo_lote_lleva_el_numero_siguiente(): void
    {
        $primera = $this->raizEn(EstadoEntrega::RECIBIDA_ETTS, '03');
        $segunda = $this->raizEn(EstadoEntrega::RECIBIDA_ETTS, '04');
        $this->actuarComo(Rol::ETTS);

        $this->postJson('/api/transferencia/enviar-ette', ['dependencia_ids' => [$primera->id]])->assertCreated();
        $this->postJson('/api/transferencia/enviar-ette', ['dependencia_ids' => [$segunda->id]])
            ->assertCreated()->assertJsonPath('data.codigo', sprintf('CE-%d-002', now()->year));
    }

    public function test_el_etts_no_recibe_la_entrega_de_un_cc_hijo(): void
    {
        $this->entregaEn($this->hijo, EstadoEntrega::REMITIDA);
        $this->actuarComo(Rol::ETTS);

        $this->postJson('/api/transferencia/recibir-etts', ['dependencia_ids' => [$this->hijo->id]])->assertConflict();
        $this->assertSame(EstadoEntrega::REMITIDA, $this->entregaDe($this->hijo)->estado);
    }

    public function test_el_envio_al_ette_es_todo_o_nada(): void
    {
        $recibida = $this->raizEn(EstadoEntrega::RECIBIDA_ETTS, '03');
        $this->entregaEn($this->raiz, EstadoEntrega::REMITIDA);
        $this->actuarComo(Rol::ETTS);

        $this->postJson('/api/transferencia/enviar-ette', ['dependencia_ids' => [$recibida->id, $this->raiz->id]])
            ->assertConflict();

        $this->assertSame(EstadoEntrega::RECIBIDA_ETTS, $this->entregaDe($recibida)->estado);
        $this->assertSame(0, EnvioEtte::count());
    }

    public function test_el_ette_no_recibe_lo_que_el_etts_no_envio(): void
    {
        $this->entregaEn($this->raiz, EstadoEntrega::RECIBIDA_ETTS);
        $this->actuarComo(Rol::ETTE);

        $this->postJson('/api/transferencia/recibir-ette', ['dependencia_ids' => [$this->raiz->id]])->assertConflict();
    }

    public function test_cada_paso_de_la_cadena_exige_su_rol(): void
    {
        $this->entregaEn($this->raiz, EstadoEntrega::REMITIDA);
        $ids = ['dependencia_ids' => [$this->raiz->id]];

        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->raiz);
        $this->postJson('/api/transferencia/recibir-etts', $ids)->assertForbidden();
        $this->getJson('/api/transferencia/cadena-etts')->assertForbidden();

        $this->actuarComo(Rol::ETTE);
        $this->postJson('/api/transferencia/recibir-etts', $ids)->assertForbidden();
        $this->postJson('/api/transferencia/enviar-ette', $ids)->assertForbidden();

        $this->actuarComo(Rol::ETTS);
        $this->postJson('/api/transferencia/recibir-ette', $ids)->assertForbidden();
    }

    public function test_la_bandeja_lista_solo_los_cc_que_envian_al_etts_con_su_subarbol(): void
    {
        $this->entregaEn($this->raiz, EstadoEntrega::REMITIDA);
        $this->entregaEn($this->hijo, EstadoEntrega::REMITIDA);
        $this->actuarComo(Rol::ETTS);

        $this->getJson('/api/transferencia/cadena-etts')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.codigo', '07')
            ->assertJsonPath('data.0.estado', 'remitida')
            ->assertJsonPath('data.0.subarbol.total', 1)
            ->assertJsonPath('data.0.subarbol.remitidos', 1);
    }

    public function test_el_tablero_cuenta_la_cadena_como_remitida(): void
    {
        $this->entregaEn($this->raiz, EstadoEntrega::RECIBIDA_ETTE);
        $this->actuarComo(Rol::ETTS);

        $this->getJson('/api/transferencia/tablero')
            ->assertOk()
            ->assertJsonPath('data.metricas.remitidas', 1)
            ->assertJsonPath('data.metricas.recibidas_ette', 1);
    }
}
