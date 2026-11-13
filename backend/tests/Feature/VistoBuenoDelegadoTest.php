<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\Entrega;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\EstadoEntrega;
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Visto bueno del delegado ETTE sobre lo remitido (GAP 2 del portal del
 * delegado): constancia de conformidad acotada a su ámbito, que no consolida.
 */
class VistoBuenoDelegadoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesPermisosSeeder::class);
    }

    /** @return array{proceso: ProcesoTransferencia, dep: Dependencia, delegado: User} */
    private function escenario(EstadoEntrega $estado = EstadoEntrega::REMITIDA, bool $conEntrega = true): array
    {
        $proceso = ProcesoTransferencia::factory()->create();
        $dep = Dependencia::factory()->create(['proceso_transferencia_id' => $proceso->id]);
        $delegado = User::factory()->create(['dni' => '12345678', 'activo' => true]);
        AsignacionRol::factory()->rol(Rol::DELEGADO_ETTE)->create([
            'user_id' => $delegado->id, 'proceso_transferencia_id' => $proceso->id, 'dependencia_id' => $dep->id,
        ]);
        if ($conEntrega) {
            Entrega::create(['proceso_transferencia_id' => $proceso->id, 'dependencia_id' => $dep->id,
                'estado' => $estado->value, 'remitida_en' => now()]);
        }

        return compact('proceso', 'dep', 'delegado');
    }

    public function test_delegado_da_consulta_y_retira_visto_bueno_de_su_dependencia(): void
    {
        ['dep' => $dep, 'delegado' => $delegado] = $this->escenario();
        Sanctum::actingAs($delegado);

        $this->getJson("/api/delegado/visto-bueno/{$dep->id}")->assertOk()->assertJsonPath('data.aprobado', false);

        $this->postJson('/api/delegado/visto-bueno', ['dependencia_id' => $dep->id, 'comentario' => 'Conforme'])
            ->assertCreated()->assertJsonPath('data.aprobado', true)->assertJsonPath('data.comentario', 'Conforme');
        $this->assertDatabaseHas('vistos_buenos_delegado', [
            'dependencia_id' => $dep->id, 'delegado_id' => $delegado->id, 'deleted_at' => null,
        ]);

        $this->getJson("/api/delegado/visto-bueno/{$dep->id}")->assertOk()->assertJsonPath('data.aprobado', true);

        $this->deleteJson("/api/delegado/visto-bueno/{$dep->id}")->assertOk()->assertJsonPath('data.aprobado', false);
        $this->assertSoftDeleted('vistos_buenos_delegado', ['dependencia_id' => $dep->id, 'delegado_id' => $delegado->id]);
    }

    public function test_reaprobar_reactiva_sin_duplicar(): void
    {
        ['dep' => $dep, 'delegado' => $delegado] = $this->escenario();
        Sanctum::actingAs($delegado);

        $this->postJson('/api/delegado/visto-bueno', ['dependencia_id' => $dep->id])->assertCreated();
        $this->deleteJson("/api/delegado/visto-bueno/{$dep->id}")->assertOk();
        $this->postJson('/api/delegado/visto-bueno', ['dependencia_id' => $dep->id])->assertCreated()
            ->assertJsonPath('data.aprobado', true);

        $this->assertDatabaseCount('vistos_buenos_delegado', 1);
        $this->assertDatabaseHas('vistos_buenos_delegado', ['dependencia_id' => $dep->id, 'deleted_at' => null]);
    }

    public function test_no_se_puede_aprobar_una_entrega_no_remitida(): void
    {
        ['dep' => $dep, 'delegado' => $delegado] = $this->escenario(EstadoEntrega::BORRADOR);
        Sanctum::actingAs($delegado);

        $this->postJson('/api/delegado/visto-bueno', ['dependencia_id' => $dep->id])->assertStatus(409);
        $this->assertDatabaseCount('vistos_buenos_delegado', 0);
    }

    public function test_no_se_puede_aprobar_sin_entrega(): void
    {
        ['dep' => $dep, 'delegado' => $delegado] = $this->escenario(conEntrega: false);
        Sanctum::actingAs($delegado);

        $this->postJson('/api/delegado/visto-bueno', ['dependencia_id' => $dep->id])->assertStatus(409);
    }

    public function test_el_ambito_impide_aprobar_otra_dependencia(): void
    {
        ['proceso' => $proceso, 'delegado' => $delegado] = $this->escenario();
        $ajena = Dependencia::factory()->create(['proceso_transferencia_id' => $proceso->id]);
        Entrega::create(['proceso_transferencia_id' => $proceso->id, 'dependencia_id' => $ajena->id,
            'estado' => EstadoEntrega::REMITIDA->value, 'remitida_en' => now()]);
        Sanctum::actingAs($delegado);

        $this->getJson("/api/delegado/visto-bueno/{$ajena->id}")->assertForbidden();
        $this->postJson('/api/delegado/visto-bueno', ['dependencia_id' => $ajena->id])->assertForbidden();
        $this->assertDatabaseCount('vistos_buenos_delegado', 0);
    }

    public function test_un_rol_sin_permiso_no_puede_aprobar(): void
    {
        $proceso = ProcesoTransferencia::factory()->create();
        $dep = Dependencia::factory()->create(['proceso_transferencia_id' => $proceso->id]);
        Entrega::create(['proceso_transferencia_id' => $proceso->id, 'dependencia_id' => $dep->id,
            'estado' => EstadoEntrega::REMITIDA->value, 'remitida_en' => now()]);
        $servidor = User::factory()->create(['activo' => true]);
        AsignacionRol::factory()->rol(Rol::SERVIDOR)->create([
            'user_id' => $servidor->id, 'proceso_transferencia_id' => $proceso->id, 'dependencia_id' => $dep->id,
        ]);
        Sanctum::actingAs($servidor);

        $this->postJson('/api/delegado/visto-bueno', ['dependencia_id' => $dep->id])->assertForbidden();
    }
}
