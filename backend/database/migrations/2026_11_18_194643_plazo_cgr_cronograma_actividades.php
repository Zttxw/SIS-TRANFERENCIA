<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Plazo CGR de referencia (RF-21, RN-03): con `fecha_cgr`, el vencimiento
     * interno se calcula `dias_habiles_antes` días hábiles antes (por defecto 2)
     * y se guarda en `fecha_vencimiento`. Sin ella, la fecha sigue siendo manual.
     *
     * `operacion` pasa a ser la etapa que gobierna la actividad
     * (OperacionCronograma): ninguna, verificacion, acta o remision.
     */
    public function up(): void
    {
        Schema::table('cronograma_actividades', function (Blueprint $table) {
            $table->date('fecha_cgr')->nullable()->after('fecha_inicio')
                ->comment('Plazo CGR de referencia; si existe, fecha_vencimiento se calcula en días hábiles');
            $table->unsignedTinyInteger('dias_habiles_antes')->default(2)->after('fecha_cgr');
        });

        DB::table('cronograma_actividades')->whereNull('operacion')->update(['operacion' => 'remision']);
    }

    public function down(): void
    {
        DB::table('cronograma_actividades')->whereIn('operacion', ['ninguna', 'verificacion', 'acta'])
            ->update(['operacion' => 'remision']);

        Schema::table('cronograma_actividades', function (Blueprint $table) {
            $table->dropColumn(['fecha_cgr', 'dias_habiles_antes']);
        });
    }
};
