<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Directiva 2026 (D-09): la sección IV del Anexo 02 incluye los documentos
 * pendientes del CC (del SGD y los registrados a mano). Mientras la entrega está
 * en borrador se leen en vivo; al presentarla al coordinador se congela aquí una
 * copia fija, para que el PDF no cambie durante la revisión y la firma.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('informes_gestion', function (Blueprint $table) {
            $table->json('pendientes_documentales')->nullable();
            $table->timestamp('pendientes_congelados_en')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('informes_gestion', function (Blueprint $table) {
            $table->dropColumn(['pendientes_documentales', 'pendientes_congelados_en']);
        });
    }
};
