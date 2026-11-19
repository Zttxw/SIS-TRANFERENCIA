<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Directiva 2026 (D-04, D-10, D-12): coordinadores ETTE.
 *
 * - El rol `coordinador` se unifica en `delegado_ette` (etiqueta "Coordinador
 *   ETTE"); el valor interno se conserva para no romper datos.
 * - La asignación guarda la acreditación (quién y cuándo), la observación de la
 *   carga y el reemplazo (RF-15, RN-12): la designación anterior se **revoca**
 *   (`revocada_en`) en lugar de borrarse, para conservar la constancia.
 * - Las observaciones registran en qué calidad actúa el lado ETTE y, cuando
 *   observa un titular en suplencia del coordinador, el motivo.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('asignaciones_rol', function (Blueprint $table) {
            $table->timestamp('acreditada_en')->nullable()->after('rol');
            $table->foreignId('acreditada_por_id')->nullable()->after('acreditada_en')->constrained('users')->nullOnDelete();
            $table->string('observacion', 500)->nullable()->after('acreditada_por_id');
            $table->foreignId('reemplaza_a_id')->nullable()->after('observacion')->constrained('asignaciones_rol')->nullOnDelete()
                ->comment('Designación del coordinador ETTE al que reemplaza');
            $table->string('motivo_reemplazo', 500)->nullable()->after('reemplaza_a_id');
            $table->timestamp('revocada_en')->nullable()->after('motivo_reemplazo')
                ->comment('Designación sin efecto; se conserva como historial');
            $table->foreignId('revocada_por_id')->nullable()->after('revocada_en')->constrained('users')->nullOnDelete();
            $table->dropUnique('asignaciones_rol_unica');
        });

        // La unicidad rige solo entre asignaciones vigentes: un coordinador puede
        // volver a ser designado en un CC del que fue reemplazado.
        DB::statement('CREATE UNIQUE INDEX asignaciones_rol_unica_vigente ON asignaciones_rol '
            .'(proceso_transferencia_id, user_id, dependencia_id, rol) WHERE revocada_en IS NULL');

        Schema::table('users', function (Blueprint $table) {
            $table->string('celular', 20)->nullable()->after('email');
        });

        Schema::table('observaciones', function (Blueprint $table) {
            $table->string('en_calidad_de', 30)->nullable()->after('autor_id')
                ->comment('coordinador | titular_suplente (lado ETTE)');
            $table->string('motivo_suplencia', 500)->nullable()->after('en_calidad_de');
        });

        $this->unificarCoordinadores();

        DB::table('asignaciones_rol')->where('rol', 'delegado_ette')->whereNull('acreditada_en')
            ->update(['acreditada_en' => DB::raw('created_at')]);
    }

    /**
     * Pasa las asignaciones `coordinador` a `delegado_ette`. Si el usuario ya era
     * delegado de la misma dependencia, la asignación duplicada se elimina.
     */
    private function unificarCoordinadores(): void
    {
        foreach (DB::table('asignaciones_rol')->where('rol', 'coordinador')->get() as $asignacion) {
            $existe = DB::table('asignaciones_rol')
                ->where('proceso_transferencia_id', $asignacion->proceso_transferencia_id)
                ->where('user_id', $asignacion->user_id)
                ->where('dependencia_id', $asignacion->dependencia_id)
                ->where('rol', 'delegado_ette')
                ->exists();

            $existe
                ? DB::table('asignaciones_rol')->where('id', $asignacion->id)->delete()
                : DB::table('asignaciones_rol')->where('id', $asignacion->id)->update(['rol' => 'delegado_ette']);
        }

        DB::table('rol_permiso')->where('rol', 'coordinador')->delete();
    }

    /**
     * Las asignaciones unificadas no vuelven a `coordinador`: no se distingue su
     * origen. Las revocadas se eliminan para no reactivarlas.
     */
    public function down(): void
    {
        DB::table('asignaciones_rol')->whereNotNull('revocada_en')->delete();

        Schema::table('observaciones', function (Blueprint $table) {
            $table->dropColumn(['en_calidad_de', 'motivo_suplencia']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('celular');
        });

        DB::statement('DROP INDEX asignaciones_rol_unica_vigente');

        Schema::table('asignaciones_rol', function (Blueprint $table) {
            $table->unique(['proceso_transferencia_id', 'user_id', 'dependencia_id', 'rol'], 'asignaciones_rol_unica');
            $table->dropConstrainedForeignId('revocada_por_id');
            $table->dropConstrainedForeignId('reemplaza_a_id');
            $table->dropConstrainedForeignId('acreditada_por_id');
            $table->dropColumn(['acreditada_en', 'observacion', 'motivo_reemplazo', 'revocada_en']);
        });
    }
};
