<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Acervo documentario (Anexo 03, plan §7.3). Distingue documentación
     * digital (recuperable del SGD) de física (registrada manualmente).
     */
    public function up(): void
    {
        Schema::create('acervo_documental', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proceso_transferencia_id')->constrained('procesos_transferencia')->cascadeOnDelete();
            $table->foreignId('dependencia_id')->constrained('dependencias')->cascadeOnDelete();
            $table->foreignId('registrado_por_id')->nullable()->constrained('users')->nullOnDelete();

            $table->string('tipo')->comment('digital | fisico');
            $table->string('serie_documental')->nullable();
            $table->string('periodo')->nullable()->comment('Rango de años/fechas que abarca');
            $table->unsignedInteger('cantidad_unidades')->nullable()->comment('Nº de unidades de conservación');
            $table->string('unidad_conservacion')->nullable()->comment('caja, archivador, legajo, etc.');
            $table->string('ubicacion')->nullable();
            $table->text('descripcion')->nullable();
            $table->text('observaciones')->nullable();

            // Digital normalmente proviene del SGD; físico es manual (plan §7.3).
            $table->string('fuente')->default('manual');
            $table->string('fuente_referencia')->nullable();
            $table->timestamp('extraido_en')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['dependencia_id', 'tipo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('acervo_documental');
    }
};
