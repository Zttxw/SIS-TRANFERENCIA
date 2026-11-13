<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * D2 — El comité ETTE gestiona sus delegados (RF-008). Alta/designación y
 * revocación limitadas a su equipo: solo toca asignaciones delegado_ette, no
 * otros roles ni cuentas institucionales (doc 05 §3).
 */
class DelegadoGestionTest extends TestCase
{
    use RefreshDatabase;

    private ProcesoTransferencia $proceso;

    private Dependencia $dependencia;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesPermisosSeeder::class);
        $this->proceso = ProcesoTransferencia::factory()->create(['estado' => 'abierto']);
        $this->dependencia = Dependencia::factory()->create(['proceso_transferencia_id' => $this->proceso->id]);
    }

    private function actuarComo(Rol $rol): User
    {
        $usuario = User::factory()->create();
        AsignacionRol::factory()->rol($rol)->create([
            'user_id' => $usuario->id,
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $rol === Rol::ETTE ? null : $this->dependencia->id,
        ]);
        Sanctum::actingAs($usuario);

        return $usuario;
    }

    public function test_el_comite_designa_a_un_usuario_como_delegado(): void
    {
        $this->actuarComo(Rol::ETTE);
        $candidato = User::factory()->create();

        $this->postJson('/api/delegados', [
            'user_id' => $candidato->id,
            'dependencia_id' => $this->dependencia->id,
        ])->assertCreated();

        $this->assertDatabaseHas('asignaciones_rol', [
            'user_id' => $candidato->id,
            'dependencia_id' => $this->dependencia->id,
            'rol' => Rol::DELEGADO_ETTE->value,
        ]);
    }

    public function test_designar_es_idempotente(): void
    {
        $this->actuarComo(Rol::ETTE);
        $candidato = User::factory()->create();

        $payload = ['user_id' => $candidato->id, 'dependencia_id' => $this->dependencia->id];
        $this->postJson('/api/delegados', $payload)->assertCreated();
        $this->postJson('/api/delegados', $payload)->assertCreated();

        $this->assertSame(1, AsignacionRol::where('user_id', $candidato->id)
            ->where('rol', Rol::DELEGADO_ETTE->value)->count());
    }

    public function test_el_comite_revoca_una_designacion(): void
    {
        $this->actuarComo(Rol::ETTE);
        $candidato = User::factory()->create();
        $asignacion = AsignacionRol::factory()->rol(Rol::DELEGADO_ETTE)->create([
            'user_id' => $candidato->id,
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->dependencia->id,
        ]);

        $this->deleteJson("/api/delegados/{$asignacion->id}")->assertOk();

        $this->assertDatabaseMissing('asignaciones_rol', ['id' => $asignacion->id]);
    }

    public function test_revocar_no_elimina_otros_roles_del_usuario(): void
    {
        $this->actuarComo(Rol::ETTE);

        // Un usuario que es servidor (rol institucional) y además delegado.
        $usuario = User::factory()->create();
        $rolServidor = AsignacionRol::factory()->rol(Rol::SERVIDOR)->create([
            'user_id' => $usuario->id,
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->dependencia->id,
        ]);
        $rolDelegado = AsignacionRol::factory()->rol(Rol::DELEGADO_ETTE)->create([
            'user_id' => $usuario->id,
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->dependencia->id,
        ]);

        // Intentar revocar vía el id del rol servidor no debe borrarlo (no es delegado).
        $this->deleteJson("/api/delegados/{$rolServidor->id}")->assertNotFound();
        $this->assertDatabaseHas('asignaciones_rol', ['id' => $rolServidor->id]);

        // Revocar el delegado sí; el rol servidor permanece intacto.
        $this->deleteJson("/api/delegados/{$rolDelegado->id}")->assertOk();
        $this->assertDatabaseHas('asignaciones_rol', ['id' => $rolServidor->id]);
        $this->assertDatabaseMissing('asignaciones_rol', ['id' => $rolDelegado->id]);
    }

    public function test_un_delegado_no_puede_gestionar_delegados(): void
    {
        $this->actuarComo(Rol::DELEGADO_ETTE);
        $candidato = User::factory()->create();

        $this->postJson('/api/delegados', [
            'user_id' => $candidato->id,
            'dependencia_id' => $this->dependencia->id,
        ])->assertForbidden();
    }

    public function test_el_administrador_general_no_hereda_gestion_de_delegados(): void
    {
        // doc 05 §3: gestionar delegados ≠ administrar usuarios. El administrador
        // no recibe delegados.gestionar por defecto.
        $this->actuarComo(Rol::ADMINISTRADOR);
        $candidato = User::factory()->create();

        $this->postJson('/api/delegados', [
            'user_id' => $candidato->id,
            'dependencia_id' => $this->dependencia->id,
        ])->assertForbidden();
    }

    public function test_el_comite_busca_cuentas_activas_sin_exponer_datos_privados(): void
    {
        $this->actuarComo(Rol::ETTE);
        $candidato = User::factory()->create(['name' => 'Candidata de prueba', 'activo' => true]);
        User::factory()->create(['name' => 'Candidata inactiva', 'activo' => false]);

        $this->getJson('/api/delegados/candidatos?buscar=Candidata')
            ->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $candidato->id)
            ->assertJsonMissingPath('data.0.email')
            ->assertJsonMissingPath('data.0.password');
    }

    public function test_buscar_candidatos_requiere_permiso_del_comite(): void
    {
        $this->actuarComo(Rol::DELEGADO_ETTE);
        $this->getJson('/api/delegados/candidatos')->assertForbidden();
    }
}
