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
        Schema::table('firma_borradores', function (Blueprint $table) {
            $table->string('contenido_sha256', 64)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('firma_borradores', function (Blueprint $table) {
            $table->dropColumn('contenido_sha256');
        });
    }
};
