<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Homologa el campo 'nivel' de las dependencias a los Niveles Organizacionales
     * oficiales definidos en el Anexo 01 de la Directiva N.° 001-2026-MDSJ/A:
     * - Nivel 1: Alta Dirección y Control (Alcaldía, Concejo, Gerencia Municipal, OCI, Procuraduría).
     * - Nivel 2: Gerencias de Línea y Oficinas Generales.
     * - Nivel 3: Oficinas y Subgerencias (ej. Tecnologías de la Información, Contabilidad, Abastecimiento) y Unidades.
     */
    public function up(): void
    {
        $operador = DB::getDriverName() === 'pgsql' ? 'ilike' : 'like';
        $notOperador = DB::getDriverName() === 'pgsql' ? 'not ilike' : 'not like';

        // 1. Nivel 1: Alta Dirección y Control
        DB::table('dependencias')
            ->where(function ($q) use ($operador) {
                $q->where('nombre', $operador, '%ALCALD%')
                    ->orWhere('nombre', $operador, '%CONCEJO MUNICIPAL%')
                    ->orWhere('nombre', $operador, '%GERENCIA MUNICIPAL%')
                    ->orWhere('nombre', $operador, '%CONTROL INSTITUCIONAL%')
                    ->orWhere('nombre', $operador, '%PROCURADUR%');
            })
            ->where('nombre', $notOperador, '%DESPACHO DE ALCALDIA%')
            ->update(['nivel' => 1]);

        // 2. Nivel 2: Gerencias de Línea y Oficinas Generales
        DB::table('dependencias')
            ->where(function ($q) use ($operador) {
                $q->where('nombre', $operador, 'OFICINA GENERAL %')
                    ->orWhere('nombre', $operador, 'GERENCIA DE %')
                    ->orWhere('nombre', $operador, 'GERENCIA GENERAL %');
            })
            ->where('nombre', $notOperador, '%GERENCIA MUNICIPAL%')
            ->update(['nivel' => 2]);

        // 3. Nivel 3: Oficinas, Subgerencias y Unidades (incluyendo Tecnologías de la Información)
        DB::table('dependencias')
            ->where(function ($q) use ($operador) {
                $q->where('nombre', $operador, 'OFICINA DE %')
                    ->orWhere('nombre', $operador, 'SUBGERENCIA %')
                    ->orWhere('nombre', $operador, 'SUB GERENCIA %')
                    ->orWhere('nombre', $operador, 'UNIDAD %')
                    ->orWhere('nombre', $operador, 'AREA %')
                    ->orWhere('nombre', $operador, 'DIVISIÓN %')
                    ->orWhere('nombre', $operador, 'DIVISION %')
                    ->orWhere('nombre', $operador, '%TECNOLOG%');
            })
            ->where('nombre', $notOperador, 'OFICINA GENERAL %')
            ->update(['nivel' => 3]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No se requiere revertir dado que la homologación oficial es el estándar de la entidad.
    }
};
