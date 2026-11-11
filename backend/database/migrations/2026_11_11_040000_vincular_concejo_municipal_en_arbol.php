<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Vincula Concejo Municipal (CC 02) bajo el vértice institucional de Alta Dirección (Alcaldía),
     * garantizando que en el árbol orgánico y en el selector se visualice correlativamente entre
     * 01 ALCALDÍA y 03 GERENCIA MUNICIPAL.
     */
    public function up(): void
    {
        $alcaldiaId = DB::table('dependencias')
            ->where('codigo_anexo1', '01')
            ->orWhere('codigo', '00001')
            ->value('id');

        if ($alcaldiaId) {
            DB::table('dependencias')
                ->where('codigo_anexo1', '02')
                ->orWhere('id', 49)
                ->update([
                    'parent_id' => $alcaldiaId,
                    'activa' => true,
                    'es_centro_costo_oficial' => true,
                    'nivel' => 1,
                ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('dependencias')
            ->where('codigo_anexo1', '02')
            ->orWhere('id', 49)
            ->update([
                'parent_id' => null,
            ]);
    }
};
