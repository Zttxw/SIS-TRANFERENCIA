<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Gestion\Models\InformeGestion;
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
 * Acta de transferencia (plan §7.10): solo se emite con la entrega CONSOLIDADA
 * y su relación de anexos refleja la presencia real (no un hardcode).
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

    private function crearEntrega(EstadoEntrega $estado): void
    {
        Entrega::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->dep->id,
            'dependencia_destino_id' => $this->dep->parent_id,
            'estado' => $estado,
        ]);
    }

    public function test_sin_entrega_consolidada_el_acta_no_se_emite(): void
    {
        $this->responsable();
        $this->crearEntrega(EstadoEntrega::REMITIDA);

        $this->getJson("/api/transferencia/acta?dependencia_id={$this->dep->id}")
            ->assertStatus(409);
    }

    public function test_acta_refleja_presencia_real_de_anexos(): void
    {
        $this->responsable();
        $this->crearEntrega(EstadoEntrega::CONSOLIDADA);

        // Solo existe el Anexo 02 (informe de gestión); el resto no.
        InformeGestion::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->dep->id,
            'principales_funciones' => 'Funciones del centro de costo de prueba.',
            'logros' => 'Logros registrados en el periodo evaluado.',
            'estado' => 'completado',
        ]);

        $respuesta = $this->getJson("/api/transferencia/acta?dependencia_id={$this->dep->id}")
            ->assertOk();

        $respuesta->assertJsonPath('data.anexos_entregados.anexo_02', true);
        $respuesta->assertJsonPath('data.anexos_entregados.anexo_03', false);
        $respuesta->assertJsonPath('data.anexos_entregados.anexo_05', false);
        // El acta misma siempre cuenta como presente.
        $respuesta->assertJsonPath('data.anexos_entregados.anexo_07', true);
        $respuesta->assertJsonPath('data.estado', 'generada');
    }
}
