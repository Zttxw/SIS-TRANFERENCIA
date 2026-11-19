<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Modules\Organization\Services\CatalogoCentrosCosto;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use Illuminate\Database\Seeder;

/**
 * Carga los 64 centros de costo del Anexo 01 (CEPLAN) en los procesos
 * abiertos (D-01, D-02). Idempotente.
 */
class CentrosCostoAnexo01Seeder extends Seeder
{
    public function run(CatalogoCentrosCosto $catalogo): void
    {
        ProcesoTransferencia::where('estado', 'abierto')->get()
            ->each(function (ProcesoTransferencia $proceso) use ($catalogo): void {
                $resultado = $catalogo->instalar($proceso);
                $this->command?->info("Anexo 01 en el proceso #{$proceso->id}: {$resultado['creados']} CC creados, {$resultado['actualizados']} actualizados.");
            });
    }
}
