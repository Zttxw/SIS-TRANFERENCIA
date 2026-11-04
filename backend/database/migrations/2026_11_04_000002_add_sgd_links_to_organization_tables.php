<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Enlaces con el SGD necesarios para la ingesta directa (plan §4.1, RN-01):
     * - cada servidor conserva su código SGD (CEMP_CODEMP) para re-ingesta
     *   idempotente y para conciliar encargados.
     * - cada dependencia conserva el código SGD del encargado (CO_EMPLEADO) y,
     *   una vez cargados los servidores, se resuelve el FK encargado_servidor_id.
     */
    public function up(): void
    {
        Schema::table('servidores', function (Blueprint $table) {
            $table->string('codigo_sgd')->nullable()->after('user_id')
                ->comment('CEMP_CODEMP: código del empleado en el SGD');
            $table->index(['proceso_transferencia_id', 'codigo_sgd']);
        });

        Schema::table('dependencias', function (Blueprint $table) {
            $table->string('codigo_encargado_sgd')->nullable()->after('activa')
                ->comment('CO_EMPLEADO: código SGD del encargado de la dependencia');
            $table->foreignId('encargado_servidor_id')->nullable()->after('codigo_encargado_sgd')
                ->constrained('servidores')->nullOnDelete()
                ->comment('Servidor encargado de la dependencia (RN-01)');
        });
    }

    public function down(): void
    {
        Schema::table('dependencias', function (Blueprint $table) {
            $table->dropConstrainedForeignId('encargado_servidor_id');
            $table->dropColumn('codigo_encargado_sgd');
        });

        Schema::table('servidores', function (Blueprint $table) {
            $table->dropIndex(['proceso_transferencia_id', 'codigo_sgd']);
            $table->dropColumn('codigo_sgd');
        });
    }
};
