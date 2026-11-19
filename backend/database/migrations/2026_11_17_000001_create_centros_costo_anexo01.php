<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Directiva 2026 (D-01, D-03, D-11): los centros de costo del Anexo 01
 * (CEPLAN) pasan a ser filas de `dependencias` y las dependencias del SGD y del
 * SIGA se vinculan a ellos mediante una tabla de equivalencias definida a mano
 * por nombre.
 *
 * - `es_centro_costo` separa los 64 CC (flujo de transferencia) de las
 *   dependencias de origen del SGD (trazabilidad e ingesta).
 * - El código CEPLAN ("07.05") puede coincidir con un código del SGD ("01"), por
 *   eso la unicidad de `codigo` pasa a ser por tipo de fila.
 * - Se retira el rol de responsable de equipo de trabajo (D-03).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dependencias', function (Blueprint $table) {
            $table->boolean('es_centro_costo')->default(false)->after('activa')
                ->comment('Centro de costo del Anexo 01 (CEPLAN); false = dependencia de origen SGD/SIGA');
            $table->string('codigo_ceplan', 20)->nullable()->after('codigo_siga')
                ->comment('Código del Anexo 01 registrado en CEPLAN (solo centros de costo)');
        });

        Schema::table('dependencias', function (Blueprint $table) {
            $table->dropUnique(['proceso_transferencia_id', 'codigo']);
            $table->unique(['proceso_transferencia_id', 'es_centro_costo', 'codigo'], 'dependencias_proceso_tipo_codigo_unique');
            $table->unique(['proceso_transferencia_id', 'codigo_ceplan'], 'dependencias_proceso_codigo_ceplan_unique');
        });

        Schema::create('equivalencias_centro_costo', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proceso_transferencia_id')->constrained('procesos_transferencia')->cascadeOnDelete();
            $table->string('origen', 10)->comment('sgd | siga');
            $table->string('codigo_origen', 30)->comment('Identificador de la unidad en su propio sistema (no vincula sistemas)');
            $table->string('nombre_origen')->nullable();
            $table->foreignId('dependencia_origen_id')->nullable()->constrained('dependencias')->nullOnDelete()
                ->comment('Fila de la dependencia del SGD, cuando existe');
            $table->foreignId('centro_costo_id')->nullable()->constrained('dependencias')->nullOnDelete()
                ->comment('Centro de costo del Anexo 01; NULL = sin asignar');
            $table->boolean('es_principal')->default(false)
                ->comment('Dependencia del SGD que da el responsable (encargado) del CC');
            $table->foreignId('confirmada_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('confirmada_en')->nullable();
            $table->timestamps();

            $table->unique(['proceso_transferencia_id', 'origen', 'codigo_origen'], 'equivalencias_cc_origen_unique');
            $table->index('centro_costo_id');
        });

        DB::table('asignaciones_rol')->where('rol', 'responsable_equipo')->delete();
        DB::table('rol_permiso')->where('rol', 'responsable_equipo')->delete();
    }

    /**
     * Solo es reversible antes de cargar el catálogo: borrar los CC arrastraría
     * en cascada los anexos ya reasignados a ellos. Con CC cargados, se restaura
     * el respaldo previo a la reasignación.
     */
    public function down(): void
    {
        if (DB::table('dependencias')->where('es_centro_costo', true)->exists()) {
            throw new RuntimeException('Hay centros de costo del Anexo 01 cargados; restaure el respaldo previo en lugar de revertir esta migración.');
        }

        Schema::dropIfExists('equivalencias_centro_costo');

        Schema::table('dependencias', function (Blueprint $table) {
            $table->dropUnique('dependencias_proceso_codigo_ceplan_unique');
            $table->dropUnique('dependencias_proceso_tipo_codigo_unique');
            $table->unique(['proceso_transferencia_id', 'codigo']);
        });

        Schema::table('dependencias', function (Blueprint $table) {
            $table->dropColumn(['es_centro_costo', 'codigo_ceplan']);
        });
    }
};
