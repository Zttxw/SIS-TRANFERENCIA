<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Entrega: unidad de remisión y consolidación jerárquica (plan §6, §7.8).
     * Registra emisor, receptor, estado y marcas de tiempo (RN-08, RN-09).
     */
    public function up(): void
    {
        Schema::create('entregas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proceso_transferencia_id')->constrained('procesos_transferencia')->cascadeOnDelete();
            $table->foreignId('dependencia_id')->constrained('dependencias')->cascadeOnDelete()
                ->comment('Dependencia cuya información se entrega');
            $table->foreignId('dependencia_destino_id')->nullable()->constrained('dependencias')->nullOnDelete()
                ->comment('Dependencia superior que recibe/consolida');

            $table->foreignId('emisor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('receptor_id')->nullable()->constrained('users')->nullOnDelete();

            $table->string('estado')->default('borrador')->comment('Enum App\\Support\\Enums\\EstadoEntrega');

            $table->timestamp('remitida_en')->nullable();
            $table->timestamp('revisada_en')->nullable();
            $table->timestamp('consolidada_en')->nullable();
            $table->text('comentario')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['dependencia_id', 'estado']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('entregas');
    }
};
