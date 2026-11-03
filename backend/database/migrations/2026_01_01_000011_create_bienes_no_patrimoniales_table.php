<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Bienes no patrimonializados, registrados manualmente (Anexo 06, plan §7.6).
     */
    public function up(): void
    {
        Schema::create('bienes_no_patrimoniales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proceso_transferencia_id')->constrained('procesos_transferencia')->cascadeOnDelete();
            $table->foreignId('dependencia_id')->constrained('dependencias')->cascadeOnDelete();
            $table->foreignId('servidor_id')->nullable()->constrained('servidores')->nullOnDelete();
            $table->foreignId('registrado_por_id')->nullable()->constrained('users')->nullOnDelete();

            $table->string('denominacion');
            $table->text('descripcion')->nullable();
            $table->decimal('cantidad', 12, 2)->default(1);
            $table->string('unidad_medida')->nullable();
            $table->string('estado_conservacion')->nullable()->comment('Enum App\\Support\\Enums\\EstadoConservacion');
            $table->string('ubicacion')->nullable();
            $table->text('observaciones')->nullable();

            $table->string('fuente')->default('manual');

            $table->timestamps();
            $table->softDeletes();

            $table->index('dependencia_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bienes_no_patrimoniales');
    }
};
