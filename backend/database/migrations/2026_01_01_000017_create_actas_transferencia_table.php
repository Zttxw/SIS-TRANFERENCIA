<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Acta de transferencia (Anexo 07, plan §7.10). Generada por dependencia;
     * registra intervinientes, anexos entregados y el documento suscrito.
     */
    public function up(): void
    {
        Schema::create('actas_transferencia', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proceso_transferencia_id')->constrained('procesos_transferencia')->cascadeOnDelete();
            $table->foreignId('dependencia_id')->constrained('dependencias')->cascadeOnDelete();
            $table->foreignId('expediente_id')->nullable()->constrained('expedientes')->nullOnDelete();

            $table->string('numero_acta')->nullable();
            $table->date('fecha_acta')->nullable();
            $table->jsonb('intervinientes')->nullable()->comment('Responsables e intervinientes (nombre, cargo, rol)');
            $table->jsonb('anexos_entregados')->nullable()->comment('Relación de anexos incluidos');
            $table->text('observaciones')->nullable();

            $table->string('estado')->default('borrador')->comment('borrador, generada, suscrita');
            $table->string('ruta_pdf')->nullable()->comment('Acta generada en PDF');
            $table->string('ruta_pdf_suscrito')->nullable()->comment('Documento suscrito cargado');
            $table->foreignId('generada_por_id')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('actas_transferencia');
    }
};
