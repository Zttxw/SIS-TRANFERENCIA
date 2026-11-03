<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Documentos pendientes de atención (plan §7.7). Recuperables del SGD o
     * complementados manualmente; se diferencia el origen (RN-03).
     */
    public function up(): void
    {
        Schema::create('documentos_pendientes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proceso_transferencia_id')->constrained('procesos_transferencia')->cascadeOnDelete();
            $table->foreignId('dependencia_id')->constrained('dependencias')->cascadeOnDelete();
            $table->foreignId('servidor_responsable_id')->nullable()->constrained('servidores')->nullOnDelete();

            $table->string('numero_documento')->nullable();
            $table->string('tipo_documento')->nullable();
            $table->string('asunto');
            $table->date('fecha_documento')->nullable();
            $table->string('estado_atencion')->nullable()->comment('Estado/antigüedad del documento según SGD');
            $table->text('accion_pendiente')->nullable();
            $table->text('observaciones')->nullable();

            $table->string('fuente')->default('sgd');
            $table->string('fuente_referencia')->nullable();
            $table->timestamp('extraido_en')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['dependencia_id', 'estado_atencion']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documentos_pendientes');
    }
};
