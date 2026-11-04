<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Catálogos del SGD capturados localmente (solo lectura, RN-03). Permiten
     * normalizar tipos y estados en los módulos documentales (Anexo 03, §7.7)
     * sin reconsultar el SGD en cada visita.
     *
     * Fuentes verificadas en vivo:
     * - SI_MAE_TIPO_DOC: 82 tipos documentales (CDOC_TIPDOC, CDOC_DESDOC, CDOC_INDBAJ).
     * - TDTR_ESTADOS: catálogo multidominio (CO_EST, DE_TAB, DE_EST). Se capturan
     *   los dominios documentales TDTV_REMITOS (emisión) y TDTV_DESTINOS (recepción).
     */
    public function up(): void
    {
        Schema::create('tipos_documentales_sgd', function (Blueprint $table) {
            $table->id();
            $table->string('codigo')->comment('CDOC_TIPDOC');
            $table->string('descripcion')->nullable()->comment('CDOC_DESDOC');
            $table->boolean('activo')->default(true)->comment('CDOC_INDBAJ = 0');
            $table->timestamp('extraido_en')->nullable();
            $table->timestamps();

            $table->unique('codigo');
        });

        Schema::create('estados_sgd', function (Blueprint $table) {
            $table->id();
            $table->string('dominio')->comment('DE_TAB: TDTV_REMITOS | TDTV_DESTINOS');
            $table->string('codigo', 2)->comment('CO_EST');
            $table->string('descripcion')->comment('DE_EST');
            $table->timestamp('extraido_en')->nullable();
            $table->timestamps();

            $table->unique(['dominio', 'codigo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('estados_sgd');
        Schema::dropIfExists('tipos_documentales_sgd');
    }
};
