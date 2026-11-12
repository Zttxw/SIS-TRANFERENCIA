<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Acervo\Models\AcervoDocumental;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AcervoManualTest extends TestCase
{
    use RefreshDatabase;

    public function test_registro_de_archivador_historico_no_necesita_existir_en_sgd_y_se_busca_por_periodo(): void
    {
        $this->seed(RolesPermisosSeeder::class);
        $proceso = ProcesoTransferencia::factory()->create();
        $dep = Dependencia::factory()->create(['proceso_transferencia_id' => $proceso->id]);
        $usuario = User::factory()->create();
        AsignacionRol::factory()->rol(Rol::SERVIDOR)->create(['user_id' => $usuario->id,
            'dependencia_id' => $dep->id, 'proceso_transferencia_id' => $proceso->id]);
        Sanctum::actingAs($usuario);
        $datos = ['dependencia_id' => $dep->id, 'tipo' => 'fisico', 'serie_documental' => 'Informes técnicos',
            'periodo' => '2020 - 2024', 'cantidad_unidades' => 6, 'unidad_conservacion' => 'Archivadores',
            'ubicacion' => 'Estante 2', 'fuente' => 'sgd'];
        $id = $this->postJson('/api/acervo', $datos)->assertCreated()->assertJsonPath('data.fuente', 'manual')->json('data.id');
        $this->assertDatabaseHas('acervo_documental', ['id' => $id, 'proceso_transferencia_id' => $proceso->id,
            'fuente' => 'manual', 'periodo' => '2020 - 2024', 'tipo' => 'fisico', 'cantidad_unidades' => 6]);
        $anterior = ProcesoTransferencia::factory()->cerrado()->create();
        AcervoDocumental::create(['proceso_transferencia_id' => $anterior->id,
            ...$datos, 'serie_documental' => 'Proceso anterior', 'fuente' => 'manual']);
        $this->getJson('/api/acervo?dependencia_id='.$dep->id.'&search=2024')->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $id);
        $this->getJson('/api/acervo?dependencia_id='.$dep->id)->assertOk()->assertJsonCount(1, 'data');
    }
}
