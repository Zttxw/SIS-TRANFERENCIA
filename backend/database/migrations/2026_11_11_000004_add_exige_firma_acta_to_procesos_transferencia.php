<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * B3b (D-02): bandera por proceso que activa el GATE de remisión. Cuando está
     * encendida, remitir una entrega exige que el acta (Anexo 07) tenga su firma
     * OBLIGATORIA del responsable del centro de costo.
     *
     * Por defecto APAGADA (false): el flujo actual no se rompe mientras no haya
     * proveedor real de firma (Firma Perú). Se enciende por proceso cuando la
     * integración de firma esté disponible. No impone orden de firmas (un solo
     * firmante obligatorio por ahora).
     */
    public function up(): void
    {
        Schema::table('procesos_transferencia', function (Blueprint $table) {
            $table->boolean('exige_firma_acta')
                ->default(false)
                ->after('estado')
                ->comment('Gate B3b: exige firma obligatoria del acta para remitir');
        });
    }

    public function down(): void
    {
        Schema::table('procesos_transferencia', function (Blueprint $table) {
            $table->dropColumn('exige_firma_acta');
        });
    }
};
