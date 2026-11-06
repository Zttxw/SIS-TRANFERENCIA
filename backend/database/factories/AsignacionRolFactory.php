<?php

namespace Database\Factories;

use App\Models\User;
use App\Modules\Auth\Models\AsignacionRol;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use App\Support\Enums\Rol;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AsignacionRol>
 */
class AsignacionRolFactory extends Factory
{
    protected $model = AsignacionRol::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'proceso_transferencia_id' => ProcesoTransferencia::factory(),
            'user_id' => User::factory(),
            'dependencia_id' => null,
            'rol' => Rol::SERVIDOR,
        ];
    }

    public function rol(Rol $rol): static
    {
        return $this->state(fn (array $attributes) => [
            'rol' => $rol,
        ]);
    }

    public function enDependencia(int $dependenciaId): static
    {
        return $this->state(fn (array $attributes) => [
            'dependencia_id' => $dependenciaId,
        ]);
    }
}
