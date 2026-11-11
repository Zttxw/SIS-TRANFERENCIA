<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * B3 (D-05/D-06): el acta (Anexo 07) se emite ANTES de remitir. En ese
     * momento solo puede declarar la *suscripción de la hija* (la recepción y la
     * consolidación aún no ocurren). Se agrega:
     *
     * - `declara`: qué afirma el acta según su momento de emisión
     *   (DeclaracionActa). Por defecto `suscripcion_hija`.
     * - `version`: versión del acta dentro del flujo. Al corregir una entrega
     *   observada y re-remitir, el acta sube de versión y sus firmas obligatorias
     *   previas se invalidan (re-firma). Alinea con `firmas_anexo.version`.
     */
    public function up(): void
    {
        Schema::table('actas_transferencia', function (Blueprint $table) {
            $table->string('declara')
                ->default('suscripcion_hija')
                ->after('estado')
                ->comment('suscripcion_hija, recepcion_consolidacion (DeclaracionActa)');
            $table->unsignedInteger('version')
                ->default(1)
                ->after('declara')
                ->comment('Versión del acta; sube al re-remitir una entrega corregida');
        });
    }

    public function down(): void
    {
        Schema::table('actas_transferencia', function (Blueprint $table) {
            $table->dropColumn(['declara', 'version']);
        });
    }
};
