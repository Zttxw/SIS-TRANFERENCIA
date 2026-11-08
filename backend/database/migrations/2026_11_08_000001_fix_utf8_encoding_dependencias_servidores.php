<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Corrige caracteres corruptos por doble codificación UTF-8 / Windows-1252
     * en dependencias y servidores provenientes del SGD.
     */
    public function up(): void
    {
        $dependencias = [
            '01.02.02.01' => 'OFICINA DE SECRETARÍA GENERAL Y GESTIÓN DOCUMENTARIA DESPACHO',
            '01.03.03' => 'OFICINA DE EJECUCIÓN COACTIVA',
            '01.03.04' => 'OFICINA DE GESTIÓN DE RIESGOS DE DESASTRES',
            '01.03.05' => 'OFICINA GENERAL DE ADMINISTRACIÓN',
            '01.03.05.01' => 'OFICINA GENERAL DE ADMINISTRACIÓN DESPACHO',
            '01.03.05.04' => 'OFICINA DE GESTIÓN PATRIMONIAL',
            '01.03.05.06' => 'OFICINA DE TESORERÍA',
            '01.03.06' => 'OFICINA GENERAL DE SUPERVISIÓN Y LIQUIDACIÓN DE INVERSIONES',
            '01.03.06.01' => 'OFICINA GENERAL DE SUPERVISIÓN Y LIQUIDACIÓN DE INVERSIONES DESPACHO',
            '01.03.14.03.01' => 'SUBGERENCIA DE PROGRAMAS SOCIALES Y PARTICIPACIÓN CIUDADANA DESPACHO',
        ];

        foreach ($dependencias as $codigo => $nombre) {
            DB::table('dependencias')->where('codigo', $codigo)->update(['nombre' => $nombre]);
        }

        $servidores = [
            5 => 'AREVALO YAÑEZ',
            23 => 'TRIVEÑOS ESTRADA',
            25 => 'MUÑOZ YAÑEZ',
            34 => 'BERNAL PEÑA',
            45 => 'CASTAÑEDA LOAYZA',
        ];

        foreach ($servidores as $id => $apellidos) {
            DB::table('servidores')->where('id', $id)->update(['apellidos' => $apellidos]);
        }
    }

    public function down(): void
    {
        // Sin reversión destructiva de corrección ortográfica
    }
};
