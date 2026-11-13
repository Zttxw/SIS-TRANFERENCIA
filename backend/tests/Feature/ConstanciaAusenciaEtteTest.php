<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\Entrega;
use App\Modules\Transferencia\Models\FirmaAnexo;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Modules\Transferencia\Services\FirmaperuRegistroService;
use App\Support\Enums\CaracterFirma;
use App\Support\Enums\EstadoEntrega;
use App\Support\Enums\EstadoFirma;
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * B2 (D-12): constancia de ausencia de firma ETTE + copia digital. El
 * responsable del centro de costo registra que el ETTE no firmó una versión y
 * marca la copia digital como entregada (sin acuse). La ausencia no bloquea el
 * flujo; queda consultable; es idempotente por documento+versión.
 */
class ConstanciaAusenciaEtteTest extends TestCase
{
    use RefreshDatabase;

    private ProcesoTransferencia $proceso;

    private Dependencia $padre;

    private Dependencia $hija;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesPermisosSeeder::class);
        $this->proceso = ProcesoTransferencia::factory()->create();
        $this->padre = Dependencia::factory()->create([
            'proceso_transferencia_id' => $this->proceso->id,
            'nivel' => 2,
        ]);
        $this->hija = Dependencia::factory()->hijaDe($this->padre)->create();
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

    public function test_responsable_registra_ausencia_ette_y_marca_copia(): void
    {
        $responsable = $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->hija);

        $respuesta = $this->postJson('/api/firmas/ausencia-ette', [
            'dependencia_id' => $this->hija->id,
            'ette_nombre' => 'Juan Pérez (ETTE)',
            'nota' => 'No firmó; se remite copia por el portal.',
        ])->assertCreated();

        $respuesta->assertJsonPath('data.estado', EstadoFirma::AUSENTE->value);
        $respuesta->assertJsonPath('data.caracter', CaracterFirma::OPCIONAL->value);
        $respuesta->assertJsonPath('data.copia_registrada_por_id', $responsable->id);

        $this->assertNotNull(FirmaAnexo::where('dependencia_id', $this->hija->id)->value('copia_entregada_en'));
    }

    public function test_registro_de_ausencia_es_idempotente_por_version(): void
    {
        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->hija);

        $this->postJson('/api/firmas/ausencia-ette', ['dependencia_id' => $this->hija->id])->assertCreated();
        $this->postJson('/api/firmas/ausencia-ette', ['dependencia_id' => $this->hija->id])->assertCreated();

        // Una sola constancia de ausencia por acta+versión (no se duplica).
        $this->assertSame(1, FirmaAnexo::where('dependencia_id', $this->hija->id)->ausentesEtte()->count());
    }

    public function test_la_ausencia_ette_no_bloquea_la_remision(): void
    {
        $this->partialMock(FirmaperuRegistroService::class, function ($mock): void {
            $mock->shouldReceive('requisitosRemision')->andReturn(['puede_remitir' => true, 'firmados' => 6, 'pendientes' => []]);
        });
        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->hija);
        $this->postJson('/api/firmas/ausencia-ette', ['dependencia_id' => $this->hija->id])->assertCreated();

        // Con el gate por defecto apagado, remitir sigue funcionando pese a la
        // ausencia de firma ETTE (opcional).
        $this->postJson('/api/transferencia/remitir', ['dependencia_id' => $this->hija->id])->assertOk();

        $entrega = Entrega::where('dependencia_id', $this->hija->id)->firstOrFail();
        $this->assertSame(EstadoEntrega::REMITIDA, $entrega->estado);
    }

    public function test_constancias_son_consultables(): void
    {
        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->hija);
        $this->postJson('/api/firmas/ausencia-ette', ['dependencia_id' => $this->hija->id])->assertCreated();

        $this->getJson("/api/firmas/ausencia-ette?dependencia_id={$this->hija->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_rol_sin_permiso_no_puede_registrar_ausencia(): void
    {
        // El servidor no tiene firmas.constancia_ausencia.
        $this->actuarComo(Rol::SERVIDOR, $this->hija);

        $this->postJson('/api/firmas/ausencia-ette', ['dependencia_id' => $this->hija->id])
            ->assertForbidden();
    }
}
