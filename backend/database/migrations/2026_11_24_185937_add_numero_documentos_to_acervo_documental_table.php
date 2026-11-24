<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * La sección A del Anexo 03 (series del SGD) mide su volumen en número de
 * documentos, no en folios: el SGD no registra folios confiables (87 % en
 * cero). La sección B (física) sigue midiéndose en folios.
 *
 * Las series del SGD existentes se recalculan con `sgd:ingestar --documental`;
 * mientras tanto se les quita la suma de folios.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('acervo_documental', function (Blueprint $table) {
            $table->unsignedInteger('numero_documentos')->nullable()->after('folios');
        });

        DB::table('acervo_documental')->where('fuente', 'sgd')->update(['folios' => null]);
    }

    public function down(): void
    {
        Schema::table('acervo_documental', function (Blueprint $table) {
            $table->dropColumn('numero_documentos');
        });
    }
};
