<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Observaciones sobre cualquier anexo o elemento (polimórfica) y su
     * subsanación (plan §7.9, RN-10). El historial de cambios se conserva en
     * la bitácora de auditoría.
     */
    public function up(): void
    {
        Schema::create('observaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proceso_transferencia_id')->constrained('procesos_transferencia')->cascadeOnDelete();
            $table->morphs('observable');

            $table->foreignId('autor_id')->nullable()->constrained('users')->nullOnDelete()
                ->comment('Usuario que formula la observación');
            $table->foreignId('responsable_id')->nullable()->constrained('users')->nullOnDelete()
                ->comment('Usuario responsable de subsanar');

            $table->text('descripcion');
            $table->string('estado')->default('abierta')->comment('Enum App\\Support\\Enums\\EstadoObservacion');
            $table->text('respuesta_subsanacion')->nullable();
            $table->timestamp('subsanada_en')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index('estado');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('observaciones');
    }
};
