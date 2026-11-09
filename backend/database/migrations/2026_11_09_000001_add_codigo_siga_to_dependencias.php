<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Añade `codigo_siga` a dependencias: el código de centro de costo del SIGA
 * (formato jerárquico, ej. 01.03.07.04) equivalente a esta dependencia del SGD.
 *
 * El SGD y el SIGA usan llaves de código distintas para la misma unidad
 * organizacional (SGD: ID interno "00025"; SIGA: jerárquico "01.03.07.04").
 * Esta columna materializa el empate, resuelto por nombre en
 * MapeoDependenciasSigaSeeder, para que la ingesta patrimonial vincule los
 * bienes a la dependencia maestra (SGD) sin crear duplicados.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dependencias', function (Blueprint $table) {
            $table->string('codigo_siga', 30)->nullable()->after('codigo_sgd');
            $table->index('codigo_siga');
        });
    }

    public function down(): void
    {
        Schema::table('dependencias', function (Blueprint $table) {
            $table->dropIndex(['codigo_siga']);
            $table->dropColumn('codigo_siga');
        });
    }
};
