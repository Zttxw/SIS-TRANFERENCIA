<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Hora exacta de corte del plazo (D-03). `fecha_vencimiento` fija el día;
     * `hora_vencimiento` fija el instante dentro de ese día. El vencimiento se
     * evalúa en zona America/Lima (CronogramaActividad::instanteVencimiento):
     * con hora, vence a esa hora de Lima; sin hora, al terminar el día de Lima.
     */
    public function up(): void
    {
        Schema::table('cronograma_actividades', function (Blueprint $table) {
            $table->time('hora_vencimiento')->nullable()->after('fecha_vencimiento')
                ->comment('Hora de corte del plazo en America/Lima; null = fin del día de Lima');
        });
    }

    public function down(): void
    {
        Schema::table('cronograma_actividades', function (Blueprint $table) {
            $table->dropColumn('hora_vencimiento');
        });
    }
};
