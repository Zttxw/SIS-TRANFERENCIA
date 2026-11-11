<?php

namespace Database\Factories;

use App\Models\User;
use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\FirmaSesion;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FirmaSesion>
 */
class FirmaSesionFactory extends Factory
{
    protected $model = FirmaSesion::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'proceso_transferencia_id' => ProcesoTransferencia::factory(),
            'dependencia_id' => Dependencia::factory(),
            'usuario_id' => User::factory(),
            'firmante_dni' => '12345678',
            'tipo_documento' => 'anexo03',
            'estado' => 'pendiente',
            'param_token_hash' => hash('sha256', fake()->uuid()),
            'pdf_path' => 'firmaperu/prueba/original.pdf',
            'original_sha256' => hash('sha256', '%PDF-prueba'),
            'expires_at' => now()->addMinutes(15),
        ];
    }
}
