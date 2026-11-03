<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Verificación física de un bien por el servidor (plan §4.2, §7.4).
     * RN-04: cada bien permite confirmar posesión física.
     * RN-05: la ausencia declarada exige observación (validado en capa de negocio).
     */
    public function up(): void
    {
        Schema::create('verificaciones_bien', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bien_patrimonial_id')->constrained('bienes_patrimoniales')->cascadeOnDelete();
            $table->foreignId('verificado_por_id')->nullable()->constrained('users')->nullOnDelete();

            $table->string('estado')->default('pendiente')->comment('Enum App\\Support\\Enums\\EstadoVerificacionBien');
            $table->string('estado_conservacion')->nullable()->comment('Enum App\\Support\\Enums\\EstadoConservacion');
            $table->text('observacion')->nullable()->comment('Obligatoria cuando el servidor declara no tener el bien (RN-05)');
            $table->timestamp('verificado_en')->nullable();

            $table->timestamps();

            // Una verificación vigente por bien.
            $table->unique('bien_patrimonial_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('verificaciones_bien');
    }
};
