<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\CronogramaActividad;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\EstadoActividadCronograma;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

/**
 * C1 — Modelo de cronograma (RF-007, C-03). Actividades/etapas con fechas y la
 * lógica derivada de vencimiento que usará el bloqueo (C2). Completar y vencer
 * son hechos distintos.
 */
class CronogramaActividadTest extends TestCase
{
    use RefreshDatabase;

    public function test_actividad_con_vencimiento_pasado_esta_vencida(): void
    {
        $actividad = CronogramaActividad::factory()->vencida()->create();

        $this->assertTrue($actividad->estaVencida());
    }

    public function test_actividad_con_vencimiento_futuro_no_esta_vencida(): void
    {
        $actividad = CronogramaActividad::factory()->vigente()->create();

        $this->assertFalse($actividad->estaVencida());
    }

    public function test_una_actividad_completada_no_se_considera_vencida(): void
    {
        // Vencimiento en el pasado pero ya completada: cumplir ≠ vencer.
        $actividad = CronogramaActividad::factory()->vencida()->completada()->create();

        $this->assertFalse($actividad->estaVencida());
        $this->assertSame(EstadoActividadCronograma::COMPLETADA, $actividad->estado);
    }

    public function test_sin_fecha_de_vencimiento_no_hay_plazo_que_vencer(): void
    {
        $actividad = CronogramaActividad::factory()->create(['fecha_vencimiento' => null]);

        $this->assertFalse($actividad->estaVencida());
    }

    public function test_el_plazo_vence_al_terminar_el_dia_de_vencimiento(): void
    {
        $actividad = CronogramaActividad::factory()->create([
            'fecha_vencimiento' => '2026-12-25',
            'estado' => EstadoActividadCronograma::EN_CURSO,
        ]);

        // Durante el propio día de vencimiento aún no está vencida.
        $this->assertFalse($actividad->estaVencida(Carbon::parse('2026-12-25 23:59:00')));
        // Al día siguiente, sí.
        $this->assertTrue($actividad->estaVencida(Carbon::parse('2026-12-26 00:01:00')));
    }

    public function test_scope_aplicables_a_combina_generales_y_de_la_dependencia(): void
    {
        $proceso = ProcesoTransferencia::factory()->create();
        $dep = Dependencia::factory()->create(['proceso_transferencia_id' => $proceso->id]);
        $otra = Dependencia::factory()->create(['proceso_transferencia_id' => $proceso->id]);

        CronogramaActividad::factory()->create(['proceso_transferencia_id' => $proceso->id, 'dependencia_id' => null]);
        CronogramaActividad::factory()->create(['proceso_transferencia_id' => $proceso->id, 'dependencia_id' => $dep->id]);
        CronogramaActividad::factory()->create(['proceso_transferencia_id' => $proceso->id, 'dependencia_id' => $otra->id]);

        $aplicables = CronogramaActividad::query()
            ->where('proceso_transferencia_id', $proceso->id)
            ->aplicablesA($dep->id)
            ->get();

        // La general + la de la dependencia; no la de otra dependencia.
        $this->assertCount(2, $aplicables);
    }
}
