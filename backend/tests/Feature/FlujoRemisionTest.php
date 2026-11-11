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
 * Flujo de remisión jerárquica (aclaración del usuario, plan §6, §7.8):
 * el encargado/delegado de una dependencia remite al padre; el responsable del
 * padre revisa (observa o consolida). Prueba los estados y la autorización.
 */
class FlujoRemisionTest extends TestCase
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

    public function test_encargado_remite_su_entrega_al_padre(): void
    {
        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->hija);

        $this->postJson('/api/transferencia/remitir', [
            'dependencia_id' => $this->hija->id,
            'comentario' => 'Anexos completos.',
        ])->assertOk();

        $entrega = Entrega::where('dependencia_id', $this->hija->id)->firstOrFail();
        $this->assertSame(EstadoEntrega::REMITIDA, $entrega->estado);
        $this->assertSame($this->padre->id, $entrega->dependencia_destino_id);
    }

    public function test_responsable_padre_consolida_entrega_de_la_hija(): void
    {
        // La hija remite.
        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->hija);
        $this->postJson('/api/transferencia/remitir', ['dependencia_id' => $this->hija->id])->assertOk();

        // El responsable del padre (su ámbito incluye a la hija) consolida.
        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->padre);
        $this->postJson('/api/transferencia/revisar', [
            'dependencia_id' => $this->hija->id,
            'accion' => 'consolidar',
        ])->assertOk();

        $entrega = Entrega::where('dependencia_id', $this->hija->id)->firstOrFail();
        $this->assertSame(EstadoEntrega::CONSOLIDADA, $entrega->estado);
        $this->assertNotNull($entrega->revisada_en);
    }

    public function test_responsable_padre_observa_y_devuelve(): void
    {
        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->hija);
        $this->postJson('/api/transferencia/remitir', ['dependencia_id' => $this->hija->id])->assertOk();

        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->padre);
        $this->postJson('/api/transferencia/revisar', [
            'dependencia_id' => $this->hija->id,
            'accion' => 'observar',
            'comentario' => 'Falta el Anexo 04.',
        ])->assertOk();

        $entrega = Entrega::where('dependencia_id', $this->hija->id)->firstOrFail();
        $this->assertSame(EstadoEntrega::OBSERVADA, $entrega->estado);
        $this->assertTrue($entrega->esModificable());
    }

    public function test_no_puede_remitir_una_entrega_ya_consolidada(): void
    {
        // La hija remite y el padre consolida.
        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->hija);
        $this->postJson('/api/transferencia/remitir', ['dependencia_id' => $this->hija->id])->assertOk();

        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->padre);
        $this->postJson('/api/transferencia/revisar', [
            'dependencia_id' => $this->hija->id,
            'accion' => 'consolidar',
        ])->assertOk();

        // Re-remitir la entrega ya consolidada debe rechazarse (H-01, 409).
        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->hija);
        $this->postJson('/api/transferencia/remitir', ['dependencia_id' => $this->hija->id])
            ->assertStatus(409);

        $entrega = Entrega::where('dependencia_id', $this->hija->id)->firstOrFail();
        $this->assertSame(EstadoEntrega::CONSOLIDADA, $entrega->estado);
    }

    public function test_puede_re_remitir_una_entrega_observada(): void
    {
        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->hija);
        $this->postJson('/api/transferencia/remitir', ['dependencia_id' => $this->hija->id])->assertOk();

        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->padre);
        $this->postJson('/api/transferencia/revisar', [
            'dependencia_id' => $this->hija->id,
            'accion' => 'observar',
            'comentario' => 'Falta el Anexo 04.',
        ])->assertOk();

        // Tras observar, la hija corrige y vuelve a remitir: permitido.
        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->hija);
        $this->postJson('/api/transferencia/remitir', ['dependencia_id' => $this->hija->id])
            ->assertOk();

        $entrega = Entrega::where('dependencia_id', $this->hija->id)->firstOrFail();
        $this->assertSame(EstadoEntrega::REMITIDA, $entrega->estado);
    }

    public function test_la_emisora_no_puede_revisar_su_propia_entrega(): void
    {
        // La hija remite su propia entrega (destino = el padre).
        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->hija);
        $this->postJson('/api/transferencia/remitir', ['dependencia_id' => $this->hija->id])->assertOk();

        // El mismo responsable de la hija intenta consolidarla: su ámbito cubre a
        // la hija pero no al destino (el padre). H-02 ⇒ 403.
        $this->postJson('/api/transferencia/revisar', [
            'dependencia_id' => $this->hija->id,
            'accion' => 'consolidar',
        ])->assertForbidden();

        $entrega = Entrega::where('dependencia_id', $this->hija->id)->firstOrFail();
        $this->assertSame(EstadoEntrega::REMITIDA, $entrega->estado);
    }

    public function test_servidor_no_puede_revisar(): void
    {
        // El rol servidor no tiene el permiso entregas.revisar.
        $this->actuarComo(Rol::SERVIDOR, $this->hija);

        $this->postJson('/api/transferencia/revisar', [
            'dependencia_id' => $this->hija->id,
            'accion' => 'consolidar',
        ])->assertForbidden();
    }
}
