<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Directiva 2026 (D-04, D-05, D-06): firma obligatoria de ambos lados.
 *
 * - `firma_sesiones` y `firmas_anexo`: el carácter obligatoria/opcional se
 *   reemplaza por el `lado` (entidad o ette). La firma del lado ETTE guarda en
 *   qué calidad se hizo (coordinador o titular suplente) y, en suplencia, el
 *   motivo. Las firmas obligatorias pasan a `entidad` y las opcionales (delegado)
 *   a `ette`, en calidad de coordinador.
 * - La constancia de ausencia ETTE se retira (D-05): sus filas (`estado =
 *   ausente`) se archivan con borrado lógico, de modo que no cuentan como firma.
 * - `procesos_transferencia.exige_firma_acta` se elimina: la firma de ambos
 *   lados es siempre obligatoria para remitir.
 * - `entregas`: nuevo estado `acta_suscrita` (sin cambio de columna).
 */
return new class extends Migration
{
    private const TABLAS = ['firma_sesiones', 'firmas_anexo'];

    public function up(): void
    {
        foreach (self::TABLAS as $tabla) {
            Schema::table($tabla, function (Blueprint $table) {
                $table->string('lado', 10)->nullable()->comment('entidad | ette (LadoFirma)');
                $table->string('en_calidad_de', 20)->nullable()->comment('Lado ETTE: coordinador | titular_suplente');
                $table->string('motivo_suplencia', 500)->nullable();
            });

            DB::table($tabla)->where('caracter', 'opcional')
                ->update(['lado' => 'ette', 'en_calidad_de' => 'coordinador']);
            DB::table($tabla)->where(fn ($q) => $q->where('caracter', '!=', 'opcional')->orWhereNull('caracter'))
                ->update(['lado' => 'entidad']);

            Schema::table($tabla, fn (Blueprint $table) => $table->dropColumn('caracter'));
        }

        DB::table('firmas_anexo')->where('estado', 'ausente')->whereNull('deleted_at')
            ->update(['deleted_at' => now(), 'estado' => 'cancelada']);

        Schema::table('procesos_transferencia', fn (Blueprint $table) => $table->dropColumn('exige_firma_acta'));
    }

    public function down(): void
    {
        Schema::table('procesos_transferencia', fn (Blueprint $table) => $table->boolean('exige_firma_acta')->default(false));

        foreach (self::TABLAS as $tabla) {
            Schema::table($tabla, fn (Blueprint $table) => $table->string('caracter', 20)->nullable());

            DB::table($tabla)->where('lado', 'ette')->update(['caracter' => 'opcional']);
            DB::table($tabla)->where('lado', '!=', 'ette')->update(['caracter' => 'obligatoria']);

            Schema::table($tabla, fn (Blueprint $table) => $table->dropColumn(['lado', 'en_calidad_de', 'motivo_suplencia']));
        }

        DB::table('entregas')->where('estado', 'acta_suscrita')->update(['estado' => 'verificada']);
    }
};
