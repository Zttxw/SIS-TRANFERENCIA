<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\CronogramaActividad;
use App\Modules\Transferencia\Models\Entrega;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Modules\Transferencia\Services\SuscripcionEntrega;
use App\Support\Enums\EstadoEntrega;
use App\Support\Enums\OperacionCronograma;
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\PreparaEntregas;
use Tests\TestCase;

/**
 * El vencimiento del cronograma bloquea en la API las acciones de la etapa que
 * gobierna (D-12): la actividad 3 (verificación) bloquea presentar y aceptar;
 * la 4 (acta) bloquea firmar y remitir; la de remisión, remitir. La respuesta
 * informa causa y plazo. Una actividad vigente, completada o informativa no
 * bloquea.
 */
class CronogramaBloqueoTest extends TestCase
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
        $this->proceso = ProcesoTransferencia::factory()->create(['estado' => 'abierto']);
        $this->padre = Dependencia::factory()->create([
            'proceso_transferencia_id' => $this->proceso->id,
            'nivel' => 2,
        ]);
        $this->hija = Dependencia::factory()->hijaDe($this->padre)->create();
        $this->entregaEn($this->hija);
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

    public function test_remitir_se_bloquea_si_la_actividad_de_remision_vencio(): void
    {
        CronogramaActividad::factory()->vencida()->paraOperacion(OperacionCronograma::REMISION)->create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => null,
            'nombre' => 'Remisión de anexos',
        ]);

        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->hija);

        $respuesta = $this->postJson('/api/transferencia/remitir', ['dependencia_id' => $this->hija->id])
            ->assertStatus(409);

        // La respuesta indica la causa y el plazo (no solo rechaza).
        $respuesta->assertJsonPath('errors.cronograma.accion', 'remitir');
        $respuesta->assertJsonPath('errors.cronograma.actividad', 'Remisión de anexos');

        $this->assertDatabaseMissing('entregas', ['dependencia_id' => $this->hija->id, 'estado' => 'remitida']);
    }

    public function test_remitir_funciona_con_plazo_vigente(): void
    {
        CronogramaActividad::factory()->vigente()->paraOperacion(OperacionCronograma::REMISION)->create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => null,
        ]);

        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->hija);

        $this->postJson('/api/transferencia/remitir', ['dependencia_id' => $this->hija->id])->assertOk();

        $entrega = Entrega::where('dependencia_id', $this->hija->id)->firstOrFail();
        $this->assertSame(EstadoEntrega::REMITIDA, $entrega->estado);
    }

    public function test_una_actividad_completada_no_bloquea_aunque_su_fecha_pasara(): void
    {
        CronogramaActividad::factory()->vencida()->completada()->paraOperacion(OperacionCronograma::REMISION)->create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => null,
        ]);

        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->hija);

        $this->postJson('/api/transferencia/remitir', ['dependencia_id' => $this->hija->id])->assertOk();
    }

    public function test_sin_cronograma_la_remision_no_se_bloquea(): void
    {
        // No se crea ninguna actividad: el bloqueo no debe activarse por defecto.
        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->hija);

        $this->postJson('/api/transferencia/remitir', ['dependencia_id' => $this->hija->id])->assertOk();
    }

    public function test_vencida_la_verificacion_no_se_presenta_al_coordinador(): void
    {
        $this->entregaEn($this->hija, EstadoEntrega::BORRADOR);
        $this->actividad(OperacionCronograma::VERIFICACION);
        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->hija);

        $this->postJson('/api/transferencia/presentar', ['dependencia_id' => $this->hija->id])
            ->assertStatus(409)
            ->assertJsonPath('errors.cronograma.accion', 'presentar');

        $this->assertSame(EstadoEntrega::BORRADOR, Entrega::where('dependencia_id', $this->hija->id)->value('estado'));
    }

    public function test_vencida_la_verificacion_el_coordinador_no_acepta_la_entrega(): void
    {
        $this->entregaEn($this->hija, EstadoEntrega::EN_REVISION);
        $this->actividad(OperacionCronograma::VERIFICACION);
        $this->actuarComo(Rol::DELEGADO_ETTE, $this->hija);

        $this->postJson('/api/transferencia/verificar', [
            'dependencia_id' => $this->hija->id,
            'resultado_verificacion' => 'Se revisaron los anexos 02 al 06.',
        ])->assertStatus(409)->assertJsonPath('errors.cronograma.accion', 'verificar');

        $this->assertSame(EstadoEntrega::EN_REVISION, Entrega::where('dependencia_id', $this->hija->id)->value('estado'));
    }

    public function test_vencida_la_suscripcion_del_acta_no_se_remite(): void
    {
        $this->actividad(OperacionCronograma::ACTA);
        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->hija);

        $this->postJson('/api/transferencia/remitir', ['dependencia_id' => $this->hija->id])
            ->assertStatus(409)
            ->assertJsonPath('errors.cronograma.operacion', 'acta');
    }

    public function test_una_actividad_de_otra_etapa_o_informativa_no_bloquea(): void
    {
        $this->entregaEn($this->hija, EstadoEntrega::BORRADOR);
        $this->actividad(OperacionCronograma::ACTA);
        $this->actividad(OperacionCronograma::NINGUNA);
        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->hija);

        $this->postJson('/api/transferencia/presentar', ['dependencia_id' => $this->hija->id])->assertOk();
    }

    public function test_la_actividad_de_otro_centro_de_costo_no_bloquea(): void
    {
        CronogramaActividad::factory()->vencida()->paraOperacion(OperacionCronograma::REMISION)->create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $this->padre->id,
        ]);
        $this->actuarComo(Rol::RESPONSABLE_CENTRO_COSTO, $this->hija);

        $this->postJson('/api/transferencia/remitir', ['dependencia_id' => $this->hija->id])->assertOk();
    }

    private function actividad(OperacionCronograma $operacion): CronogramaActividad
    {
        return CronogramaActividad::factory()->vencida()->paraOperacion($operacion)->create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => null,
        ]);
    }
}
