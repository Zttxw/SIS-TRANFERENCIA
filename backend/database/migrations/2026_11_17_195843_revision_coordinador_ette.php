<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Directiva 2026 (D-07, D-08): aceptación del coordinador ETTE antes de firmar.
 *
 * - `entregas`: la entrega pasa por presentar → aceptar (verificar) → firmar →
 *   remitir. No hay subsanación: se registran la presentación y la aceptación del
 *   lado ETTE (constancia RF-54 y lo revisado/no revisado RF-56, con su calidad).
 * - Estados retirados: `consolidada`, `cerrada` y el antiguo `en_revision`
 *   ("remitida y en evaluación del padre") ya fueron remitidas y quedan como
 *   `remitida`; `observada` (devuelta para subsanar) queda como `en_revision`.
 *   `receptor_id`, `revisada_en` y `consolidada_en` se conservan como historial;
 *   `version_acta_correccion` (re-firma tras subsanar) se elimina.
 * - `observaciones`: constancia del coordinador. Guardan su CC y su anexo; pueden
 *   referirse al anexo completo (sin fila). Sus estados se reducen a
 *   `registrada` y `retirada`; la respuesta de subsanación queda como historial.
 * - `actas_transferencia.declara` se retira: sin consolidación del padre, el acta
 *   siempre declara la suscripción del centro de costo.
 */
return new class extends Migration
{
    /** @var array<string, string> clave de anexo → modelo observable */
    private const ANEXOS = [
        'gestion' => 'App\\Modules\\Gestion\\Models\\InformeGestion',
        'acervo' => 'App\\Modules\\Acervo\\Models\\AcervoDocumental',
        'patrimonio' => 'App\\Modules\\Patrimonio\\Models\\BienPatrimonial',
        'personal' => 'App\\Modules\\Personal\\Models\\Personal',
        'nopatrimonial' => 'App\\Modules\\NoPatrimonial\\Models\\BienNoPatrimonial',
        'documento' => 'App\\Modules\\Documentos\\Models\\DocumentoPendiente',
    ];

    /** @var array<string, string> clave de anexo → tabla del observable */
    private const TABLAS = [
        'gestion' => 'informes_gestion',
        'acervo' => 'acervo_documental',
        'patrimonio' => 'bienes_patrimoniales',
        'personal' => 'personal',
        'nopatrimonial' => 'bienes_no_patrimoniales',
        'documento' => 'documentos_pendientes',
    ];

    public function up(): void
    {
        Schema::table('entregas', function (Blueprint $table) {
            $table->timestamp('presentada_en')->nullable()->after('estado');
            $table->foreignId('presentada_por_id')->nullable()->after('presentada_en')->constrained('users')->nullOnDelete();
            $table->timestamp('verificada_en')->nullable()->after('presentada_por_id');
            $table->foreignId('verificada_por_id')->nullable()->after('verificada_en')->constrained('users')->nullOnDelete();
            $table->string('verificada_en_calidad_de', 30)->nullable()->after('verificada_por_id')
                ->comment('coordinador | titular_suplente (lado ETTE)');
            $table->string('motivo_suplencia_verificacion', 500)->nullable()->after('verificada_en_calidad_de');
            $table->text('resultado_verificacion')->nullable()->after('motivo_suplencia_verificacion')
                ->comment('Qué se verificó y qué no (RF-54, RF-56)');
        });

        DB::table('entregas')->whereIn('estado', ['consolidada', 'cerrada', 'en_revision'])
            ->update(['estado' => 'remitida']);
        DB::table('entregas')->where('estado', 'observada')->update(['estado' => 'en_revision']);

        Schema::table('entregas', function (Blueprint $table) {
            $table->dropColumn('version_acta_correccion');
        });

        Schema::table('observaciones', function (Blueprint $table) {
            $table->foreignId('dependencia_id')->nullable()->after('proceso_transferencia_id')
                ->constrained('dependencias')->cascadeOnDelete();
            $table->string('anexo', 20)->nullable()->after('dependencia_id')
                ->comment('gestion, acervo, patrimonio, personal, nopatrimonial, documento');
            $table->string('observable_type')->nullable()->change();
            $table->unsignedBigInteger('observable_id')->nullable()->change();
            $table->string('estado')->default('registrada')->change();
            $table->index(['dependencia_id', 'estado']);
        });

        foreach (self::ANEXOS as $clave => $modelo) {
            $tabla = self::TABLAS[$clave];
            DB::table('observaciones')->where('observable_type', $modelo)->update([
                'anexo' => $clave,
                'dependencia_id' => DB::raw("(SELECT {$tabla}.dependencia_id FROM {$tabla} WHERE {$tabla}.id = observaciones.observable_id)"),
            ]);
        }

        DB::table('observaciones')->whereIn('estado', ['abierta', 'en_subsanacion', 'subsanada'])
            ->update(['estado' => 'registrada']);
        DB::table('observaciones')->where('estado', 'desestimada')->update(['estado' => 'retirada']);

        Schema::table('actas_transferencia', function (Blueprint $table) {
            $table->dropColumn('declara');
        });
    }

    public function down(): void
    {
        Schema::table('actas_transferencia', function (Blueprint $table) {
            $table->string('declara')->default('suscripcion_hija')->after('estado');
        });

        Schema::table('observaciones', function (Blueprint $table) {
            $table->dropIndex(['dependencia_id', 'estado']);
            $table->dropConstrainedForeignId('dependencia_id');
            $table->dropColumn('anexo');
        });

        Schema::table('entregas', function (Blueprint $table) {
            $table->dropConstrainedForeignId('presentada_por_id');
            $table->dropConstrainedForeignId('verificada_por_id');
            $table->unsignedInteger('version_acta_correccion')->nullable();
            $table->dropColumn([
                'presentada_en', 'verificada_en', 'verificada_en_calidad_de',
                'motivo_suplencia_verificacion', 'resultado_verificacion',
            ]);
        });
    }
};
