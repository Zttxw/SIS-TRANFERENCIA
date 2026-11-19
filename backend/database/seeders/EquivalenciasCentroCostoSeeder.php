<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Modules\Organization\Services\EquivalenciasCentroCosto;
use App\Modules\Transferencia\Models\ProcesoTransferencia;
use Illuminate\Database\Seeder;

/**
 * Carga la tabla de equivalencias SGD/SIGA → CC definida a mano por nombre
 * (database/data/equivalencias_centro_costo.csv). No pisa lo que el
 * administrador ya confirmó desde la pantalla. Requiere el catálogo del
 * Anexo 01 (CentrosCostoAnexo01Seeder).
 */
class EquivalenciasCentroCostoSeeder extends Seeder
{
    public function run(EquivalenciasCentroCosto $equivalencias): void
    {
        ProcesoTransferencia::where('estado', 'abierto')->get()
            ->each(function (ProcesoTransferencia $proceso) use ($equivalencias): void {
                $resultado = $equivalencias->cargarPropuesta($proceso);
                $this->command?->info("Equivalencias del proceso #{$proceso->id}: {$resultado['asignadas']} asignadas, {$resultado['sin_asignar']} sin asignar, {$resultado['conservadas']} confirmadas a mano (sin cambios).");
            });
    }
}
