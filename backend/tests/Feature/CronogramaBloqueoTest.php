<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\CronogramaActividad;
use App\Modules\Transferencia\Models\Entrega;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Modules\Transferencia\Services\CronogramaService;
use App\Support\Enums\EstadoEntrega;
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * C2 — El vencimiento del cronograma bloquea la remisión en la API (RF-007,
 * C-03). El bloqueo no depende de la interfaz; la respuesta informa causa y
 * plazo. Una actividad vigente o completada no bloquea.
 */
class CronogramaBloqueoTest extends TestCase
{
    use RefreshDatabase;

    private ProcesoTransferencia $proceso;

    private Dependencia $padre;

    private Dependencia $hija;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesPermisosSeeder::class);
        $this->proceso = ProcesoTransferencia::factory()->create(['estado' => 'abierto']);
        $this->padre = Dependencia::factory()->create([
            'proceso_transferencia_id' => $this->proceso->id,
            'nivel' => 2,
        ]);
        $this->hija = Dependencia::factory()->hijaDe($this->padre)->create();
    }

    private function actuarComo(Rol $rol, Dependencia $dependencia): User
    {
        $usuario = User::factory()->create();
        AsignacionRol::factory()->rol($rol)->create([
            'user_id' => $usuario->id,
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $dependencia->id,
        ]);
        Sanctum::actingAs($usuario);

        return $usuario;
    }

    public function test_remitir_se_bloquea_si_la_actividad_de_remision_vencio(): void
    {
        CronogramaActividad::factory()->vencida()->paraOperacion(CronogramaService::OPERACION_REMISION)->create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => null,
            'nombre' => 'Remisión de anexos',
        ]);

        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->hija);

        $respuesta = $this->postJson('/api/transferencia/remitir', ['dependencia_id' => $this->hija->id])
            ->assertStatus(409);

        // La respuesta indica la causa y el plazo (no solo rechaza).
        $respuesta->assertJsonPath('errors.cronograma.operacion', CronogramaService::OPERACION_REMISION);
        $respuesta->assertJsonPath('errors.cronograma.actividad', 'Remisión de anexos');

        $this->assertDatabaseMissing('entregas', ['dependencia_id' => $this->hija->id]);
    }

    public function test_remitir_funciona_con_plazo_vigente(): void
    {
        CronogramaActividad::factory()->vigente()->paraOperacion(CronogramaService::OPERACION_REMISION)->create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => null,
        ]);

        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->hija);

        $this->postJson('/api/transferencia/remitir', ['dependencia_id' => $this->hija->id])->assertOk();

        $entrega = Entrega::where('dependencia_id', $this->hija->id)->firstOrFail();
        $this->assertSame(EstadoEntrega::REMITIDA, $entrega->estado);
    }

    public function test_una_actividad_completada_no_bloquea_aunque_su_fecha_pasara(): void
    {
        CronogramaActividad::factory()->vencida()->completada()->paraOperacion(CronogramaService::OPERACION_REMISION)->create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => null,
        ]);

        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->hija);

        $this->postJson('/api/transferencia/remitir', ['dependencia_id' => $this->hija->id])->assertOk();
    }

    public function test_sin_cronograma_la_remision_no_se_bloquea(): void
    {
        // No se crea ninguna actividad: el bloqueo no debe activarse por defecto.
        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->hija);

        $this->postJson('/api/transferencia/remitir', ['dependencia_id' => $this->hija->id])->assertOk();
    }
}
