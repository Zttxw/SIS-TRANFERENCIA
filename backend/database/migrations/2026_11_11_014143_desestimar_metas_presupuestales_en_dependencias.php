<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Desactiva nodos de metas presupuestales, proyectos y obras que no corresponden
     * a Centros de Costo formales según el Anexo 01 de la Directiva de Transferencia.
     */
    public function up(): void
    {
        $operador = DB::getDriverName() === 'pgsql' ? 'ilike' : 'like';

        DB::table('dependencias')
            ->where(function ($q) use ($operador) {
                $q->where('nombre', $operador, 'ACTIVIDAD META %')
                    ->orWhere('nombre', $operador, 'PROYECTO META%')
                    ->orWhere('nombre', $operador, 'OBRA META%')
                    ->orWhere('nombre', $operador, 'IOARR META%')
                    ->orWhere('nombre', $operador, 'META %');
            })
            ->update(['activa' => false]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $operador = DB::getDriverName() === 'pgsql' ? 'ilike' : 'like';

        DB::table('dependencias')
            ->where(function ($q) use ($operador) {
                $q->where('nombre', $operador, 'ACTIVIDAD META %')
                    ->orWhere('nombre', $operador, 'PROYECTO META%')
                    ->orWhere('nombre', $operador, 'OBRA META%')
                    ->orWhere('nombre', $operador, 'IOARR META%')
                    ->orWhere('nombre', $operador, 'META %');
            })
            ->update(['activa' => true]);
    }
};
