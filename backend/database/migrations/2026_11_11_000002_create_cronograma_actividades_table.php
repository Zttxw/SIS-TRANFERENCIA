<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Cronograma del proceso de transferencia (RF-007, C-03 confirmado):
     * etapas/actividades con fecha de inicio y vencimiento. El vencimiento
     * bloquea entregas (C2). Administrado por administrador y ETTS (C3).
     *
     * `operacion` indica qué operación bloquea el vencimiento de la actividad.
     * Por ahora se usa la confirmada ('remision'); el resto de operaciones
     * (firma, visto bueno, consolidación) queda pendiente de D-03 y se admite
     * como valor sin forzarlo.
     *
     * `dependencia_id` nullable: null = alcance general del proceso. Fechas por
     * dependencia frente a generales siguen en D-03; la columna lo permite sin
     * decidirlo.
     */
    public function up(): void
    {
        Schema::create('cronograma_actividades', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proceso_transferencia_id')->constrained('procesos_transferencia')->cascadeOnDelete();
            $table->foreignId('dependencia_id')->nullable()->constrained('dependencias')->nullOnDelete();

            $table->string('etapa')->nullable()->comment('Agrupador de etapa del proceso');
            $table->string('nombre');
            $table->text('descripcion')->nullable();

            $table->date('fecha_inicio')->nullable();
            $table->date('fecha_vencimiento')->nullable();

            $table->string('estado')->default('pendiente')->comment('pendiente, en_curso, completada (EstadoActividadCronograma)');
            $table->string('operacion')->default('remision')->comment('Operación que bloquea su vencimiento');

            $table->unsignedInteger('orden')->default(0);

            $table->timestamps();
            $table->softDeletes();

            $table->index(['proceso_transferencia_id', 'operacion']);
            $table->index(['proceso_transferencia_id', 'dependencia_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cronograma_actividades');
    }
};
