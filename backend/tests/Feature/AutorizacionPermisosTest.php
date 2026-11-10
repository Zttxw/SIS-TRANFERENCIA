<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Verifica que el middleware `permiso` (plan §5, F8) aplica realmente el
 * catálogo rol→permiso sobre los endpoints de la API: concede al rol con el
 * permiso y rechaza (403) a quien no lo tiene.
 */
class AutorizacionPermisosTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // El middleware resuelve permisos contra el catálogo materializado.
        $this->seed(RolesPermisosSeeder::class);
    }

    /** Autentica un usuario con el rol dado y lo devuelve. */
    private function usuarioConRol(Rol $rol, bool $activo = true): User
    {
        $usuario = User::factory()->create(['activo' => $activo]);
        AsignacionRol::factory()->rol($rol)->create(['user_id' => $usuario->id]);
        Sanctum::actingAs($usuario);

        return $usuario;
    }

    public function test_rechaza_sin_autenticacion(): void
    {
        $this->getJson('/api/patrimonio/bienes')->assertUnauthorized();
    }

    public function test_servidor_puede_ver_anexos(): void
    {
        $this->usuarioConRol(Rol::SERVIDOR);

        // El servidor tiene anexos.ver → pasa la autorización (no 403).
        $respuesta = $this->getJson('/api/patrimonio/bienes');

        $this->assertNotSame(403, $respuesta->status());
    }

    public function test_servidor_no_puede_gestionar_usuarios(): void
    {
        // /api/servidores exige usuarios.gestionar, que el servidor no tiene.
        $this->usuarioConRol(Rol::SERVIDOR);

        $this->getJson('/api/servidores')
            ->assertForbidden()
            ->assertJsonPath('success', false);
    }

    public function test_administrador_puede_gestionar_usuarios(): void
    {
        $this->usuarioConRol(Rol::ADMINISTRADOR);

        $this->assertNotSame(403, $this->getJson('/api/servidores')->status());
    }

    public function test_administrador_no_puede_registrar_anexos(): void
    {
        // El administrador configura e ingesta, pero no registra anexos de
        // dependencias por defecto (Permiso::inicialesPorRol).
        $this->usuarioConRol(Rol::ADMINISTRADOR);

        $this->postJson('/api/gestion/informe', [])->assertForbidden();
    }

    public function test_coordinador_consulta_pero_no_registra_anexos(): void
    {
        $this->usuarioConRol(Rol::COORDINADOR);

        // El coordinador verifica y revisa, pero no registra/edita anexos.
        $this->postJson('/api/gestion/informe', [])->assertForbidden();
    }

    public function test_cuenta_inactiva_es_rechazada_aunque_tenga_rol(): void
    {
        $this->usuarioConRol(Rol::ADMINISTRADOR, activo: false);

        $this->getJson('/api/servidores')
            ->assertForbidden()
            ->assertJsonPath('message', 'La cuenta está inactiva.');
    }

    public function test_solo_responsable_centro_costo_genera_acta(): void
    {
        $this->usuarioConRol(Rol::RESPONSABLE_CENTRO_COSTO);
        $this->assertNotSame(403, $this->getJson('/api/transferencia/acta')->status());
    }

    public function test_servidor_no_genera_acta(): void
    {
        $this->usuarioConRol(Rol::SERVIDOR);
        $this->getJson('/api/transferencia/acta')->assertForbidden();
    }
}
