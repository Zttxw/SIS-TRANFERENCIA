<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Directiva 2026 (D-08, D-12, fase 6): cadena ETTS → ETTE de las entregas que
 * llegan al ETTS y advertencia de hijos pendientes al remitir.
 *
 * - `envios_ette`: cada envío del ETTS al ETTE es un lote numerado por proceso,
 *   con su constancia de entrega (RF-75).
 * - `entregas`: quién y cuándo registró cada paso (recepción ETTS, envío al
 *   ETTE, recepción ETTE), el lote al que pertenece y los CC hijos que aún no
 *   habían enviado cuando el padre remitió.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('envios_ette', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proceso_transferencia_id')->constrained('procesos_transferencia')->cascadeOnDelete();
            $table->unsignedInteger('numero');
            $table->foreignId('enviado_por_id')->constrained('users')->restrictOnDelete();
            $table->timestamp('enviado_en');
            $table->text('comentario')->nullable();
            $table->timestamps();

            $table->unique(['proceso_transferencia_id', 'numero'], 'envio_ette_numero_unico');
        });

        Schema::table('entregas', function (Blueprint $table) {
            $table->json('hijos_pendientes_al_remitir')->nullable();
            $table->timestamp('recibida_etts_en')->nullable();
            $table->foreignId('recibida_etts_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('envio_ette_id')->nullable()->constrained('envios_ette')->nullOnDelete();
            $table->timestamp('remitida_ette_en')->nullable();
            $table->foreignId('remitida_ette_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('recibida_ette_en')->nullable();
            $table->foreignId('recibida_ette_por_id')->nullable()->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('entregas', function (Blueprint $table) {
            $table->dropConstrainedForeignId('recibida_etts_por_id');
            $table->dropConstrainedForeignId('envio_ette_id');
            $table->dropConstrainedForeignId('remitida_ette_por_id');
            $table->dropConstrainedForeignId('recibida_ette_por_id');
            $table->dropColumn(['hijos_pendientes_al_remitir', 'recibida_etts_en', 'remitida_ette_en', 'recibida_ette_en']);
        });
        Schema::dropIfExists('envios_ette');
    }
};
