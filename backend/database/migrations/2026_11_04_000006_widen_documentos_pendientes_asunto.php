<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * El asunto del SGD (TDTV_REMITOS.DE_ASU) es varchar(1000) y supera el
     * varchar(255) por defecto. Se amplía a text para no truncar los asuntos
     * reales durante la ingesta documental (§7.7). Requiere doctrine/dbal en
     * algunos drivers; en PostgreSQL el cambio de tipo es nativo.
     */
    public function up(): void
    {
        Schema::table('documentos_pendientes', function (Blueprint $table) {
            $table->text('asunto')->change();
        });
    }

    public function down(): void
    {
        Schema::table('documentos_pendientes', function (Blueprint $table) {
            $table->string('asunto')->change();
        });
    }
};
