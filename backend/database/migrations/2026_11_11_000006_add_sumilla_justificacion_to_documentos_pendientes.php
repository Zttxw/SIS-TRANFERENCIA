<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * E1 (RF-001, D-04): el documento pendiente separa `asunto` (que se conserva)
     * de la `sumilla` (resumen breve del contenido) y de la
     * `justificacion_pendiente` (por qué el documento está pendiente). No se
     * renombra ni migra `asunto`: los registros SGD existentes no cambian.
     *
     * La justificación es obligatoria solo en complementos (fuente != sgd); una
     * fecha posterior al corte no implica por sí sola que el documento esté
     * pendiente (se valida en el FormRequest, no en la base).
     */
    public function up(): void
    {
        Schema::table('documentos_pendientes', function (Blueprint $table) {
            $table->text('sumilla')->nullable()->after('asunto')
                ->comment('Resumen breve del contenido, distinto del asunto');
            $table->text('justificacion_pendiente')->nullable()->after('sumilla')
                ->comment('Por qué el documento está pendiente (obligatoria en complementos)');
        });
    }

    public function down(): void
    {
        Schema::table('documentos_pendientes', function (Blueprint $table) {
            $table->dropColumn(['sumilla', 'justificacion_pendiente']);
        });
    }
};
