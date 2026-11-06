<?php

namespace Database\Factories;

use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Dependencia>
 */
class DependenciaFactory extends Factory
{
    protected $model = Dependencia::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'proceso_transferencia_id' => ProcesoTransferencia::factory(),
            'parent_id' => null,
            'codigo' => fake()->unique()->numerify('##.##'),
            'codigo_sgd' => (string) Str::uuid(),
            'nombre' => fake()->unique()->company(),
            'tipo' => 'oficina',
            'nivel' => 3,
            'activa' => true,
            'fuente' => 'sgd',
        ];
    }

    /** Hija de la dependencia dada (hereda su proceso). */
    public function hijaDe(Dependencia $padre): static
    {
        return $this->state(fn (array $attributes) => [
            'parent_id' => $padre->id,
            'proceso_transferencia_id' => $padre->proceso_transferencia_id,
            'nivel' => min(3, $padre->nivel + 1),
        ]);
    }
}
