<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * B2 (D-12): constancia de ausencia de firma ETTE + copia digital. La
     * ausencia se registra reutilizando `firmas_anexo` con estado `ausente`; la
     * `nota` ya existente guarda la constancia. Aquí se agrega la marca de
     * entrega de la copia digital de forma trazable, SIN presumir acuse:
     *
     * - `copia_entregada_en`: cuándo se puso a disposición la copia.
     * - `copia_registrada_por_id`: quién registró la entrega (responsable del
     *   centro de costo). No implica acuse de recepción del ETTE: solo deja
     *   constancia del acto del sistema (doc 05 §4).
     */
    public function up(): void
    {
        Schema::table('firmas_anexo', function (Blueprint $table) {
            $table->timestamp('copia_entregada_en')
                ->nullable()
                ->after('nota')
                ->comment('Copia digital puesta a disposición del ETTE (sin acuse)');
            $table->foreignId('copia_registrada_por_id')
                ->nullable()
                ->after('copia_entregada_en')
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('firmas_anexo', function (Blueprint $table) {
            $table->dropConstrainedForeignId('copia_registrada_por_id');
            $table->dropColumn('copia_entregada_en');
        });
    }
};
