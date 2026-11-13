<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Origen de la sesión de firma (GAP 1 del portal del delegado). Distingue la
     * firma digital vía applet Firma Perú ('firmaperu', por defecto) de la firma
     * manuscrita del delegado subida como constancia ('manual'). La manuscrita no
     * pasa por verificación criptográfica y queda como recepción opcional.
     *
     * La firma manual no emite token de applet, de modo que `param_token_hash`
     * pasa a ser nullable (su índice único ya admite múltiples NULL).
     */
    public function up(): void
    {
        Schema::table('firma_sesiones', function (Blueprint $table) {
            $table->string('origen', 20)->default('firmaperu')->after('caracter')
                ->comment("firmaperu (applet) o manual (firma manuscrita del delegado)");
            $table->string('param_token_hash', 64)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('firma_sesiones', function (Blueprint $table) {
            $table->dropColumn('origen');
            $table->string('param_token_hash', 64)->nullable(false)->change();
        });
    }
};
