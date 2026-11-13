<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('acervo_documental', function (Blueprint $table) {
            $table->string('identificacion_archivador')->nullable();
            $table->unsignedInteger('total_folios')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('acervo_documental', function (Blueprint $table) {
            $table->dropColumn(['identificacion_archivador', 'total_folios']);
        });
    }
};
