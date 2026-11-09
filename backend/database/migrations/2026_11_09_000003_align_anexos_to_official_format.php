<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Fase 0 — Completa las columnas faltantes de los anexos 03, 04 y 05 para que
 * cada formulario/modelo corresponda 1:1 con la plantilla oficial de la
 * directiva. Cambios aditivos y no destructivos (no se tocan datos existentes).
 *
 *   Anexo 03 (acervo): año agrupador + rango desde/hasta (el formato separa
 *     "Desde Año" y "Hasta Año"; `periodo` se conserva por compatibilidad).
 *   Anexo 04 (patrimonio): color, dimensión, características, código anterior,
 *     ubicación (columnas de la plantilla que faltaban).
 *   Anexo 05 (personal): observaciones.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('acervo_documental', function (Blueprint $table) {
            $table->unsignedSmallInteger('anio')->nullable()->after('serie_documental')
                ->comment('Año agrupador del formato (2023–2026)');
            $table->unsignedSmallInteger('desde_anio')->nullable()->after('anio')
                ->comment('Plantilla Anexo 03: "Desde Año"');
            $table->unsignedSmallInteger('hasta_anio')->nullable()->after('desde_anio')
                ->comment('Plantilla Anexo 03: "Hasta Año"');
            $table->index(['dependencia_id', 'anio']);
        });

        Schema::table('bienes_patrimoniales', function (Blueprint $table) {
            $table->string('color')->nullable()->after('modelo');
            $table->string('dimension')->nullable()->after('serie');
            $table->text('caracteristicas')->nullable()->after('dimension')
                ->comment('Características del bien (plantilla Anexo 04)');
            $table->string('codigo_patrimonial_anterior')->nullable()->after('caracteristicas');
            $table->string('ubicacion')->nullable()->after('codigo_patrimonial_anterior')
                ->comment('Ubicación del bien (plantilla Anexo 04)');
        });

        Schema::table('personal', function (Blueprint $table) {
            $table->text('observaciones')->nullable()->after('situacion_laboral')
                ->comment('Observaciones (plantilla Anexo 05)');
        });
    }

    public function down(): void
    {
        Schema::table('acervo_documental', function (Blueprint $table) {
            $table->dropIndex(['dependencia_id', 'anio']);
            $table->dropColumn(['anio', 'desde_anio', 'hasta_anio']);
        });

        Schema::table('bienes_patrimoniales', function (Blueprint $table) {
            $table->dropColumn([
                'color', 'dimension', 'caracteristicas',
                'codigo_patrimonial_anterior', 'ubicacion',
            ]);
        });

        Schema::table('personal', function (Blueprint $table) {
            $table->dropColumn('observaciones');
        });
    }
};
