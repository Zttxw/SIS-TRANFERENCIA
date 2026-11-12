<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\ActaTransferencia;
use App\Modules\Transferencia\Models\Entrega;
use App\Modules\Transferencia\Models\FirmaAnexo;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\CaracterFirma;
use App\Support\Enums\EstadoEntrega;
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * B3b (D-02): gate de remisión. Cuando el proceso tiene `exige_firma_acta`
 * encendido, remitir exige que el acta (Anexo 07) tenga su firma OBLIGATORIA del
 * responsable del centro de costo. El gate está APAGADO por defecto: el flujo
 * actual sigue funcionando sin firma real.
 */
class GateFirmaActaRemisionTest extends TestCase
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

    private function responsableDeLaHija(): User
    {
        $usuario = User::factory()->create();
        AsignacionRol::factory()->rol(Rol::RESPONSABLE_CENTRO_COSTO)->create([
            'user_id' => $usuario->id,
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->hija->id,
        ]);
        Sanctum::actingAs($usuario);

        return $usuario;
    }

    private function emitirActa(): ActaTransferencia
    {
        $this->getJson("/api/transferencia/acta?dependencia_id={$this->hija->id}")->assertOk();

        return ActaTransferencia::where('dependencia_id', $this->hija->id)->firstOrFail();
    }

    private function encenderGate(): void
    {
        $this->proceso->update(['exige_firma_acta' => true]);
    }

    public function test_gate_apagado_permite_remitir_sin_firma(): void
    {
        // Por defecto el gate está apagado: el flujo actual no exige firma.
        $this->responsableDeLaHija();

        $this->postJson('/api/transferencia/remitir', ['dependencia_id' => $this->hija->id])
            ->assertOk();

        $entrega = Entrega::where('dependencia_id', $this->hija->id)->firstOrFail();
        $this->assertSame(EstadoEntrega::REMITIDA, $entrega->estado);
    }

    public function test_gate_encendido_sin_firma_del_acta_bloquea_con_409(): void
    {
        $this->encenderGate();
        $this->responsableDeLaHija();
        $this->emitirActa(); // acta existe pero sin firma obligatoria

        $this->postJson('/api/transferencia/remitir', ['dependencia_id' => $this->hija->id])
            ->assertStatus(409);

        $this->assertDatabaseMissing('entregas', [
            'dependencia_id' => $this->hija->id,
            'estado' => EstadoEntrega::REMITIDA->value,
        ]);
    }

    public function test_gate_encendido_con_firma_obligatoria_del_acta_permite_remitir(): void
    {
        $this->encenderGate();
        $responsable = $this->responsableDeLaHija();
        $acta = $this->emitirActa();

        FirmaAnexo::factory()->firmada()->create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->hija->id,
            'firmable_type' => $acta->getMorphClass(),
            'firmable_id' => $acta->id,
            'version' => $acta->version,
            'firmante_id' => $responsable->id,
            'caracter' => CaracterFirma::OBLIGATORIA,
        ]);

        $this->postJson('/api/transferencia/remitir', ['dependencia_id' => $this->hija->id])
            ->assertOk();

        $entrega = Entrega::where('dependencia_id', $this->hija->id)->firstOrFail();
        $this->assertSame(EstadoEntrega::REMITIDA, $entrega->estado);
    }

    public function test_gate_encendido_solo_firma_opcional_no_basta(): void
    {
        $this->encenderGate();
        $this->responsableDeLaHija();
        $acta = $this->emitirActa();

        // Una firma opcional (p. ej. ETTE) no satisface el gate obligatorio.
        FirmaAnexo::factory()->firmada()->create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->hija->id,
            'firmable_type' => $acta->getMorphClass(),
            'firmable_id' => $acta->id,
            'version' => $acta->version,
            'caracter' => CaracterFirma::OPCIONAL,
        ]);

        $this->postJson('/api/transferencia/remitir', ['dependencia_id' => $this->hija->id])
            ->assertStatus(409);
    }
}
