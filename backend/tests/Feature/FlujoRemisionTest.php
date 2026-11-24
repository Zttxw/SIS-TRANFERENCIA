<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\Entrega;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Modules\Transferencia\Services\SuscripcionEntrega;
use App\Support\Enums\EstadoEntrega;
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Concerns\PreparaEntregas;
use Tests\TestCase;

/**
 * Remisión de la entrega del CC (plan §3.1, D-02, D-08): el responsable remite
 * al CC padre solo lo que se cerró para firma y firmaron ambos lados; el CC
 * padre no revisa ni devuelve lo que envían sus hijos.
 */
class FlujoRemisionTest extends TestCase
{
    use PreparaEntregas, RefreshDatabase;

    private ProcesoTransferencia $proceso;

    private Dependencia $padre;

    private Dependencia $hija;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesPermisosSeeder::class);
        $this->partialMock(SuscripcionEntrega::class, function ($mock): void {
            $mock->shouldReceive('requisitosRemision')->andReturn(['puede_remitir' => true, 'firmados' => 6, 'pendientes' => []]);
        });
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

    public function test_servidor_sin_rol_de_responsable_no_puede_remitir_su_oficina(): void
    {
        $this->entregaEn($this->hija);
        $this->actuarComo(Rol::SERVIDOR, $this->hija);

        $this->postJson('/api/transferencia/remitir', ['dependencia_id' => $this->hija->id])->assertForbidden();

        $this->assertSame(EstadoEntrega::EN_REVISION, Entrega::where('dependencia_id', $this->hija->id)->value('estado'));
    }

    public function test_responsable_remite_la_entrega_firmada_al_cc_padre(): void
    {
        $this->entregaEn($this->hija);
        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->hija);

        $this->postJson('/api/transferencia/remitir', [
            'dependencia_id' => $this->hija->id,
            'comentario' => 'Anexos completos.',
        ])->assertOk();

        $entrega = Entrega::where('dependencia_id', $this->hija->id)->firstOrFail();
        $this->assertSame(EstadoEntrega::REMITIDA, $entrega->estado);
        $this->assertSame($this->padre->id, $entrega->dependencia_destino_id);
        $this->assertNotNull($entrega->remitida_en);
    }

    /** @return array<string, array{0: ?EstadoEntrega}> */
    public static function estadosNoRemitibles(): array
    {
        return [
            'sin entrega' => [null],
            'borrador' => [EstadoEntrega::BORRADOR],
            'ya remitida' => [EstadoEntrega::REMITIDA],
        ];
    }

    #[DataProvider('estadosNoRemitibles')]
    public function test_solo_se_remite_una_entrega_cerrada_para_firma(?EstadoEntrega $estado): void
    {
        if ($estado !== null) {
            $this->entregaEn($this->hija, $estado);
        }
        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->hija);

        $this->postJson('/api/transferencia/remitir', ['dependencia_id' => $this->hija->id])->assertConflict();

        $this->assertSame($estado, Entrega::where('dependencia_id', $this->hija->id)->first()?->estado);
    }

    public function test_el_responsable_del_cc_padre_no_observa_a_sus_hijos(): void
    {
        $this->entregaEn($this->hija, EstadoEntrega::EN_REVISION);
        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->padre);

        $this->postJson('/api/observaciones', [
            'anexo' => 'gestion',
            'dependencia_id' => $this->hija->id,
            'descripcion' => 'El padre intenta devolver la entrega.',
        ])->assertForbidden();

        $this->assertSame(EstadoEntrega::EN_REVISION, Entrega::where('dependencia_id', $this->hija->id)->value('estado'));
    }

    public function test_el_cc_padre_consulta_las_entregas_de_su_subarbol(): void
    {
        $this->entregaEn($this->hija, EstadoEntrega::REMITIDA);
        $this->entregaEn($this->padre, EstadoEntrega::BORRADOR);
        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->padre);

        $dependencias = collect($this->getJson('/api/transferencia/entregas')->assertOk()->json('data'))
            ->pluck('dependencia_id')->all();

        $this->assertEqualsCanonicalizing([$this->padre->id, $this->hija->id], $dependencias);
    }
}
