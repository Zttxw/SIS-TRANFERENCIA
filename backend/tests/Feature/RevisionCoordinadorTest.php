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
use App\Support\Enums\EstadoObservacion;
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Concerns\PreparaEntregas;
use Tests\TestCase;

/**
 * Aceptación del coordinador ETTE antes de firmar (D-07, F-03, F-05): el
 * responsable presenta; el coordinador acepta lo entregado, con observaciones
 * solo como constancia. No hay devolución ni subsanación.
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

    private function verificar(array $datos = []): TestResponse
    {
        return $this->postJson('/api/transferencia/verificar', [
            'dependencia_id' => $this->centro->id,
            'resultado_verificacion' => 'Se revisaron los anexos 02 al 06; no se verificó el estado físico de los bienes.',
            ...$datos,
        ]);
    }

    public function test_presentar_y_aceptar_con_observaciones_de_constancia(): void
    {
        Sanctum::actingAs($this->responsable);
        $this->postJson('/api/transferencia/presentar', ['dependencia_id' => $this->centro->id])->assertOk();
        $this->assertSame(EstadoEntrega::EN_REVISION, $this->estado());

        // F-03: la observación queda registrada, sin devolver la entrega.
        Sanctum::actingAs($this->coordinador);
        $this->postJson('/api/observaciones', ['anexo' => 'gestion', 'dependencia_id' => $this->centro->id,
            'descripcion' => 'No se detallan los asuntos pendientes.'])->assertCreated();
        $this->assertSame(EstadoEntrega::EN_REVISION, $this->estado());

        // F-05: el coordinador acepta aunque haya observaciones y deja constancia.
        $this->verificar()->assertOk();

        $entrega = Entrega::where('dependencia_id', $this->centro->id)->firstOrFail();
        $this->assertSame(EstadoEntrega::VERIFICADA, $entrega->estado);
        $this->assertSame($this->coordinador->id, $entrega->verificada_por_id);
        $this->assertSame(CalidadEtte::COORDINADOR, $entrega->verificada_en_calidad_de);
        $this->assertStringContainsString('no se verificó', (string) $entrega->resultado_verificacion);
        $this->assertSame(1, Observacion::where('dependencia_id', $this->centro->id)->count());
    }

    /** @return array<string, array{0: EstadoEntrega}> */
    public static function estadosQueNoSePresentan(): array
    {
        return [
            'en revisión' => [EstadoEntrega::EN_REVISION],
            'verificada' => [EstadoEntrega::VERIFICADA],
            'remitida' => [EstadoEntrega::REMITIDA],
        ];
    }

    #[DataProvider('estadosQueNoSePresentan')]
    public function test_solo_se_presenta_desde_borrador(EstadoEntrega $estado): void
    {
        $this->entregaEn($this->centro, $estado);
        Sanctum::actingAs($this->responsable);

        $this->postJson('/api/transferencia/presentar', ['dependencia_id' => $this->centro->id])->assertConflict();

        $this->assertSame($estado, $this->estado());
    }

    public function test_el_coordinador_no_presenta_ni_el_responsable_verifica(): void
    {
        Sanctum::actingAs($this->coordinador);
        $this->postJson('/api/transferencia/presentar', ['dependencia_id' => $this->centro->id])->assertForbidden();

        $this->entregaEn($this->centro, EstadoEntrega::EN_REVISION);
        Sanctum::actingAs($this->responsable);
        $this->verificar()->assertForbidden();
    }

    public function test_el_coordinador_de_otro_cc_no_verifica(): void
    {
        $this->entregaEn($this->centro, EstadoEntrega::EN_REVISION);
        $otro = Dependencia::factory()->create(['proceso_transferencia_id' => $this->proceso->id]);
        Sanctum::actingAs($this->usuarioCon(Rol::DELEGADO_ETTE, $otro));

        $this->verificar()->assertForbidden();
        $this->assertSame(EstadoEntrega::EN_REVISION, $this->estado());
    }

    public function test_la_aceptacion_exige_constancia_y_entrega_presentada(): void
    {
        Sanctum::actingAs($this->coordinador);

        $this->entregaEn($this->centro, EstadoEntrega::BORRADOR);
        $this->verificar()->assertConflict();

        $this->entregaEn($this->centro, EstadoEntrega::EN_REVISION);
        $this->verificar(['resultado_verificacion' => ''])->assertUnprocessable()
            ->assertJsonValidationErrors('resultado_verificacion');
    }

    public function test_titular_ette_verifica_en_suplencia_con_motivo(): void
    {
        $this->entregaEn($this->centro, EstadoEntrega::EN_REVISION);
        Sanctum::actingAs($this->usuarioCon(Rol::ETTE, null));

        $this->verificar()->assertUnprocessable()->assertJsonValidationErrors('motivo_suplencia');
        $this->verificar(['motivo_suplencia' => 'Coordinador con licencia.'])->assertOk();

        $entrega = Entrega::where('dependencia_id', $this->centro->id)->firstOrFail();
        $this->assertSame(CalidadEtte::TITULAR_SUPLENTE, $entrega->verificada_en_calidad_de);
        $this->assertSame('Coordinador con licencia.', $entrega->motivo_suplencia_verificacion);
    }

    public function test_reporte_de_verificacion_informa_al_comite_ette(): void
    {
        $this->entregaEn($this->centro, EstadoEntrega::EN_REVISION);
        Observacion::create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->centro->id,
            'anexo' => 'gestion',
            'autor_id' => $this->coordinador->id,
            'descripcion' => 'No se detallan los pendientes.',
            'estado' => EstadoObservacion::REGISTRADA,
        ]);
        Sanctum::actingAs($this->usuarioCon(Rol::ETTE, null));

        $fila = collect($this->getJson('/api/reportes/verificacion')->assertOk()->json('data.filas'))
            ->firstWhere('dependencia_id', $this->centro->id);

        $this->assertSame('en_revision', $fila['estado_entrega']);
        $this->assertSame(1, $fila['observaciones']);
        $this->assertContains('Anexo 02', $fila['anexos_faltantes']);
    }
}
