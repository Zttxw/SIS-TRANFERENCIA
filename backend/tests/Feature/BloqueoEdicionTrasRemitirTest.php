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
 * Integridad del flujo (RN-13): una vez remitida la entrega de una dependencia,
 * sus anexos quedan congelados (409) hasta que el revisor la observe
 * (OBSERVADA), que reabre la edición para subsanar.
 */
class BloqueoEdicionTrasRemitirTest extends TestCase
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

    /** @return array<string, mixed> */
    private function payloadInforme(): array
    {
        return [
            'dependencia_id' => $this->dep->id,
            'funciones' => [
                ['descripcion' => 'Funciones del centro de costo de prueba.'],
            ],
            'logros_items' => [
                ['actividad' => 'Principales logros registrados en el periodo.'],
            ],
        ];
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

    public function test_sin_entrega_se_puede_editar_anexo(): void
    {
        $this->actuarComo(Rol::SERVIDOR, $this->dep);

        $this->postJson('/api/gestion/informe', $this->payloadInforme())
            ->assertOk();
    }

    public function test_en_borrador_se_puede_editar_anexo(): void
    {
        $this->actuarComo(Rol::SERVIDOR, $this->dep);
        $this->crearEntrega(EstadoEntrega::BORRADOR);

        $this->postJson('/api/gestion/informe', $this->payloadInforme())
            ->assertOk();
    }

    public function test_tras_remitir_se_bloquea_la_edicion_con_409(): void
    {
        $this->actuarComo(Rol::SERVIDOR, $this->dep);
        $this->crearEntrega(EstadoEntrega::REMITIDA);

        $this->postJson('/api/gestion/informe', $this->payloadInforme())
            ->assertStatus(409);
    }

    public function test_consolidada_tambien_bloquea(): void
    {
        $this->actuarComo(Rol::SERVIDOR, $this->dep);
        $this->crearEntrega(EstadoEntrega::CONSOLIDADA);

        $this->postJson('/api/gestion/informe', $this->payloadInforme())
            ->assertStatus(409);
    }

    public function test_observada_reabre_la_edicion_para_subsanar(): void
    {
        $this->actuarComo(Rol::SERVIDOR, $this->dep);
        $this->crearEntrega(EstadoEntrega::OBSERVADA);

        $this->postJson('/api/gestion/informe', $this->payloadInforme())
            ->assertOk();
    }

    public function test_bloqueo_cubre_escritura_por_id_de_registro(): void
    {
        // Acervo: creado en BORRADOR, luego la entrega se remite → update y
        // destroy por id quedan bloqueados (camino de escritura por id).
        $this->actuarComo(Rol::SERVIDOR, $this->dep);

        $creado = $this->postJson('/api/acervo', [
            'dependencia_id' => $this->dep->id,
            'tipo' => 'fisico',
            'serie_documental' => 'Serie de prueba',
            'cantidad_unidades' => 3,
            'unidad_conservacion' => 'folios',
        ])->assertStatus(201);

        $id = $creado->json('data.id');

        $this->crearEntrega(EstadoEntrega::REMITIDA);

        $this->deleteJson("/api/acervo/{$id}")
            ->assertStatus(409);
    }
}
