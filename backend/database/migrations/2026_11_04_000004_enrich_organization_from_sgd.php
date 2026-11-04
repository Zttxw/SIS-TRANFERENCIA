<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Enriquecimiento de la ingesta organizacional con datos ya disponibles en el
     * SGD (verificados en vivo, oct–nov 2026):
     * - servidores.email  ← RHTM_PER_EMPLEADOS.CEMP_EMAIL (habilita activación/notificación).
     * - dependencias.tipo_encargatura   ← RHTM_DEPENDENCIA.CO_TIPO_ENCARGATURA (1/2/3).
     * - dependencias.codigo_titular_sgd ← RHTM_DEPENDENCIA.CO_EMP_TITULAR (titular vs encargado).
     */
    public function up(): void
    {
        Schema::table('servidores', function (Blueprint $table) {
            $table->string('email')->nullable()->after('apellidos')
                ->comment('CEMP_EMAIL: correo institucional declarado en el SGD');
        });

        Schema::table('dependencias', function (Blueprint $table) {
            $table->string('tipo_encargatura', 1)->nullable()->after('codigo_encargado_sgd')
                ->comment('CO_TIPO_ENCARGATURA: 1 titular, 2/3 encargo (según SGD)');
            $table->string('codigo_titular_sgd')->nullable()->after('tipo_encargatura')
                ->comment('CO_EMP_TITULAR: código SGD del titular de la dependencia');
        });
    }

    public function down(): void
    {
        Schema::table('dependencias', function (Blueprint $table) {
            $table->dropColumn(['tipo_encargatura', 'codigo_titular_sgd']);
        });

        Schema::table('servidores', function (Blueprint $table) {
            $table->dropColumn('email');
        });
    }
};
