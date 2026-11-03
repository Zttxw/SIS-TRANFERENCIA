<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Bienes patrimoniales importados del SIGA (Anexo 04, plan §7.4). Los datos
     * de origen no se modifican por declaraciones de usuarios (RN-06); la
     * verificación se registra aparte en `verificaciones_bien`.
     */
    public function up(): void
    {
        Schema::create('bienes_patrimoniales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proceso_transferencia_id')->constrained('procesos_transferencia')->cascadeOnDelete();
            $table->foreignId('dependencia_id')->nullable()->constrained('dependencias')->nullOnDelete();
            $table->foreignId('servidor_id')->nullable()->constrained('servidores')->nullOnDelete()
                ->comment('Servidor responsable del bien según el SIGA');

            $table->string('codigo_patrimonial')->comment('Código patrimonial oficial (SIGA)');
            $table->string('denominacion');
            $table->text('descripcion')->nullable();
            $table->string('marca')->nullable();
            $table->string('modelo')->nullable();
            $table->string('serie')->nullable();
            $table->string('estado_siga')->nullable()->comment('Estado de conservación según el SIGA');
            $table->decimal('valor', 14, 2)->nullable();

            // Siempre proviene del SIGA (o importación Excel equivalente).
            $table->string('fuente')->default('siga');
            $table->string('fuente_referencia')->nullable();
            $table->timestamp('extraido_en')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->unique(['proceso_transferencia_id', 'codigo_patrimonial']);
            $table->index('servidor_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bienes_patrimoniales');
    }
};
