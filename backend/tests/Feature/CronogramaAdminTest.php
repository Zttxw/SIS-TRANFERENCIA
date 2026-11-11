<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\CronogramaActividad;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * C3 — Administración compartida del cronograma (RF-007, C-03). Administrador y
 * ETTS lo modifican; el resto solo consulta. Las modificaciones se auditan
 * (autor, fecha, valores anteriores/nuevos).
 */
class CronogramaAdminTest extends TestCase
{
    use RefreshDatabase;

    private ProcesoTransferencia $proceso;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesPermisosSeeder::class);
        $this->proceso = ProcesoTransferencia::factory()->create(['estado' => 'abierto']);
    }

    private function actuarComo(Rol $rol): User
    {
        $usuario = User::factory()->create();
        AsignacionRol::factory()->rol($rol)->create([
            'user_id' => $usuario->id,
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => null,
        ]);
        Sanctum::actingAs($usuario);

        return $usuario;
    }

    public function test_etts_puede_crear_una_actividad_del_cronograma(): void
    {
        $this->actuarComo(Rol::ETTS);

        $this->postJson('/api/cronograma', [
            'nombre' => 'Remisión de anexos',
            'fecha_inicio' => '2026-12-01',
            'fecha_vencimiento' => '2026-12-20',
        ])->assertCreated();

        $this->assertDatabaseHas('cronograma_actividades', [
            'nombre' => 'Remisión de anexos',
            'operacion' => 'remision',
        ]);
    }

    public function test_administrador_puede_crear_una_actividad(): void
    {
        $this->actuarComo(Rol::ADMINISTRADOR);

        $this->postJson('/api/cronograma', ['nombre' => 'Firma de documentos'])
            ->assertCreated();
    }

    public function test_servidor_no_puede_modificar_el_cronograma(): void
    {
        $this->actuarComo(Rol::SERVIDOR);

        $this->postJson('/api/cronograma', ['nombre' => 'Intento no autorizado'])
            ->assertForbidden();
    }

    public function test_actualizar_una_actividad_queda_auditado(): void
    {
        $actividad = CronogramaActividad::factory()->vigente()->create([
            'proceso_transferencia_id' => $this->proceso->id,
            'fecha_vencimiento' => '2026-12-20',
        ]);

        $this->actuarComo(Rol::ETTS);

        // Prórroga del plazo.
        $this->putJson("/api/cronograma/{$actividad->id}", [
            'fecha_vencimiento' => '2026-12-30',
        ])->assertOk();

        $this->assertSame('2026-12-30', $actividad->fresh()->fecha_vencimiento->toDateString());

        // El trait Auditable registró el cambio con valores anteriores y nuevos.
        $this->assertDatabaseHas('movimientos_auditoria', [
            'auditable_type' => CronogramaActividad::class,
            'auditable_id' => $actividad->id,
            'evento' => 'actualizado',
        ]);
    }

    public function test_cualquier_cuenta_con_anexos_ver_puede_consultar_el_cronograma(): void
    {
        $dep = Dependencia::factory()->create(['proceso_transferencia_id' => $this->proceso->id]);
        CronogramaActividad::factory()->vigente()->create(['proceso_transferencia_id' => $this->proceso->id]);

        $usuario = User::factory()->create();
        AsignacionRol::factory()->rol(Rol::SERVIDOR)->create([
            'user_id' => $usuario->id,
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $dep->id,
        ]);
        Sanctum::actingAs($usuario);

        $this->getJson('/api/cronograma')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }
}
