<?php

namespace Database\Factories;

use App\Modules\Organization\Models\Dependencia;
use App\Modules\Transferencia\Models\DocumentoFirma;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DocumentoFirma>
 */
class DocumentoFirmaFactory extends Factory
{
    protected $model = DocumentoFirma::class;

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
            'tipo_documento' => 'anexo03',
            'version' => 1,
            'contenido_sha256' => hash('sha256', 'contenido de prueba'),
        ];
    }
}
