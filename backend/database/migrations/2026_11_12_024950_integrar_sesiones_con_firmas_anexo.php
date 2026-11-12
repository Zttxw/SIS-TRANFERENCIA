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
        Schema::create('documentos_firma', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proceso_transferencia_id')->constrained('procesos_transferencia')->restrictOnDelete();
            $table->foreignId('dependencia_id')->constrained('dependencias')->restrictOnDelete();
            $table->string('tipo_documento', 20);
            $table->unsignedInteger('version');
            $table->char('contenido_sha256', 64);
            $table->foreignId('acta_id')->nullable()->constrained('actas_transferencia')->restrictOnDelete();
            $table->timestamps();
            $table->unique(['proceso_transferencia_id', 'dependencia_id', 'tipo_documento', 'version'], 'documento_firma_version');
        });
        Schema::table('firma_sesiones', function (Blueprint $table) {
            $table->foreignId('documento_firma_id')->nullable()->constrained('documentos_firma')->restrictOnDelete();
            $table->string('caracter', 20)->nullable();
        });
        Schema::table('firmas_anexo', function (Blueprint $table) {
            $table->uuid('firma_sesion_id')->nullable()->unique();
            $table->foreign('firma_sesion_id')->references('id')->on('firma_sesiones')->restrictOnDelete();
        });
        Schema::table('entregas', function (Blueprint $table) {
            $table->unsignedInteger('version_acta_correccion')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('entregas', fn (Blueprint $table) => $table->dropColumn('version_acta_correccion'));
        Schema::table('firmas_anexo', function (Blueprint $table) {
            $table->dropForeign(['firma_sesion_id']);
            $table->dropUnique(['firma_sesion_id']);
            $table->dropColumn('firma_sesion_id');
        });
        Schema::table('firma_sesiones', function (Blueprint $table) {
            $table->dropConstrainedForeignId('documento_firma_id');
            $table->dropColumn('caracter');
        });
        Schema::dropIfExists('documentos_firma');
    }
};
