<?php

namespace Database\Factories;

use App\Modules\Transferencia\Models\Feriado;
use App\Support\Enums\AlcanceFeriado;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Feriado>
 */
class FeriadoFactory extends Factory
{
    protected $model = Feriado::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'fecha' => fake()->unique()->dateTimeBetween('+1 year', '+3 years')->format('Y-m-d'),
            'descripcion' => fake()->sentence(3),
            'alcance' => AlcanceFeriado::NACIONAL,
        ];
    }
}
