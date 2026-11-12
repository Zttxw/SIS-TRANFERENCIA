<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Borrador oficial sobrescribible de un documento (02-07). No es una versión
     * firmada: hay como mucho una fila por (proceso, dependencia, tipo_documento)
     * y se regenera cada vez. Las versiones (v1, v2...) viven en DocumentoFirma y
     * solo nacen al firmar.
     */
    public function up(): void
    {
        Schema::create('firma_borradores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proceso_transferencia_id')->constrained('procesos_transferencia')->cascadeOnDelete();
            $table->foreignId('dependencia_id')->constrained('dependencias')->cascadeOnDelete();
            $table->string('tipo_documento', 20);
            $table->string('pdf_path');
            $table->string('pdf_sha256', 64);
            $table->foreignId('generado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('generado_en');
            $table->timestamps();
            $table->unique(['proceso_transferencia_id', 'dependencia_id', 'tipo_documento'], 'firma_borrador_unico');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('firma_borradores');
    }
};
