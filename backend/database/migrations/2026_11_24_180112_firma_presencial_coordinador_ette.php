<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Firma presencial del coordinador ETTE (decisión del 2026-11-24).
 *
 * El coordinador ya no acepta la entrega desde su portal: revisa y firma en la
 * sesión del responsable del CC, con su propio certificado. Firmar es aprobar.
 *
 * - `entregas`: se retira la aceptación (`verificada_*`, `resultado_verificacion`)
 *   y el estado `verificada` pasa a `en_revision`. Se agrega la designación del
 *   titular ETTE que suple al coordinador (`titular_suplente_id` y motivo); sin
 *   designación, actúa el coordinador vigente.
 * - `firma_sesiones.operador_id`: quien operaba la sesión (el responsable del
 *   CC) cuando el firmante (`usuario_id`) es el coordinador o el titular.
 * - `observaciones.registrada_por_id`: quien la registró a nombre del lado ETTE.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('entregas', function (Blueprint $table) {
            $table->foreignId('titular_suplente_id')->nullable()->after('presentada_por_id')
                ->constrained('users')->nullOnDelete();
            $table->string('motivo_suplencia_ette', 500)->nullable()->after('titular_suplente_id');
        });

        DB::table('entregas')->where('verificada_en_calidad_de', 'titular_suplente')->update([
            'titular_suplente_id' => DB::raw('verificada_por_id'),
            'motivo_suplencia_ette' => DB::raw('motivo_suplencia_verificacion'),
        ]);
        DB::table('entregas')->where('estado', 'verificada')->update(['estado' => 'en_revision']);

        Schema::table('entregas', function (Blueprint $table) {
            $table->dropConstrainedForeignId('verificada_por_id');
            $table->dropColumn(['verificada_en', 'verificada_en_calidad_de', 'motivo_suplencia_verificacion', 'resultado_verificacion']);
        });

        Schema::table('firma_sesiones', function (Blueprint $table) {
            $table->foreignId('operador_id')->nullable()->after('usuario_id')->constrained('users')->nullOnDelete();
        });
        DB::table('firma_sesiones')->update(['operador_id' => DB::raw('usuario_id')]);

        Schema::table('observaciones', function (Blueprint $table) {
            $table->foreignId('registrada_por_id')->nullable()->after('autor_id')->constrained('users')->nullOnDelete();
        });
        DB::table('observaciones')->update(['registrada_por_id' => DB::raw('autor_id')]);
    }

    public function down(): void
    {
        Schema::table('observaciones', function (Blueprint $table) {
            $table->dropConstrainedForeignId('registrada_por_id');
        });
        Schema::table('firma_sesiones', function (Blueprint $table) {
            $table->dropConstrainedForeignId('operador_id');
        });
        Schema::table('entregas', function (Blueprint $table) {
            $table->timestamp('verificada_en')->nullable()->after('presentada_por_id');
            $table->foreignId('verificada_por_id')->nullable()->after('verificada_en')->constrained('users')->nullOnDelete();
            $table->string('verificada_en_calidad_de', 30)->nullable()->after('verificada_por_id');
            $table->string('motivo_suplencia_verificacion', 500)->nullable()->after('verificada_en_calidad_de');
            $table->text('resultado_verificacion')->nullable()->after('motivo_suplencia_verificacion');
            $table->dropConstrainedForeignId('titular_suplente_id');
            $table->dropColumn('motivo_suplencia_ette');
        });
    }
};
