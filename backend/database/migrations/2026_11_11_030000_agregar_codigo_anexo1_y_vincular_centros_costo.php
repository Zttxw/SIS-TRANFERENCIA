<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Añade la codificación oficial del Anexo 01 (POI 2026 / Directiva N.° 001-2026-MDSJ/A §7),
     * vincula los centros de costo oficiales, reubica jerárquicamente el Área Técnica Municipal
     * y desactiva dependencias duplicadas/huérfanas del SIGA.
     */
    public function up(): void
    {
        Schema::table('dependencias', function (Blueprint $table) {
            $table->string('codigo_anexo1', 20)->nullable()->after('codigo');
            $table->boolean('es_centro_costo_oficial')->default(false)->after('codigo_anexo1');
            $table->index('codigo_anexo1');
            $table->index('es_centro_costo_oficial');
        });

        // 1. Desactivar registros huérfanos del SIGA excepto Concejo Municipal (49) y Saneamiento Físico Legal (125)
        DB::table('dependencias')
            ->where('fuente', 'siga')
            ->whereNotIn('id', [49, 125])
            ->update(['activa' => false]);

        // 2. Corregir jerarquía del Área Técnica Municipal (SGD 00068 / ID 220)
        // Su padre oficial según la Directiva (17.02) es Subgerencia de Saneamiento Básico y ATM (ID 217)
        DB::table('dependencias')
            ->where('codigo', '00068')
            ->update([
                'parent_id' => 217,
                'nivel' => 3,
            ]);

        // 3. Vincular Unidad de Saneamiento Físico Legal (ID 125) bajo Subgerencia de Catastro (ID 209)
        DB::table('dependencias')
            ->where('id', 125)
            ->update([
                'parent_id' => 209,
                'nivel' => 3,
                'codigo_anexo1' => '14.02.01',
                'es_centro_costo_oficial' => true,
                'activa' => true,
            ]);

        // 4. Vincular Concejo Municipal (ID 49) como CC Oficial 02
        DB::table('dependencias')
            ->where('id', 49)
            ->update([
                'codigo_anexo1' => '02',
                'es_centro_costo_oficial' => true,
                'activa' => true,
                'nivel' => 1,
            ]);

        // 5. Mapeo Oficial de los 64 Centros de Costo según Anexo 01 de la Directiva (Páginas 12 y 13)
        $mapeoOficial = [
            // 01 a 03: Alta Dirección
            '00001' => '01',          // ALCALDIA
            '00002' => '03',          // GERENCIA MUNICIPAL
            '00004' => '03.01',       // OFICINA DE IMAGEN INSTITUCIONAL Y COMUNICACIONES
            '00005' => '03.02',       // OFICINA DE EJECUCIÓN COACTIVA
            '00006' => '03.03',       // OFICINA DE GESTIÓN DE RIESGOS DE DESASTRES

            // 04 a 05: Control y Defensa
            '00097' => '04',          // ÓRGANO DE CONTROL INSTITUCIONAL
            '00065' => '05',          // PROCURADURÍA PÚBLICA MUNICIPAL

            // 06: Secretaría General
            '00003' => '06',          // OFICINA DE SECRETARÍA GENERAL Y GESTIÓN DOCUMENTARIA
            '00063' => '06.01',       // UNIDAD DE TRÁMITE DOCUMENTARIO
            '00018' => '06.02',       // UNIDAD DE ARCHIVO CENTRAL

            // 07: Planeamiento y Presupuesto
            '00013' => '07',          // OFICINA GENERAL DE PLANEAMIENTO Y PRESUPUESTO
            '00026' => '07.01',       // OFICINA DE PRESUPUESTO
            '00027' => '07.02',       // OFICINA DE PLANEAMIENTO Y MODERNIZACIÓN
            '00028' => '07.03',       // OFICINA DE COOPERACIÓN TÉCNICA NACIONAL E INTERNACIONAL
            '00029' => '07.04',       // OFICINA DE PROGRAMACIÓN MULTIANUAL DE INVERSIONES
            '00025' => '07.05',       // OFICINA DE TECNOLOGÍAS DE INFORMACIÓN

            // 08: Inversiones
            '00016' => '08',          // OFICINA GENERAL DE GESTIÓN DE INVERSIONES
            '00030' => '08.01',       // OFICINA DE FORMULACIÓN Y EVALUACIÓN DE INVERSIONES
            '00031' => '08.02',       // OFICINA DE ELABORACIÓN DE EXPEDIENTES TÉCNICOS

            // 09 a 10: Asesoría y Supervisión
            '00015' => '09',          // OFICINA GENERAL DE SUPERVISIÓN Y LIQUIDACIÓN DE INVERSIONES
            '00008' => '10',          // OFICINA GENERAL DE ASESORÍA JURÍDICA

            // 11: Administración
            '00007' => '11',          // OFICINA GENERAL DE ADMINISTRACIÓN
            '00024' => '11.01',       // OFICINA DE TESORERÍA
            '00020' => '11.02',       // OFICINA DE RECURSOS HUMANOS
            '00057' => '11.02.01',    // UNIDAD DE SEGURIDAD Y SALUD EN EL TRABAJO
            '00058' => '11.02.02',    // SECRETARÍA TÉCNICA DEL PAD
            '00022' => '11.03',       // OFICINA DE CONTABILIDAD
            '00021' => '11.04',       // OFICINA DE ABASTECIMIENTO
            '00070' => '11.04.01',    // UNIDAD DE ALMACÉN
            '00023' => '11.05',       // OFICINA DE GESTIÓN PATRIMONIAL

            // 12: Administración Tributaria
            '00009' => '12',          // GERENCIA DE ADMINISTRACIÓN TRIBUTARIA
            '00032' => '12.01',       // SUBGERENCIA DE RENTAS
            '00034' => '12.02',       // SUBGERENCIA DE FISCALIZACIÓN TRIBUTARIA
            '00033' => '12.03',       // SUBGERENCIA DE REGISTRO CIVIL Y CEMENTERIOS

            // 13: Infraestructura
            '00017' => '13',          // GERENCIA DE INFRAESTRUCTURA
            '00037' => '13.01',       // SUBGERENCIA DE EJECUCIÓN DE INVERSIONES
            '00035' => '13.02',       // SUBGERENCIA DE MANTENIMIENTO
            '00036' => '13.03',       // SUBGERENCIA DE EQUIPO MECÁNICO

            // 14: Desarrollo Urbano y Rural
            '00010' => '14',          // GERENCIA DE DESARROLLO URBANO Y RURAL
            '00038' => '14.01',       // SUBGERENCIA DE ORDENAMIENTO TERRITORIAL Y TRÁNSITO
            '00066' => '14.01.01',    // UNIDAD DE TRÁNSITO
            '00040' => '14.02',       // SUBGERENCIA DE CATASTRO Y SANEAMIENTO FÍSICO LEGAL
            '00039' => '14.03',       // SUBGERENCIA DE GESTIÓN DE EDIFICACIONES

            // 15: Desarrollo Social
            '00011' => '15',          // GERENCIA DE DESARROLLO SOCIAL
            '00045' => '15.01',       // SUBGERENCIA DE EDUCACIÓN, CULTURA Y DEPORTE
            '00046' => '15.02',       // SUBGERENCIA DE PROGRAMAS SOCIALES Y PARTICIPACIÓN CIUDADANA
            '00054' => '15.02.01',    // UNIDAD LOCAL DE EMPADRONAMIENTO (SISFOH)
            '00055' => '15.02.02',    // PROGRAMA VASO DE LECHE (PVL)
            '00051' => '15.02.03',    // OMAPED
            '00052' => '15.02.04',    // CIAM
            '00053' => '15.02.05',    // DEMUNA

            // 16: Desarrollo Económico Local
            '00014' => '16',          // GERENCIA DE DESARROLLO ECONÓMICO LOCAL
            '00041' => '16.01',       // SUBGERENCIA DE COMPETITIVIDAD EMPRESARIAL, AGRARIA Y TURISMO
            '00042' => '16.02',       // SUBGERENCIA DE COMERCIO, MERCADOS Y POLICÍA MUNICIPAL
            '00074' => '16.02.01',    // ÁREA FUNCIONAL DE MERCADOS Y POLICÍA MUNICIPAL
            '00044' => '16.03',       // SUBGERENCIA DE CONTROL SANITARIO Y CAMAL MUNICIPAL
            '00043' => '16.04',       // SUBGERENCIA DE SEGURIDAD CIUDADANA

            // 17: Gestión Ambiental
            '00012' => '17',          // GERENCIA DE GESTIÓN AMBIENTAL
            '00049' => '17.01',       // SUBGERENCIA DE MEDIO AMBIENTE
            '00048' => '17.02',       // SUBGERENCIA DE SANEAMIENTO BÁSICO Y ÁREA TÉCNICA MUNICIPAL
            '00068' => '17.02.01',    // ÁREA TÉCNICA MUNICIPAL
            '00047' => '17.03',       // SUBGERENCIA DE GESTIÓN DE RESIDUOS SÓLIDOS
        ];

        foreach ($mapeoOficial as $codigoSgd => $codigoAnexo1) {
            DB::table('dependencias')
                ->where('codigo', $codigoSgd)
                ->where('fuente', 'sgd')
                ->update([
                    'codigo_anexo1' => $codigoAnexo1,
                    'es_centro_costo_oficial' => true,
                    'activa' => true,
                ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('dependencias')
            ->where('codigo', '00068')
            ->update([
                'parent_id' => 178,
                'nivel' => 4,
            ]);

        DB::table('dependencias')
            ->where('fuente', 'siga')
            ->whereNotIn('id', [49, 125])
            ->update(['activa' => true]);

        Schema::table('dependencias', function (Blueprint $table) {
            $table->dropIndex(['codigo_anexo1']);
            $table->dropIndex(['es_centro_costo_oficial']);
            $table->dropColumn(['codigo_anexo1', 'es_centro_costo_oficial']);
        });
    }
};
