<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Expediente digital por centro de costo (plan §7.12). Agrupa anexos,
     * evidencias, observaciones y actas. Su cierre impide modificaciones
     * directas (RN-13).
     */
    public function up(): void
    {
        Schema::create('expedientes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proceso_transferencia_id')->constrained('procesos_transferencia')->cascadeOnDelete();
            $table->foreignId('dependencia_id')->constrained('dependencias')->cascadeOnDelete();

            $table->string('codigo')->comment('Código único del expediente');
            $table->string('estado')->default('abierto')->comment('abierto, consolidado, cerrado');
            $table->timestamp('cerrado_en')->nullable();
            $table->foreignId('cerrado_por_id')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            $table->unique(['proceso_transferencia_id', 'dependencia_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expedientes');
    }
};
