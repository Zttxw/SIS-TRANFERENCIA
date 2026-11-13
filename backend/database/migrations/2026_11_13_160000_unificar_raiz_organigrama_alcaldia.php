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
        // 1. Desactivar el nodo pliego '01'
        DB::table('dependencias')
            ->where('codigo', '01')
            ->update([
                'activa' => false,
                'updated_at' => now(),
            ]);

        // 2. Desactivar nodos duplicados de la estructura SGD excepto Concejo Municipal
        DB::table('dependencias')
            ->where('codigo', 'like', '01.%')
            ->whereNotIn('codigo', ['01.01', '01.03.12.04.02'])
            ->update([
                'activa' => false,
                'updated_at' => now(),
            ]);

        // 3. Vincular Concejo Municipal (01.01) bajo Alcaldía (00001)
        $alcaldiaId = DB::table('dependencias')->where('codigo', '00001')->value('id');
        if ($alcaldiaId !== null) {
            DB::table('dependencias')
                ->where('codigo', '01.01')
                ->update([
                    'parent_id' => $alcaldiaId,
                    'activa' => true,
                    'updated_at' => now(),
                ]);
        }
    }

    public function down(): void
    {
        // No-op reversible sin pérdida de datos
    }
};
