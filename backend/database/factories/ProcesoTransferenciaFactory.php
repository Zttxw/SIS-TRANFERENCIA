<?php

namespace Database\Factories;

use App\Modules\Transferencia\Models\ProcesoTransferencia;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProcesoTransferencia>
 */
class ProcesoTransferenciaFactory extends Factory
{
    protected $model = ProcesoTransferencia::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'nombre' => 'Transferencia de Gestión 2026',
            'anio' => 2026,
            'fecha_corte' => '2026-12-31',
            'estado' => 'abierto',
            'descripcion' => null,
            'cerrado_en' => null,
        ];
    }

    public function cerrado(): static
    {
        return $this->state(fn (array $attributes) => [
            'estado' => 'cerrado',
            'cerrado_en' => now(),
        ]);
    }
}
