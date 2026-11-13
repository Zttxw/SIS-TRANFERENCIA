<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\Entrega;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Modules\Transferencia\Services\FirmaperuRegistroService;
use App\Support\Enums\EstadoEntrega;
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Cierre de la cadena hacia el ETTS (directiva §7.6, Etapa 6): la dependencia de
 * primer nivel (sin padre) remite con destino NULL = ETTS; el ETTS (ámbito
 * global) recibe, revisa y consolida institucionalmente con el mismo flujo.
 */
class CierreHaciaEttsTest extends TestCase
{
    use RefreshDatabase;

    private ProcesoTransferencia $proceso;

    private Dependencia $primerNivel;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesPermisosSeeder::class);
        $this->partialMock(FirmaperuRegistroService::class, function ($mock): void {
            $mock->shouldReceive('requisitosRemision')->andReturn(['puede_remitir' => true, 'firmados' => 6, 'pendientes' => []]);
        });
        $this->proceso = ProcesoTransferencia::factory()->create();
        // Dependencia de primer nivel: sin padre.
        $this->primerNivel = Dependencia::factory()->create([
            'proceso_transferencia_id' => $this->proceso->id,
            'nivel' => 1,
            'parent_id' => null,
        ]);
    }

    private function actuarComo(Rol $rol, ?Dependencia $dependencia): User
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

    public function test_primer_nivel_remite_con_destino_etts(): void
    {
        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->primerNivel);

        $this->postJson('/api/transferencia/remitir', [
            'dependencia_id' => $this->primerNivel->id,
        ])->assertOk();

        $entrega = Entrega::where('dependencia_id', $this->primerNivel->id)->firstOrFail();
        $this->assertNull($entrega->dependencia_destino_id);
        $this->assertTrue($entrega->esHaciaEtts());
        $this->assertSame(EstadoEntrega::REMITIDA, $entrega->estado);
    }

    public function test_etts_consolida_institucionalmente_la_entrega_de_primer_nivel(): void
    {
        // El primer nivel remite.
        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->primerNivel);
        $this->postJson('/api/transferencia/remitir', ['dependencia_id' => $this->primerNivel->id])->assertOk();

        // El ETTS (ámbito global) la consolida.
        $this->actuarComo(Rol::ETTS, null);
        $this->postJson('/api/transferencia/revisar', [
            'dependencia_id' => $this->primerNivel->id,
            'accion' => 'consolidar',
        ])->assertOk();

        $entrega = Entrega::where('dependencia_id', $this->primerNivel->id)->firstOrFail();
        $this->assertSame(EstadoEntrega::CONSOLIDADA, $entrega->estado);
        $this->assertNotNull($entrega->consolidada_en);
        $this->assertTrue($entrega->esHaciaEtts());
    }

    public function test_estado_expone_hacia_etts(): void
    {
        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->primerNivel);
        $this->postJson('/api/transferencia/remitir', ['dependencia_id' => $this->primerNivel->id])->assertOk();

        $this->getJson("/api/transferencia/estado?dependencia_id={$this->primerNivel->id}")
            ->assertOk()
            ->assertJsonPath('data.entrega.hacia_etts', true);
    }
}
