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

class TableroOperativoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesPermisosSeeder::class);
    }

    private function usuarioConRol(Rol $rol, bool $activo = true): User
    {
        $usuario = User::factory()->create(['activo' => $activo]);
        AsignacionRol::factory()->rol($rol)->create(['user_id' => $usuario->id]);
        Sanctum::actingAs($usuario);

        return $usuario;
    }

    public function test_rechaza_tablero_sin_autenticacion(): void
    {
        $this->getJson('/api/transferencia/tablero')->assertUnauthorized();
    }

    public function test_usuario_con_permiso_obtiene_tablero_operativo(): void
    {
        $this->usuarioConRol(Rol::ETTS);

        $response = $this->getJson('/api/transferencia/tablero');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'metricas' => [
                        'total_dependencias',
                        'patrimonio' => [
                            'total_bienes',
                            'verificados',
                            'pendientes',
                            'porcentaje',
                            'valor_total',
                        ],
                    ],
                    'dependencias',
                ],
            ]);
    }
}
