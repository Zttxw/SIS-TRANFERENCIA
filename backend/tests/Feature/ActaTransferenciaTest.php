<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Gestion\Models\InformeGestion;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Acta de transferencia (Anexo 07): el sistema la materializa con los datos
 * disponibles de la dependencia; su relación de anexos refleja la presencia real
 * (no un hardcode). El flujo de remisión lo lleva el SGD, por lo que el acta ya
 * no exige estado de entrega.
 */
class ActaTransferenciaTest extends TestCase
{
    use RefreshDatabase;

    private ProcesoTransferencia $proceso;

    private Dependencia $dep;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesPermisosSeeder::class);
        $this->proceso = ProcesoTransferencia::factory()->create();
        $this->dep = Dependencia::factory()->create([
            'proceso_transferencia_id' => $this->proceso->id,
            'nivel' => 2,
        ]);
    }

    private function responsable(): User
    {
        $usuario = User::factory()->create();
        AsignacionRol::factory()->rol(Rol::RESPONSABLE_CENTRO_COSTO)->create([
            'user_id' => $usuario->id,
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->dep->id,
        ]);
        Sanctum::actingAs($usuario);

        return $usuario;
    }

    public function test_acta_refleja_presencia_real_de_anexos(): void
    {
        $this->responsable();

        // Solo existe el Anexo 02 (informe de gestión); el resto no.
        InformeGestion::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->dep->id,
            'funciones' => [['n' => 1, 'descripcion' => 'Funciones del centro de costo de prueba.']],
            'logros_items' => [['n' => 1, 'actividad' => 'Logros registrados en el periodo evaluado.']],
            'estado' => 'completado',
        ]);

        $respuesta = $this->getJson("/api/transferencia/acta?dependencia_id={$this->dep->id}")
            ->assertOk();

        $respuesta->assertJsonPath('data.anexos_entregados.anexo_02', true);
        $respuesta->assertJsonPath('data.anexos_entregados.anexo_03', false);
        $respuesta->assertJsonPath('data.anexos_entregados.anexo_05', false);
        $respuesta->assertJsonPath('data.estado', 'generada');
    }
}
