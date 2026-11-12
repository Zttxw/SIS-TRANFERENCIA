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
 * Acta de transferencia (plan §7.10, B3/D-06). El acta se emite ANTES de
 * remitir, declarando solo la *suscripción de la hija*; tras consolidar declara
 * recepción/consolidación. Su relación de anexos refleja la presencia real (no
 * un hardcode).
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

    public function test_acta_se_emite_antes_de_remitir_declarando_suscripcion_de_la_hija(): void
    {
        // B3/D-06: sin entrega consolidada (aquí sin entrega aún), el acta ya se
        // emite y declara solo la suscripción de la hija; no 409 como antes.
        $this->responsable();

        $this->getJson("/api/transferencia/acta?dependencia_id={$this->dep->id}")
            ->assertOk()
            ->assertJsonPath('data.declara', 'suscripcion_hija')
            ->assertJsonPath('data.version', 1)
            ->assertJsonPath('data.estado', 'generada');
    }

    public function test_acta_consolidada_declara_recepcion_y_consolidacion(): void
    {
        $this->responsable();
        $this->crearEntrega(EstadoEntrega::CONSOLIDADA);

        $this->getJson("/api/transferencia/acta?dependencia_id={$this->dep->id}")
            ->assertOk()
            ->assertJsonPath('data.declara', 'recepcion_consolidacion');
    }

    public function test_acta_refleja_presencia_real_de_anexos(): void
    {
        $this->responsable();
        $this->crearEntrega(EstadoEntrega::CONSOLIDADA);

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
        // El acta misma siempre cuenta como presente.
        $respuesta->assertJsonPath('data.anexos_entregados.anexo_07', true);
        $respuesta->assertJsonPath('data.estado', 'generada');
    }
}
