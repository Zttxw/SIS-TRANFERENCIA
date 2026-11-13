<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Visto bueno del delegado ETTE sobre lo remitido por una dependencia que
     * tiene asignada (GAP 2 del portal del delegado). Es una constancia de
     * conformidad acotada a su ámbito: NO consolida ni cambia el estado de la
     * entrega (eso corresponde a responsable/ETTS). Cada fila registra quién,
     * cuándo y sobre qué dependencia se emitió, para dejar trazabilidad.
     *
     * Único por (proceso, dependencia, delegado): un delegado da un único visto
     * bueno vigente por dependencia; retirarlo es borrar la fila (soft delete),
     * volver a darlo la reactiva.
     */
    public function up(): void
    {
        Schema::create('vistos_buenos_delegado', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proceso_transferencia_id')->constrained('procesos_transferencia')->cascadeOnDelete();
            $table->foreignId('dependencia_id')->constrained('dependencias')->cascadeOnDelete()
                ->comment('Dependencia asignada sobre la que el delegado da conformidad');
            $table->foreignId('delegado_id')->constrained('users')->cascadeOnDelete()
                ->comment('Delegado ETTE que emite el visto bueno');

            $table->timestamp('otorgado_en');
            $table->text('comentario')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->unique(['proceso_transferencia_id', 'dependencia_id', 'delegado_id'], 'vbd_proceso_dep_delegado_unico');
            $table->index(['dependencia_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vistos_buenos_delegado');
    }
};
