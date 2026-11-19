<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Acta 07 conforme al formato de la directiva (fase 8, RF-62, RF-66):
     * lugar y hora de la apertura, "otros documentos" entregados y, en
     * `anexos_entregados`, la condición de cada ítem de la sección III
     * (entregado, no_entregado o no_aplica) con su observación y si la fijó
     * una persona (`manual`) o sale de la presencia de registros.
     */
    public function up(): void
    {
        Schema::table('actas_transferencia', function (Blueprint $table) {
            $table->string('lugar', 200)->nullable()->after('fecha_acta');
            $table->time('hora')->nullable()->after('lugar');
            $table->text('otros_documentos')->nullable()->after('anexos_entregados');
        });

        DB::table('actas_transferencia')->whereNotNull('anexos_entregados')->orderBy('id')
            ->each(function (object $acta): void {
                $anterior = json_decode((string) $acta->anexos_entregados, true) ?: [];
                $condiciones = [];
                foreach (['anexo_02', 'anexo_03', 'anexo_04', 'anexo_05', 'anexo_06'] as $clave) {
                    $condiciones[$clave] = [
                        'condicion' => ($anterior[$clave] ?? false) === true ? 'entregado' : 'no_entregado',
                        'observacion' => null,
                        'manual' => false,
                    ];
                }
                $condiciones['otros'] = ['condicion' => 'no_aplica', 'observacion' => null, 'manual' => false];
                DB::table('actas_transferencia')->where('id', $acta->id)
                    ->update(['anexos_entregados' => json_encode($condiciones)]);
            });
    }

    public function down(): void
    {
        DB::table('actas_transferencia')->whereNotNull('anexos_entregados')->orderBy('id')
            ->each(function (object $acta): void {
                $condiciones = json_decode((string) $acta->anexos_entregados, true) ?: [];
                $anterior = ['anexo_07' => true];
                foreach (['anexo_02', 'anexo_03', 'anexo_04', 'anexo_05', 'anexo_06'] as $clave) {
                    $anterior[$clave] = ($condiciones[$clave]['condicion'] ?? null) === 'entregado';
                }
                DB::table('actas_transferencia')->where('id', $acta->id)
                    ->update(['anexos_entregados' => json_encode($anterior)]);
            });

        Schema::table('actas_transferencia', function (Blueprint $table) {
            $table->dropColumn(['lugar', 'hora', 'otros_documentos']);
        });
    }
};
