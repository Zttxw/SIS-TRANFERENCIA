<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\CronogramaActividad;
use App\Modules\Transferencia\Models\Feriado;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\EstadoEntrega;
use App\Support\Enums\OperacionCronograma;
use App\Support\Enums\Rol;
use Database\Seeders\RolesPermisosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\PreparaEntregas;
use Tests\TestCase;

/**
 * Cronograma en días hábiles (RF-21, RF-22, RN-03, F-16): el vencimiento
 * interno es N días hábiles antes del plazo CGR (por defecto 2), salta fines de
 * semana y feriados, y se recalcula si cambia el calendario. El tablero indica
 * cuántos días hábiles le quedan a cada CC para su siguiente acción.
 */
class CalendarioHabilTest extends TestCase
{
    use PreparaEntregas, RefreshDatabase;

    private ProcesoTransferencia $proceso;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesPermisosSeeder::class);
        $this->proceso = ProcesoTransferencia::factory()->create(['estado' => 'abierto']);
        $this->actuarComo(Rol::ETTS);
    }

    private function actuarComo(Rol $rol): User
    {
        $usuario = User::factory()->create();
        AsignacionRol::factory()->rol($rol)->create([
            'user_id' => $usuario->id,
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => null,
        ]);
        Sanctum::actingAs($usuario);

        return $usuario;
    }

    private function crearConPlazoCgr(string $fechaCgr, ?int $diasHabilesAntes = null): CronogramaActividad
    {
        $id = $this->postJson('/api/cronograma', array_filter([
            'nombre' => 'Revisión y verificación',
            'operacion' => OperacionCronograma::VERIFICACION->value,
            'fecha_cgr' => $fechaCgr,
            'dias_habiles_antes' => $diasHabilesAntes,
        ], fn ($valor) => $valor !== null))->assertCreated()->json('data.id');

        return CronogramaActividad::findOrFail($id);
    }

    public function test_el_vencimiento_es_dos_dias_habiles_antes_del_plazo_cgr_saltando_el_fin_de_semana(): void
    {
        // Lunes 30/11/2026 → viernes 27 (1) y jueves 26 (2).
        $actividad = $this->crearConPlazoCgr('2026-11-30');

        $this->assertSame('2026-11-26', $actividad->fecha_vencimiento->toDateString());
        $this->assertSame(2, $actividad->dias_habiles_antes);
    }

    public function test_el_vencimiento_salta_los_feriados(): void
    {
        Feriado::factory()->create(['fecha' => '2026-12-08']);
        Feriado::factory()->create(['fecha' => '2026-12-09']);

        // Viernes 11/12 → jueves 10 (1); 9 y 8 son feriados; lunes 7 (2).
        $actividad = $this->crearConPlazoCgr('2026-12-11');

        $this->assertSame('2026-12-07', $actividad->fecha_vencimiento->toDateString());
    }

    public function test_los_dias_habiles_de_anticipacion_son_configurables(): void
    {
        $actividad = $this->crearConPlazoCgr('2026-11-30', 0);

        $this->assertSame('2026-11-30', $actividad->fecha_vencimiento->toDateString());
    }

    public function test_con_plazo_cgr_se_ignora_la_fecha_de_vencimiento_manual(): void
    {
        $actividad = $this->crearConPlazoCgr('2026-11-30');

        $this->putJson("/api/cronograma/{$actividad->id}", ['fecha_vencimiento' => '2026-12-31'])->assertOk();

        $this->assertSame('2026-11-26', $actividad->fresh()->fecha_vencimiento->toDateString());
    }

    public function test_registrar_o_eliminar_un_feriado_recalcula_los_plazos_cgr(): void
    {
        $actividad = $this->crearConPlazoCgr('2026-12-11');
        $this->assertSame('2026-12-09', $actividad->fecha_vencimiento->toDateString());

        $feriadoId = $this->postJson('/api/feriados', [
            'fecha' => '2026-12-09',
            'descripcion' => 'Batalla de Ayacucho',
            'alcance' => 'nacional',
        ])->assertCreated()->json('data.id');
        $this->assertSame('2026-12-08', $actividad->fresh()->fecha_vencimiento->toDateString());

        $this->deleteJson("/api/feriados/{$feriadoId}")->assertOk();
        $this->assertSame('2026-12-09', $actividad->fresh()->fecha_vencimiento->toDateString());
    }

    public function test_no_se_registran_dos_feriados_en_la_misma_fecha(): void
    {
        Feriado::factory()->create(['fecha' => '2026-12-25']);

        $this->postJson('/api/feriados', ['fecha' => '2026-12-25', 'descripcion' => 'Navidad', 'alcance' => 'nacional'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('fecha');
    }

    public function test_solo_quien_gestiona_el_cronograma_modifica_los_feriados(): void
    {
        $this->actuarComo(Rol::SERVIDOR);

        $this->postJson('/api/feriados', ['fecha' => '2026-12-31', 'descripcion' => 'No laborable', 'alcance' => 'local'])
            ->assertForbidden();
        $this->assertDatabaseCount('feriados', 0);
    }

    public function test_el_tablero_indica_los_dias_habiles_que_faltan_y_los_plazos_vencidos(): void
    {
        // Lunes 23/11/2026 a mediodía en Lima.
        $this->travelTo(Carbon::parse('2026-11-23 12:00', 'America/Lima'));
        $enPlazo = Dependencia::factory()->create(['proceso_transferencia_id' => $this->proceso->id, 'codigo' => '01']);
        $vencido = Dependencia::factory()->create(['proceso_transferencia_id' => $this->proceso->id, 'codigo' => '02']);
        $enFirma = Dependencia::factory()->create(['proceso_transferencia_id' => $this->proceso->id, 'codigo' => '03']);
        $this->entregaEn($enFirma, EstadoEntrega::VERIFICADA);
        CronogramaActividad::factory()->paraOperacion(OperacionCronograma::VERIFICACION)->create([
            'proceso_transferencia_id' => $this->proceso->id,
            'fecha_vencimiento' => '2026-11-26',
        ]);
        CronogramaActividad::factory()->paraOperacion(OperacionCronograma::VERIFICACION)->create([
            'proceso_transferencia_id' => $this->proceso->id,
            'dependencia_id' => $vencido->id,
            'fecha_vencimiento' => '2026-11-20',
        ]);

        $tablero = $this->getJson('/api/transferencia/tablero')->assertOk();

        $plazos = collect($tablero->json('data.dependencias'))->pluck('plazo', 'codigo');
        $this->assertSame(['accion' => 'presentar', 'dias_habiles' => 3, 'vencido' => false],
            array_intersect_key($plazos['01'], array_flip(['accion', 'dias_habiles', 'vencido'])));
        $this->assertTrue($plazos['02']['vencido']);
        $this->assertNull($plazos['03'], 'Ninguna actividad gobierna la firma.');
        $tablero->assertJsonPath('data.metricas.plazos_vencidos', 1);
    }
}
