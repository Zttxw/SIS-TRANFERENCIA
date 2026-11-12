<?php

namespace Database\Factories;

use App\Models\User;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\FirmaAnexo;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\CaracterFirma;
use App\Support\Enums\EstadoFirma;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Carbon;

/**
 * @extends Factory<FirmaAnexo>
 */
class FirmaAnexoFactory extends Factory
{
    protected $model = FirmaAnexo::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        // Documento firmable por defecto: una dependencia del proceso (sirve de
        // objetivo polimórfico neutral para las pruebas de la tabla). En uso real
        // el firmable es el informe/acta; se fija con ->para($documento).
        $dependencia = Dependencia::factory();

        return [
            'proceso_transferencia_id' => ProcesoTransferencia::factory(),
            'dependencia_id' => $dependencia,
            'firmable_type' => Dependencia::class,
            'firmable_id' => $dependencia,
            'version' => 1,
            'firmante_id' => User::factory(),
            'firmante_nombre' => fake()->name(),
            'firmante_cargo' => fake()->jobTitle(),
            'caracter' => CaracterFirma::OBLIGATORIA,
            'estado' => EstadoFirma::PENDIENTE,
            'firmada_en' => null,
            'hash_pdf' => null,
            'resultado_verificacion' => null,
            'nota' => null,
        ];
    }

    /** Apunta la firma a un documento concreto (informe, acta, etc.). */
    public function para(\Illuminate\Database\Eloquent\Model $documento, int $version = 1): static
    {
        return $this->state(fn (array $attributes) => [
            'firmable_type' => $documento->getMorphClass(),
            'firmable_id' => $documento->getKey(),
            'version' => $version,
        ]);
    }

    public function caracter(CaracterFirma $caracter): static
    {
        return $this->state(fn (array $attributes) => ['caracter' => $caracter]);
    }

    /** Firma efectivamente realizada (estado FIRMADA con hash y fecha). */
    public function firmada(): static
    {
        return $this->state(fn (array $attributes) => [
            'estado' => EstadoFirma::FIRMADA,
            'firmada_en' => Carbon::now(),
            'hash_pdf' => hash('sha256', fake()->uuid()),
        ]);
    }

    /** Firma opcional ETTE ausente: constancia y copia digital (C-08). */
    public function ausente(): static
    {
        return $this->state(fn (array $attributes) => [
            'caracter' => CaracterFirma::OPCIONAL,
            'estado' => EstadoFirma::AUSENTE,
            'nota' => 'ETTE no firmó; se entrega copia digital.',
        ]);
    }
}
