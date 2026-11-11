<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Desactiva y marca con soft-delete los registros 'NULL' o vacíos de centros de costo
     * y servidores importados inadvertidamente desde el SGD.
     */
    public function up(): void
    {
        $operador = DB::getDriverName() === 'pgsql' ? 'ilike' : 'like';

        // Desactivar dependencias con nombre nulo, vacío o literal 'NULL'
        DB::table('dependencias')
            ->where(function ($q) use ($operador) {
                $q->whereNull('nombre')
                    ->orWhereRaw("TRIM(nombre) = ''")
                    ->orWhere('nombre', $operador, 'NULL')
                    ->orWhere('nombre', $operador, 'NONE')
                    ->orWhere('nombre', $operador, 'VACIO')
                    ->orWhere('nombre', $operador, 'SIN NOMBRE');
            })
            ->update([
                'activa' => false,
                'deleted_at' => now(),
            ]);

        // Limpiar servidores de prueba o incompletos con nombre 'NULL'
        DB::table('servidores')
            ->where(function ($q) use ($operador) {
                $q->whereNull('nombres')
                    ->orWhereRaw("TRIM(nombres) = ''")
                    ->orWhere('nombres', $operador, 'NULL');
            })
            ->update([
                'deleted_at' => now(),
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('dependencias')
            ->whereIn('codigo', ['00136', '00122', '00096'])
            ->update([
                'activa' => true,
                'deleted_at' => null,
            ]);

        DB::table('servidores')
            ->where('dni', '70576282')
            ->update([
                'deleted_at' => null,
            ]);
    }
};
