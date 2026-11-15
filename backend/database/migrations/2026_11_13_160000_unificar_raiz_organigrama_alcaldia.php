<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Unifica la raíz del organigrama institucional en Alcaldía (00001) y
     * desactiva el nodo pliego '01' (Municipalidad) proveniente del SGD que
     * no es un centro de costo operativo de transferencia.
     */
    public function up(): void
    {
        DB::table('dependencias')
            ->where('codigo', '01')
            ->where('fuente', 'sgd')
            ->update([
                'activa' => false,
                'updated_at' => now(),
            ]);

        DB::table('dependencias')
            ->where('codigo', 'like', '01.%')
            ->where('fuente', 'sgd')
            ->whereNotIn('codigo', ['01.01', '01.03.12.04.02'])
            ->update([
                'activa' => false,
                'updated_at' => now(),
            ]);

        $alcaldias = DB::table('dependencias')
            ->where('codigo', '00001')
            ->where('fuente', 'sgd')
            ->get(['id', 'proceso_transferencia_id']);

        foreach ($alcaldias as $alcaldia) {
            DB::table('dependencias')
                ->where('codigo', '01.01')
                ->where('fuente', 'sgd')
                ->where('proceso_transferencia_id', $alcaldia->proceso_transferencia_id)
                ->update([
                    'parent_id' => $alcaldia->id,
                    'updated_at' => now(),
                ]);
        }
    }

    public function down(): void
    {
        // La estructura previa procede del SGD y requiere una nueva ingesta para restaurarse.
    }
};
