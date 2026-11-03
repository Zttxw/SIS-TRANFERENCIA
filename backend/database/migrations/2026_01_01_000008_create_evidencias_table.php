<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Evidencias documentales adjuntas (polimórficas) a cualquier registro
     * del sistema. Almacenamiento seguro (plan §9). No guarda el binario, solo
     * la referencia al disco y metadatos.
     */
    public function up(): void
    {
        Schema::create('evidencias', function (Blueprint $table) {
            $table->id();
            $table->morphs('evidenciable');
            $table->foreignId('subido_por_id')->nullable()->constrained('users')->nullOnDelete();

            $table->string('nombre_original');
            $table->string('disco')->default('local');
            $table->string('ruta');
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('tamano_bytes')->nullable();
            $table->string('hash', 64)->nullable()->comment('SHA-256 para verificación de integridad');
            $table->text('descripcion')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('evidencias');
    }
};
