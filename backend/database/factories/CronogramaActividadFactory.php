<?php

namespace Database\Factories;

use App\Modules\Transferencia\Models\CronogramaActividad;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\EstadoActividadCronograma;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Carbon;

/**
 * @extends Factory<CronogramaActividad>
 */
class CronogramaActividadFactory extends Factory
{
    protected $model = CronogramaActividad::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'proceso_transferencia_id' => ProcesoTransferencia::factory(),
            'dependencia_id' => null,
            'etapa' => 'Remisión',
            'nombre' => fake()->sentence(3),
            'descripcion' => null,
            'fecha_inicio' => Carbon::now()->subDays(5)->toDateString(),
            'fecha_vencimiento' => Carbon::now()->addDays(5)->toDateString(),
            'hora_vencimiento' => null,
            'estado' => EstadoActividadCronograma::EN_CURSO,
            'operacion' => 'remision',
            'orden' => 0,
        ];
    }

    /** Actividad cuyo plazo ya venció (vencimiento en el pasado, no completada). */
    public function vencida(): static
    {
        return $this->state(fn (array $attributes) => [
            'fecha_vencimiento' => Carbon::now()->subDays(1)->toDateString(),
            'estado' => EstadoActividadCronograma::EN_CURSO,
        ]);
    }

    /** Actividad con plazo vigente (vencimiento en el futuro). */
    public function vigente(): static
    {
        return $this->state(fn (array $attributes) => [
            'fecha_vencimiento' => Carbon::now()->addDays(10)->toDateString(),
            'estado' => EstadoActividadCronograma::EN_CURSO,
        ]);
    }

    public function completada(): static
    {
        return $this->state(fn (array $attributes) => [
            'estado' => EstadoActividadCronograma::COMPLETADA,
        ]);
    }

    public function paraOperacion(string $operacion): static
    {
        return $this->state(fn (array $attributes) => ['operacion' => $operacion]);
    }

    /** Fija una hora de corte exacta (H:i o H:i:s) para el plazo (D-03). */
    public function conHora(string $hora): static
    {
        return $this->state(fn (array $attributes) => ['hora_vencimiento' => $hora]);
    }
}
