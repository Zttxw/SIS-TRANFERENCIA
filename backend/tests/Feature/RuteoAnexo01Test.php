<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Organization\Services\CatalogoCentrosCosto;
use App\Modules\Transferencia\Models\Entrega;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Modules\Transferencia\Services\SuscripcionEntrega;
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Concerns\PreparaEntregas;
use Tests\TestCase;

/**
 * Ruteo de la directiva 2026 (D-01, D-02, F-14): cada CC del Anexo 01 envía a
 * su CC padre registrado en CEPLAN, sin considerar el nivel; el CC cuyo padre
 * es él mismo envía directo al ETTS.
 */
class RuteoAnexo01Test extends TestCase
{
    use PreparaEntregas, RefreshDatabase;

    private ProcesoTransferencia $proceso;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesPermisosSeeder::class);
        $this->partialMock(SuscripcionEntrega::class, function ($mock): void {
            $mock->shouldReceive('requisitosRemision')->andReturn(['puede_remitir' => true, 'firmados' => 6, 'pendientes' => []]);
        });
        $this->proceso = ProcesoTransferencia::factory()->create();
        app(CatalogoCentrosCosto::class)->instalar($this->proceso);
    }

    public function test_el_catalogo_carga_los_64_cc_del_anexo_01_sin_duplicarlos(): void
    {
        app(CatalogoCentrosCosto::class)->instalar($this->proceso);

        $this->assertSame(64, Dependencia::query()->centrosCosto()->where('proceso_transferencia_id', $this->proceso->id)->count());
        $this->assertSame(2, $this->centro('11')->nivel);
        $this->assertSame('OFICINA GENERAL DE ADMINISTRACIÓN', $this->centro('11')->nombre);
    }

    /** @return array<string, array{0: string, 1: ?string}> */
    public static function rutas(): array
    {
        return [
            'nivel 3 envía a su nivel 2' => ['07.05', '07'],
            'nivel 2 sin padre envía al ETTS' => ['07', null],
            'nivel 3 bajo un nivel 1' => ['03.01', '03'],
            'nivel 3 sin padre envía al ETTS' => ['06', null],
            'nivel 3 bajo otro nivel 3' => ['06.01', '06'],
            'tercer tramo del código' => ['11.02.01', '11.02'],
            'nivel 2 bajo otro nivel 2' => ['15.01', '15'],
        ];
    }

    #[DataProvider('rutas')]
    public function test_cada_cc_envia_a_su_padre_del_anexo_01_o_al_etts(string $codigo, ?string $codigoDestino): void
    {
        $centro = $this->centro($codigo);
        $this->actuarComoResponsable($centro);
        $this->entregaEn($centro);

        // El ruteo no depende de los hijos: el padre confirma remitir sin ellos (D-08).
        $this->postJson('/api/transferencia/remitir', ['dependencia_id' => $centro->id, 'confirmar_sin_hijos' => true])->assertSuccessful();

        $destino = Entrega::where('dependencia_id', $centro->id)->value('dependencia_destino_id');
        $this->assertSame($codigoDestino === null ? null : $this->centro($codigoDestino)->id, $destino);
    }

    public function test_una_dependencia_del_sgd_no_envia_entrega(): void
    {
        $dependenciaSgd = Dependencia::factory()->origenSgd()->create(['proceso_transferencia_id' => $this->proceso->id]);
        $this->actuarComoResponsable($dependenciaSgd);

        $this->postJson('/api/transferencia/remitir', ['dependencia_id' => $dependenciaSgd->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('dependencia_id');

        $this->assertDatabaseMissing('entregas', ['dependencia_id' => $dependenciaSgd->id]);
    }

    public function test_el_selector_y_el_organigrama_solo_muestran_cc(): void
    {
        Dependencia::factory()->origenSgd()->create(['proceso_transferencia_id' => $this->proceso->id]);
        $etts = User::factory()->create();
        AsignacionRol::factory()->rol(Rol::ETTS)->create([
            'user_id' => $etts->id,
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => null,
        ]);
        Sanctum::actingAs($etts);

        $this->getJson('/api/dependencias?all=1')->assertOk()->assertJsonCount(64, 'data');
        $this->getJson('/api/dependencias/organigrama')->assertOk()->assertJsonCount(64, 'data');
    }

    public function test_el_responsable_del_padre_ve_a_sus_hijos_del_anexo_01(): void
    {
        $usuario = $this->actuarComoResponsable($this->centro('11'));

        $ambito = $usuario->fresh()->dependenciasEnAmbito();

        $this->assertContains($this->centro('11.02.01')->id, $ambito);
        $this->assertNotContains($this->centro('07')->id, $ambito);
    }

    private function centro(string $codigo): Dependencia
    {
        return Dependencia::query()->centrosCosto()
            ->where('proceso_transferencia_id', $this->proceso->id)
            ->where('codigo_ceplan', $codigo)
            ->firstOrFail();
    }

    private function actuarComoResponsable(Dependencia $dependencia): User
    {
        $usuario = User::factory()->create();
        AsignacionRol::factory()->rol(Rol::RESPONSABLE_CENTRO_COSTO)->create([
            'user_id' => $usuario->id,
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $dependencia->id,
        ]);
        Sanctum::actingAs($usuario);

        return $usuario;
    }
}
