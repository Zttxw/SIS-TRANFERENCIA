<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Documentos\Models\DocumentoPendiente;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\FuenteDato;
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * E2 (RF-002, D-10): drill-down de un indicador al listado documental. El
 * listado comparte filtros/ámbito con el conteo y marca el acceso al original
 * SGD según el perfil, sin servir el archivo.
 */
class DrilldownDocumentalTest extends TestCase
{
    use RefreshDatabase;

    private ProcesoTransferencia $proceso;

    private Dependencia $depA;

    private Dependencia $depB;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesPermisosSeeder::class);
        $this->proceso = ProcesoTransferencia::factory()->create();
        $this->depA = Dependencia::factory()->create([
            'proceso_transferencia_id' => $this->proceso->id,
            'nivel' => 2,
        ]);
        $this->depB = Dependencia::factory()->create([
            'proceso_transferencia_id' => $this->proceso->id,
            'nivel' => 2,
        ]);
    }

    private function actuarComo(Rol $rol, ?Dependencia $dep): User
    {
        $usuario = User::factory()->create();
        AsignacionRol::factory()->rol($rol)->create([
            'user_id' => $usuario->id,
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $dep?->id,
        ]);
        Sanctum::actingAs($usuario);

        return $usuario;
    }

    private function doc(Dependencia $dep, string $fuente): void
    {
        DocumentoPendiente::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $dep->id,
            'asunto' => 'Documento de prueba',
            'fuente' => $fuente,
            'extraido_en' => now(),
        ]);
    }

    public function test_drilldown_comparte_el_filtro_de_dependencia_con_el_indicador(): void
    {
        // 2 docs en A, 1 en B. El drill-down filtrado por A devuelve exactamente 2.
        $this->doc($this->depA, FuenteDato::SGD->value);
        $this->doc($this->depA, FuenteDato::MANUAL->value);
        $this->doc($this->depB, FuenteDato::SGD->value);

        $this->actuarComo(Rol::ADMINISTRADOR, null);

        $this->getJson("/api/documentos-pendientes/drilldown?dependencia_id={$this->depA->id}")
            ->assertOk()
            ->assertJsonPath('data.total', 2)
            ->assertJsonCount(2, 'data.items');
    }

    public function test_original_sgd_disponible_con_permiso_y_no_aplica_en_manual(): void
    {
        $this->doc($this->depA, FuenteDato::SGD->value);
        $this->doc($this->depA, FuenteDato::MANUAL->value);

        // El coordinador tiene expediente.ver ⇒ originales disponibles.
        $this->actuarComo(Rol::COORDINADOR, $this->depA);

        $respuesta = $this->getJson("/api/documentos-pendientes/drilldown?dependencia_id={$this->depA->id}")
            ->assertOk();

        $estados = collect($respuesta->json('data.items'))->pluck('original_sgd', 'fuente');
        $this->assertSame('disponible', $estados[FuenteDato::SGD->value]);
        $this->assertSame('no_aplica', $estados[FuenteDato::MANUAL->value]);
    }

    public function test_original_sgd_restringido_sin_permiso_de_expediente(): void
    {
        $this->doc($this->depA, FuenteDato::SGD->value);

        // El administrador accede al drill-down (reportes.ver) pero NO tiene
        // expediente.ver; el original SGD queda 'restringido' sin servir el archivo.
        $this->actuarComo(Rol::ADMINISTRADOR, null);

        $this->getJson("/api/documentos-pendientes/drilldown?dependencia_id={$this->depA->id}")
            ->assertOk()
            ->assertJsonPath('data.items.0.original_sgd', 'restringido');
    }
}
