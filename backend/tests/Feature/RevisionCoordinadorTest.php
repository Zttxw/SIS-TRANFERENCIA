<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\Entrega;
use App\Modules\Transferencia\Models\Observacion;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\CalidadEtte;
use App\Support\Enums\EstadoEntrega;
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Concerns\PreparaEntregas;
use Tests\TestCase;

/**
 * Revisión presencial del coordinador ETTE (D-07, F-03): el responsable cierra
 * la entrega para firma y, en su sesión, registra las observaciones del
 * coordinador presente (o del titular ETTE que lo suple) como constancia. No hay
 * aceptación aparte: firmar es aprobar (FirmaAmbosLadosTest).
 */
class RevisionCoordinadorTest extends TestCase
{
    use PreparaEntregas, RefreshDatabase;

    private ProcesoTransferencia $proceso;

    private Dependencia $centro;

    private User $responsable;

    private User $coordinador;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesPermisosSeeder::class);
        $this->proceso = ProcesoTransferencia::factory()->create();
        $this->centro = Dependencia::factory()->create(['proceso_transferencia_id' => $this->proceso->id]);
        $this->responsable = $this->usuarioCon(Rol::RESPONSABLE_CENTRO_COSTO, $this->centro);
        $this->coordinador = $this->usuarioCon(Rol::DELEGADO_ETTE, $this->centro);
    }

    private function usuarioCon(Rol $rol, ?Dependencia $dependencia): User
    {
        $usuario = User::factory()->create();
        AsignacionRol::factory()->rol($rol)->create([
            'user_id' => $usuario->id,
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $dependencia?->id,
        ]);

        return $usuario;
    }

    private function estado(): ?EstadoEntrega
    {
        return Entrega::where('dependencia_id', $this->centro->id)->first()?->estado;
    }

    private function observar(): TestResponse
    {
        return $this->postJson('/api/observaciones', ['anexo' => 'gestion', 'dependencia_id' => $this->centro->id,
            'descripcion' => 'No se detallan los asuntos pendientes.']);
    }

    private function designar(array $datos): TestResponse
    {
        return $this->putJson('/api/transferencia/suplencia-ette', ['dependencia_id' => $this->centro->id, ...$datos]);
    }

    public function test_cerrar_para_firma_y_registrar_observaciones_a_nombre_del_coordinador(): void
    {
        Sanctum::actingAs($this->responsable);
        $this->postJson('/api/transferencia/presentar', ['dependencia_id' => $this->centro->id])->assertOk();
        $this->assertSame(EstadoEntrega::EN_REVISION, $this->estado());

        // F-03: la observación queda como constancia, sin devolver la entrega.
        $this->observar()->assertCreated();

        $observacion = Observacion::where('dependencia_id', $this->centro->id)->sole();
        $this->assertSame($this->coordinador->id, $observacion->autor_id);
        $this->assertSame($this->responsable->id, $observacion->registrada_por_id);
        $this->assertSame(CalidadEtte::COORDINADOR, $observacion->en_calidad_de);
        $this->assertSame(EstadoEntrega::EN_REVISION, $this->estado());
    }

    public function test_el_estado_informa_quien_firma_por_el_lado_ette(): void
    {
        Sanctum::actingAs($this->responsable);

        $this->getJson('/api/transferencia/estado?dependencia_id='.$this->centro->id)->assertOk()
            ->assertJsonPath('data.firmante_ette.id', $this->coordinador->id)
            ->assertJsonPath('data.firmante_ette.en_calidad_de', 'coordinador');
    }

    /** @return array<string, array{0: EstadoEntrega}> */
    public static function estadosQueNoSePresentan(): array
    {
        return [
            'en revisión' => [EstadoEntrega::EN_REVISION],
            'acta suscrita' => [EstadoEntrega::ACTA_SUSCRITA],
            'remitida' => [EstadoEntrega::REMITIDA],
        ];
    }

    #[DataProvider('estadosQueNoSePresentan')]
    public function test_solo_se_cierra_para_firma_desde_borrador(EstadoEntrega $estado): void
    {
        $this->entregaEn($this->centro, $estado);
        Sanctum::actingAs($this->responsable);

        $this->postJson('/api/transferencia/presentar', ['dependencia_id' => $this->centro->id])->assertConflict();

        $this->assertSame($estado, $this->estado());
    }

    public function test_el_coordinador_no_opera_desde_su_cuenta(): void
    {
        $this->entregaEn($this->centro);
        Sanctum::actingAs($this->coordinador);

        $this->postJson('/api/transferencia/presentar', ['dependencia_id' => $this->centro->id])->assertForbidden();
        $this->observar()->assertForbidden();
        $this->designar(['titular_id' => null])->assertForbidden();
        $this->postJson('/api/transferencia/verificar', ['dependencia_id' => $this->centro->id])->assertNotFound();
    }

    public function test_las_observaciones_solo_se_registran_en_revision(): void
    {
        Sanctum::actingAs($this->responsable);

        $this->entregaEn($this->centro, EstadoEntrega::BORRADOR);
        $this->observar()->assertConflict();

        $this->entregaEn($this->centro, EstadoEntrega::ACTA_SUSCRITA);
        $this->observar()->assertConflict();
    }

    public function test_sin_coordinador_ni_suplente_no_se_registran_observaciones(): void
    {
        AsignacionRol::where('user_id', $this->coordinador->id)->delete();
        $this->entregaEn($this->centro);
        Sanctum::actingAs($this->responsable);

        $this->observar()->assertConflict();
    }

    public function test_designar_titular_suplente_cambia_el_firmante_ette(): void
    {
        $titular = $this->usuarioCon(Rol::ETTE, null);
        $this->entregaEn($this->centro);
        Sanctum::actingAs($this->responsable);

        $this->designar(['titular_id' => $titular->id, 'motivo_suplencia' => 'Coordinador con licencia.'])->assertOk();
        $this->observar()->assertCreated();

        $observacion = Observacion::where('dependencia_id', $this->centro->id)->sole();
        $this->assertSame($titular->id, $observacion->autor_id);
        $this->assertSame(CalidadEtte::TITULAR_SUPLENTE, $observacion->en_calidad_de);
        $this->assertSame('Coordinador con licencia.', $observacion->motivo_suplencia);

        // Sin designación vuelve a actuar el coordinador asignado.
        $this->designar(['titular_id' => null])->assertOk();
        $this->assertNull(Entrega::where('dependencia_id', $this->centro->id)->value('titular_suplente_id'));
    }

    public function test_la_suplencia_exige_motivo_y_un_titular_ette(): void
    {
        $titular = $this->usuarioCon(Rol::ETTE, null);
        $this->entregaEn($this->centro);
        Sanctum::actingAs($this->responsable);

        $this->designar(['titular_id' => $titular->id])->assertUnprocessable()
            ->assertJsonValidationErrors('motivo_suplencia');
        $this->designar(['titular_id' => $this->coordinador->id, 'motivo_suplencia' => 'Licencia.'])->assertUnprocessable()
            ->assertJsonValidationErrors('titular_id');
    }

    public function test_la_suplencia_solo_se_designa_en_revision(): void
    {
        $titular = $this->usuarioCon(Rol::ETTE, null);
        $this->entregaEn($this->centro, EstadoEntrega::BORRADOR);
        Sanctum::actingAs($this->responsable);

        $this->designar(['titular_id' => $titular->id, 'motivo_suplencia' => 'Licencia.'])->assertConflict();
    }
}
