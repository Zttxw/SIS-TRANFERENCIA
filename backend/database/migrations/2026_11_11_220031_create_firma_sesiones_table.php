<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('firma_sesiones', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('proceso_transferencia_id')->constrained('procesos_transferencia')->restrictOnDelete();
            $table->foreignId('dependencia_id')->constrained('dependencias')->restrictOnDelete();
            $table->foreignId('usuario_id')->constrained('users')->restrictOnDelete();
            $table->string('firmante_dni', 8);
            $table->uuid('documento_previo_id')->nullable();
            $table->string('tipo_documento', 20);
            $table->string('estado', 20)->default('pendiente');
            $table->string('param_token_hash', 64)->unique();
            $table->string('document_token_hash', 64)->nullable()->unique();
            $table->string('upload_token_hash', 64)->nullable()->unique();
            $table->string('pdf_path');
            $table->string('original_sha256', 64);
            $table->string('firmado_path')->nullable();
            $table->string('firmado_sha256', 64)->nullable();
            $table->json('detalles')->nullable();
            $table->string('mensaje')->nullable();
            $table->timestamp('expires_at');
            $table->timestamp('firmado_en')->nullable();
            $table->timestamps();
            $table->index(['proceso_transferencia_id', 'dependencia_id', 'tipo_documento', 'estado'], 'firma_documento_estado');
        });

        Schema::table('firma_sesiones', function (Blueprint $table) {
            $table->foreign('documento_previo_id')->references('id')->on('firma_sesiones')->restrictOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('firma_sesiones');
    }
};
