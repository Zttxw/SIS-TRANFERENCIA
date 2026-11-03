<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Informe de gestión por centro de costo (Anexo 02, plan §7.2).
     */
    public function up(): void
    {
        Schema::create('informes_gestion', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proceso_transferencia_id')->constrained('procesos_transferencia')->cascadeOnDelete();
            $table->foreignId('dependencia_id')->constrained('dependencias')->cascadeOnDelete();
            $table->foreignId('servidor_responsable_id')->nullable()->constrained('servidores')->nullOnDelete();
            $table->foreignId('elaborado_por_id')->nullable()->constrained('users')->nullOnDelete();

            $table->text('principales_funciones')->nullable();
            $table->text('logros')->nullable();
            $table->text('dificultades')->nullable();
            $table->text('asuntos_pendientes')->nullable();
            $table->string('estado')->default('borrador')->comment('borrador, remitido, consolidado');

            $table->timestamps();
            $table->softDeletes();

            $table->unique(['proceso_transferencia_id', 'dependencia_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('informes_gestion');
    }
};
