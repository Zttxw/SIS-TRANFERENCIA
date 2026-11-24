<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * El Anexo 04 solo conserva código patrimonial, denominación, estado, marca,
 * modelo y serie (más la observación de la verificación). Se retiran las
 * columnas que el servidor completaba al verificar y que ya no forman parte
 * del formato. El `down` restaura la estructura, no los datos.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bienes_patrimoniales', function (Blueprint $table) {
            $table->dropColumn([
                'color', 'dimension', 'caracteristicas',
                'codigo_patrimonial_anterior', 'ubicacion',
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('bienes_patrimoniales', function (Blueprint $table) {
            $table->string('color')->nullable()->after('modelo');
            $table->string('dimension')->nullable()->after('serie');
            $table->text('caracteristicas')->nullable()->after('dimension');
            $table->string('codigo_patrimonial_anterior')->nullable()->after('caracteristicas');
            $table->string('ubicacion')->nullable()->after('codigo_patrimonial_anterior');
        });
    }
};
