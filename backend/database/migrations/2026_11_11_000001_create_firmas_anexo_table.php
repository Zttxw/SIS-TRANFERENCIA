<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Firmas digitales sobre los anexos 02–07 (RF-004/005, B1 del plan de
     * desarrollo). Polimórfica: una firma apunta a cualquier documento de anexo
     * (informe de gestión, acta, etc.), igual que la tabla `evidencias`.
     *
     * Cada fila es un hecho de firma a nombre de quien efectivamente usa su
     * certificado. Varias firmas pueden coexistir sobre el mismo documento y
     * versión sin perder las previas (RF-005). No integra todavía el proveedor
     * Firma Perú/RENIEC ni fija la matriz de firmantes (D-02, pendiente).
     */
    public function up(): void
    {
        Schema::create('firmas_anexo', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proceso_transferencia_id')->constrained('procesos_transferencia')->cascadeOnDelete();
            $table->foreignId('dependencia_id')->constrained('dependencias')->cascadeOnDelete();

            // Documento firmado (polimórfico) y su versión dentro del flujo.
            $table->morphs('firmable');
            $table->unsignedInteger('version')->default(1)->comment('Versión del documento firmada');

            // Firmante efectivo: cuenta que usa su certificado + datos impresos.
            $table->foreignId('firmante_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('firmante_nombre')->nullable()->comment('Nombre impreso del firmante');
            $table->string('firmante_cargo')->nullable();

            // Clasificación confirmada (C-02/C-08): carácter y estado.
            $table->string('caracter')->comment('obligatoria, opcional (CaracterFirma)');
            $table->string('estado')->default('pendiente')->comment('pendiente, firmada, cancelada, ausente (EstadoFirma)');

            // Resultado de la suscripción.
            $table->timestamp('firmada_en')->nullable();
            $table->string('hash_pdf', 64)->nullable()->comment('SHA-256 del PDF firmado');
            $table->jsonb('resultado_verificacion')->nullable()->comment('Resultado de la comprobación de firmas');
            $table->text('nota')->nullable()->comment('Constancia (p. ej. ausencia de firma ETTE y copia digital)');

            $table->timestamps();
            $table->softDeletes();

            $table->index(['firmable_type', 'firmable_id', 'version']);
            $table->index(['proceso_transferencia_id', 'dependencia_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('firmas_anexo');
    }
};
