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
 * Administración de cuentas y roles institucionales (permiso roles.gestionar).
 * Cubre el alta de usuarios externos al padrón SGD (ETTE/personal externo) y la
 * asignación/revocación de roles institucionales a cuentas existentes.
 */
class GestionUsuariosTest extends TestCase
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
            'dependencia_id' => null,
        ]);
        Sanctum::actingAs($usuario);

        return $usuario;
    }

    public function test_el_administrador_crea_un_usuario_externo(): void
    {
        $this->actuarComo(Rol::ADMINISTRADOR);

        $this->postJson('/api/usuarios/externos', [
            'dni' => '70654321',
            'name' => 'Comité Externo',
            'email' => 'externo@mdsj.gob.pe',
            'password' => 'secret123',
        ])->assertCreated();

        $this->assertDatabaseHas('users', [
            'dni' => '70654321',
            'name' => 'Comité Externo',
            'servidor_id' => null,
            'activo' => true,
        ]);
    }

    public function test_crear_externo_puede_asignar_rol_inicial(): void
    {
        $this->actuarComo(Rol::ADMINISTRADOR);

        $this->postJson('/api/usuarios/externos', [
            'dni' => '70111222',
            'name' => 'Miembro ETTE',
            'password' => 'secret123',
            'rol' => Rol::ETTE->value,
        ])->assertCreated();

        $usuario = User::where('dni', '70111222')->firstOrFail();
        $this->assertDatabaseHas('asignaciones_rol', [
            'user_id' => $usuario->id,
            'rol' => Rol::ETTE->value,
            'dependencia_id' => null,
        ]);
    }

    public function test_no_se_crea_un_externo_con_dni_duplicado(): void
    {
        $this->actuarComo(Rol::ADMINISTRADOR);
        User::factory()->create(['dni' => '70999888']);

        $this->postJson('/api/usuarios/externos', [
            'dni' => '70999888',
            'name' => 'Duplicado',
            'password' => 'secret123',
        ])->assertStatus(422)->assertJsonValidationErrors('dni');
    }

    public function test_asigna_rol_etts_global_a_una_cuenta_existente(): void
    {
        $this->actuarComo(Rol::ADMINISTRADOR);
        $cuenta = User::factory()->create();

        $this->postJson("/api/usuarios/{$cuenta->id}/roles", [
            'rol' => Rol::ETTS->value,
        ])->assertCreated();

        $this->assertDatabaseHas('asignaciones_rol', [
            'user_id' => $cuenta->id,
            'rol' => Rol::ETTS->value,
            'dependencia_id' => null,
        ]);
    }

    public function test_un_rol_con_ambito_exige_dependencia(): void
    {
        $this->actuarComo(Rol::ADMINISTRADOR);
        $cuenta = User::factory()->create();

        $this->postJson("/api/usuarios/{$cuenta->id}/roles", [
            'rol' => Rol::COORDINADOR->value,
        ])->assertStatus(422)->assertJsonValidationErrors('dependencia_id');
    }

    public function test_un_rol_global_rechaza_una_dependencia(): void
    {
        $this->actuarComo(Rol::ADMINISTRADOR);
        $cuenta = User::factory()->create();

        $this->postJson("/api/usuarios/{$cuenta->id}/roles", [
            'rol' => Rol::ETTE->value,
            'dependencia_id' => $this->dependencia->id,
        ])->assertStatus(422)->assertJsonValidationErrors('dependencia_id');
    }

    public function test_no_se_puede_asignar_el_rol_administrador_por_este_panel(): void
    {
        $this->actuarComo(Rol::ADMINISTRADOR);
        $cuenta = User::factory()->create();

        $this->postJson("/api/usuarios/{$cuenta->id}/roles", [
            'rol' => Rol::ADMINISTRADOR->value,
        ])->assertStatus(422)->assertJsonValidationErrors('rol');
    }

    public function test_asignar_rol_es_idempotente(): void
    {
        $this->actuarComo(Rol::ADMINISTRADOR);
        $cuenta = User::factory()->create();

        $payload = ['rol' => Rol::ETTS->value];
        $this->postJson("/api/usuarios/{$cuenta->id}/roles", $payload)->assertCreated();
        $this->postJson("/api/usuarios/{$cuenta->id}/roles", $payload)->assertCreated();

        $this->assertSame(1, AsignacionRol::where('user_id', $cuenta->id)
            ->where('rol', Rol::ETTS->value)->count());
    }

    public function test_revoca_un_rol_institucional(): void
    {
        $this->actuarComo(Rol::ADMINISTRADOR);
        $cuenta = User::factory()->create();
        $asignacion = AsignacionRol::factory()->rol(Rol::ETTS)->create([
            'user_id' => $cuenta->id,
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => null,
        ]);

        $this->deleteJson("/api/usuarios/roles/{$asignacion->id}")->assertOk();

        $this->assertDatabaseMissing('asignaciones_rol', ['id' => $asignacion->id]);
    }

    public function test_no_se_puede_revocar_un_rol_de_administrador(): void
    {
        $this->actuarComo(Rol::ADMINISTRADOR);
        $otro = User::factory()->create();
        $asignacion = AsignacionRol::factory()->rol(Rol::ADMINISTRADOR)->create([
            'user_id' => $otro->id,
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => null,
        ]);

        $this->deleteJson("/api/usuarios/roles/{$asignacion->id}")->assertNotFound();
        $this->assertDatabaseHas('asignaciones_rol', ['id' => $asignacion->id]);
    }

    public function test_el_listado_incluye_cuentas_externas_y_de_padron(): void
    {
        $this->actuarComo(Rol::ADMINISTRADOR);
        User::factory()->create(['name' => 'Cuenta buscable externa']);

        $this->getJson('/api/usuarios?buscar=buscable')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Cuenta buscable externa');
    }

    public function test_gestionar_usuarios_requiere_el_permiso_roles_gestionar(): void
    {
        // El responsable de centro de costo no tiene roles.gestionar.
        $usuario = User::factory()->create();
        AsignacionRol::factory()->rol(Rol::RESPONSABLE_CENTRO_COSTO)->create([
            'user_id' => $usuario->id,
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->dependencia->id,
        ]);
        Sanctum::actingAs($usuario);

        $this->getJson('/api/usuarios')->assertForbidden();
        $this->postJson('/api/usuarios/externos', [
            'dni' => '70000001',
            'name' => 'X',
            'password' => 'secret123',
        ])->assertForbidden();
    }
}
